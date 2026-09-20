import type { Enums } from "@/lib/supabase/database.types";

export type AttendanceStatus = Enums<"attendance_status">;

export type StatsInput = {
  moduleId: string;
  name: string;
  code: string | null;
  colorToken: string;
  threshold: number; // percent, e.g. 75
  sessions: Array<{ startsAt: Date; status: AttendanceStatus | null }>;
};

export type ModuleAttendance = {
  moduleId: string;
  name: string;
  code: string | null;
  colorToken: string;
  threshold: number;
  attended: number;
  missed: number;
  /** Sessions that have happened AND been marked. The denominator. */
  held: number;
  /** Past sessions with no record yet — nudge the student, don't guess. */
  unmarked: number;
  remaining: number;
  /** attended / held, as a percent. Null until something has been marked. */
  percent: number | null;
  /** How many of the remaining sessions can still be missed. */
  canMissMore: number;
  status: "safe" | "thin" | "below" | "unknown";
};

/**
 * Pure. No clock of its own — `now` is passed in, which is what makes the
 * boundary cases ("a class that started ten minutes ago") testable.
 *
 * Excused absences are excluded from both numerator and denominator, which is
 * how universities normally treat them.
 */
export function moduleAttendance(input: StatsInput, now: Date): ModuleAttendance {
  let attended = 0;
  let missed = 0;
  let unmarked = 0;
  let remaining = 0;

  for (const s of input.sessions) {
    const isPast = s.startsAt <= now;

    if (!isPast) {
      remaining++;
      continue;
    }

    switch (s.status) {
      case "present":
      case "late":
        attended++;
        break;
      case "absent":
        missed++;
        break;
      case "excused":
        break; // out of the calculation entirely
      default:
        unmarked++;
    }
  }

  const held = attended + missed;
  const t = input.threshold / 100;

  // Best case from here: attend every remaining session. How many of those can
  // be given up and still clear the threshold?
  //   (attended + remaining - k) / (held + remaining) >= t
  const totalCountable = held + remaining;
  const canMissMore =
    totalCountable === 0
      ? 0
      : Math.max(0, Math.floor(attended + remaining - t * totalCountable));

  const percent = held === 0 ? null : (attended / held) * 100;

  let status: ModuleAttendance["status"];
  if (percent === null) status = "unknown";
  else if (percent < input.threshold) status = "below";
  else if (canMissMore <= 1) status = "thin";
  else status = "safe";

  return {
    moduleId: input.moduleId,
    name: input.name,
    code: input.code,
    colorToken: input.colorToken,
    threshold: input.threshold,
    attended,
    missed,
    held,
    unmarked,
    remaining,
    percent,
    canMissMore,
    status,
  };
}

export function overallAttendance(modules: ModuleAttendance[]) {
  const attended = modules.reduce((n, m) => n + m.attended, 0);
  const held = modules.reduce((n, m) => n + m.held, 0);
  return {
    attended,
    held,
    percent: held === 0 ? null : (attended / held) * 100,
    atRisk: modules.filter((m) => m.status === "below" || m.status === "thin").length,
  };
}
