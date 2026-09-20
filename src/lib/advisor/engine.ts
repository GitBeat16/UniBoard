import type { ModuleAttendance } from "@/lib/attendance/stats";
import type { Enums } from "@/lib/supabase/database.types";

/**
 * The Skip Advisor.
 *
 * Pure — no database, no UI, no clock of its own. Everything it knows arrives
 * in `AdvisorInput`, which is what makes the guardrails testable and the
 * weights tunable without touching a screen.
 *
 * Two design rules it must never break:
 *
 *  1. Every verdict is fully explained. A student should be able to see which
 *     inputs moved the needle and disagree with any of them.
 *  2. The guardrails are absolute. This app must not become a machine for
 *     talking people out of going to class — one bad call can cost a module,
 *     and for a student on a monitored visa it can cost far more than that.
 */

export type Verdict = Enums<"skip_verdict">;

export type SelfState = "fine" | "tired" | "ill";

export type AdvisorInput = {
  session: {
    moduleName: string;
    startsAt: Date;
    endsAt: Date;
    type: Enums<"session_type">;
    isAssessed: boolean;
    hasSubmission: boolean;
    isRecorded: boolean;
  };
  attendance: ModuleAttendance;
  /** Open work, any module. Sorted or not — the engine takes the nearest. */
  deadlines: Array<{ title: string; dueAt: Date; moduleId: string | null }>;
  exams: Array<{ title: string; startsAt: Date; moduleId: string | null }>;
  /** One-way door-to-door minutes, if the student has told us. */
  travelMinutes?: number | null;
  state?: SelfState;
  /**
   * Attendance formally monitored — visa sponsorship, a professional body, an
   * academic warning already issued. Forces GO, and says why.
   */
  attendanceMonitored?: boolean;
  now: Date;
};

export type Reason = {
  side: "go" | "skip" | "context";
  text: string;
  /** 0–1. Drives ordering, so the strongest argument is shown first. */
  weight: number;
};

export type AdvisorResult = {
  verdict: Verdict;
  /** -1 (skip freely) … +1 (definitely go). */
  score: number;
  reasons: Reason[];
  /** Set when a hard rule overrode the score. */
  guardrail: string | null;
  factors: {
    attendanceRisk: number;
    sessionImportance: number;
    deadlinePressure: number;
    travelCost: number;
    stateCost: number;
  };
};

const WEIGHTS = {
  attendanceRisk: 0.38,
  sessionImportance: 0.34,
  deadlinePressure: 0.22,
  travelCost: 0.1,
  stateCost: 0.18,
} as const;

/** How hard each kind of session is to catch up on alone. */
const TYPE_IMPORTANCE: Record<Enums<"session_type">, number> = {
  lab: 0.85,
  tutorial: 0.7,
  seminar: 0.7,
  workshop: 0.7,
  lecture: 0.4,
  other: 0.5,
};

const HOUR = 3_600_000;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function advise(input: AdvisorInput): AdvisorResult {
  const factors = {
    attendanceRisk: attendanceRisk(input.attendance),
    sessionImportance: sessionImportance(input.session),
    deadlinePressure: deadlinePressure(input),
    travelCost: travelCost(input),
    stateCost: stateCost(input.state),
  };

  const towardsGo =
    WEIGHTS.attendanceRisk * factors.attendanceRisk +
    WEIGHTS.sessionImportance * factors.sessionImportance;

  const towardsSkip =
    WEIGHTS.deadlinePressure * factors.deadlinePressure +
    WEIGHTS.travelCost * factors.travelCost +
    WEIGHTS.stateCost * factors.stateCost;

  const score = round(towardsGo - towardsSkip);
  const reasons = buildReasons(input, factors);
  const guardrail = firstGuardrail(input);

  return {
    verdict: guardrail ? "go_matters" : verdictFor(score),
    score,
    guardrail,
    reasons: reasons.sort((a, b) => b.weight - a.weight).slice(0, 3),
    factors,
  };
}

// ---------------------------------------------------------------- guardrails

/**
 * Hard rules. Any one of these forces GO regardless of the score, and the
 * returned string is shown to the student verbatim.
 */
function firstGuardrail(input: AdvisorInput): string | null {
  const { session, attendance, attendanceMonitored } = input;

  if (session.hasSubmission) {
    return "Something is due in this class. Going is the whole point.";
  }
  if (session.isAssessed) {
    return "This session is assessed — attendance here counts towards your mark.";
  }
  if (attendanceMonitored) {
    return "Your attendance is formally monitored, so a missed class carries consequences well beyond the grade.";
  }
  if (attendance.status === "below") {
    return `You are already under the ${attendance.threshold}% threshold for ${attendance.name}.`;
  }
  if (attendance.held + attendance.remaining > 0 && attendance.canMissMore === 0) {
    return `Miss this and ${attendance.name} drops below ${attendance.threshold}%.`;
  }
  return null;
}

// ------------------------------------------------------------------ factors

function attendanceRisk(a: ModuleAttendance): number {
  // Nothing marked yet: assume neither safety nor danger, but lean towards
  // going, because an unknown record is not a licence to skip.
  if (a.percent === null) return 0.45;
  if (a.canMissMore <= 0) return 1;
  // Six spare classes is comfortable; anything less scales up sharply.
  return clamp01(1 - a.canMissMore / 6);
}

function sessionImportance(s: AdvisorInput["session"]): number {
  let importance = TYPE_IMPORTANCE[s.type];
  if (s.isAssessed || s.hasSubmission) importance = 1;
  // A recorded lecture is genuinely easier to recover. A recorded lab is not,
  // so the discount applies to the type score rather than replacing it.
  if (s.isRecorded) importance *= 0.55;
  return clamp01(importance);
}

function deadlinePressure(input: AdvisorInput): number {
  const { now, deadlines, exams, attendance } = input;

  let pressure = 0;

  for (const d of deadlines) {
    const hours = (d.dueAt.getTime() - now.getTime()) / HOUR;
    if (hours < 0 || hours > 72) continue;

    let p = hours <= 12 ? 1 : hours <= 24 ? 0.8 : hours <= 48 ? 0.55 : 0.3;

    // Work due for THIS module is a reason to attend, not to hide from it —
    // the class is where the question gets answered.
    if (d.moduleId && d.moduleId === attendance.moduleId) p *= 0.35;

    pressure = Math.max(pressure, p);
  }

  for (const e of exams) {
    const days = (e.startsAt.getTime() - now.getTime()) / (24 * HOUR);
    if (days < 0 || days > 14) continue;
    // Revision is real pressure but rarely as sharp as a hard deadline.
    const p = days <= 3 ? 0.6 : days <= 7 ? 0.4 : 0.25;
    pressure = Math.max(pressure, e.moduleId === attendance.moduleId ? p * 0.35 : p);
  }

  return clamp01(pressure);
}

function travelCost(input: AdvisorInput): number {
  const minutes = input.travelMinutes;
  if (!minutes || minutes <= 0) return 0;

  const sessionMinutes =
    (input.session.endsAt.getTime() - input.session.startsAt.getTime()) / 60_000;
  if (sessionMinutes <= 0) return 0;

  // Round trip against time in the room. An hour each way for a one-hour
  // class is a 2.0 ratio, which is the point where this maxes out.
  return clamp01((minutes * 2) / sessionMinutes / 2);
}

function stateCost(state: SelfState | undefined): number {
  if (state === "ill") return 1;
  if (state === "tired") return 0.4;
  return 0;
}

// ------------------------------------------------------------------ verdict

function verdictFor(score: number): Verdict {
  if (score >= 0.42) return "go_matters";
  if (score >= 0.18) return "go_if_you_can";
  if (score >= -0.05) return "your_call";
  return "skip_fine";
}

// ------------------------------------------------------------------ reasons

function buildReasons(input: AdvisorInput, f: AdvisorResult["factors"]): Reason[] {
  const { session, attendance, now } = input;
  const reasons: Reason[] = [];

  if (session.hasSubmission) {
    reasons.push({ side: "go", text: "Something is due in this class.", weight: 1 });
  } else if (session.isAssessed) {
    reasons.push({ side: "go", text: "This session is assessed.", weight: 0.95 });
  }

  if (attendance.percent !== null) {
    if (attendance.canMissMore <= 0) {
      reasons.push({
        side: "go",
        text: `${attendance.name} has no room left — you are at ${format(attendance.percent)}%.`,
        weight: 0.92,
      });
    } else if (attendance.canMissMore <= 2) {
      reasons.push({
        side: "go",
        text: `You can only miss ${attendance.canMissMore} more ${plural(attendance.canMissMore, "class", "classes")} of ${attendance.name}.`,
        weight: 0.75,
      });
    } else {
      reasons.push({
        side: "skip",
        text: `${attendance.name} is comfortable at ${format(attendance.percent)}% — ${attendance.canMissMore} spare.`,
        weight: 0.45,
      });
    }
  } else {
    reasons.push({
      side: "context",
      text: `Nothing marked for ${attendance.name} yet, so this is a guess.`,
      weight: 0.5,
    });
  }

  if (session.isRecorded && !session.isAssessed && !session.hasSubmission) {
    reasons.push({
      side: "skip",
      text: "This one is recorded, so it can be caught up.",
      weight: 0.55,
    });
  } else if (f.sessionImportance >= 0.7) {
    reasons.push({
      side: "go",
      text: `A ${label(session.type)} is hard to reconstruct from someone else's notes.`,
      weight: 0.6,
    });
  }

  const nearest = nearestDeadline(input);
  if (nearest) {
    const hours = Math.round((nearest.dueAt.getTime() - now.getTime()) / HOUR);
    reasons.push({
      side: "skip",
      text: `“${nearest.title}” is due in ${hours < 24 ? `${hours}h` : `${Math.round(hours / 24)} days`}.`,
      weight: 0.5 + f.deadlinePressure * 0.35,
    });
  }

  if (f.travelCost >= 0.5) {
    reasons.push({
      side: "skip",
      text: "The round trip costs more than the class is long.",
      weight: 0.45,
    });
  }

  if (input.state === "ill") {
    reasons.push({
      side: "skip",
      text: "You said you are ill. Rest, and tell the module lead.",
      weight: 0.9,
    });
  } else if (input.state === "tired") {
    reasons.push({ side: "skip", text: "You said you are running on empty.", weight: 0.4 });
  }

  return reasons;
}

function nearestDeadline(input: AdvisorInput) {
  return [...input.deadlines]
    .filter((d) => d.dueAt.getTime() >= input.now.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0];
}

const format = (n: number) => (Math.round(n * 10) / 10).toString();
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const round = (n: number) => Math.round(n * 1000) / 1000;

function label(type: Enums<"session_type">) {
  return type === "other" ? "class" : type;
}

export const VERDICT_COPY: Record<Verdict, { headline: string; sub: string }> = {
  go_matters: { headline: "Go — this one matters", sub: "There is a real cost to missing it." },
  go_if_you_can: { headline: "Go if you can", sub: "Nothing forces it, but the balance says attend." },
  your_call: { headline: "Your call", sub: "Genuinely balanced. Here is both sides." },
  skip_fine: { headline: "Skipping is fine today", sub: "You have the room, and something else needs you more." },
};
