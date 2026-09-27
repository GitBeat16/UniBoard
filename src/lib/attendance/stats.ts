import type { Enums } from "@/lib/supabase/database.types";

export type AttendanceStatus = Enums<"attendance_status">;

export type StatsInput = {
  moduleId: string;
  name: string;
  code: string | null;
  colorToken: string;
  threshold: number; // percent, e.g. 75
  sessions: Array<{ startsAt: Date; status: AttendanceStatus | null }>;
  /**
   * What the college itself counted, and the day it counted it.
   *
   * The app only knows about classes since the timetable was imported; the
   * college has been counting since the term began, and its figure is the one
   * that decides whether she sits the exam. When it is here, it is the
   * starting point and only classes after that day are added to it.
   */
  official?: { attended: number; held: number; asOf: Date } | null;
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
  /** The day the college's own count was taken, when one has been imported. */
  officialAsOf: Date | null;
};

/** What a module's classes add up to, before any judgement is made of them. */
export type AttendanceCounts = {
  attended: number;
  missed: number;
  /** Past classes with no mark, after any college cut-off. */
  unmarked: number;
  /** Classes still to come. */
  remaining: number;
};

/**
 * Pure. No clock of its own — `now` is passed in, which is what makes the
 * boundary cases ("a class that started ten minutes ago") testable.
 *
 * Excused absences are excluded from both numerator and denominator, which is
 * how universities normally treat them.
 */
export function moduleAttendance(input: StatsInput, now: Date): ModuleAttendance {
  return attendanceFromCounts(input, countSessions(input, now));
}

/**
 * Add up a module's classes.
 *
 * This is the half the database can also do — `attendance_summary()` returns
 * the same four numbers — so a screen that only needs the verdict never has to
 * download the whole term to get it. The two must agree; the SQL is written
 * to mirror this line for line.
 */
export function countSessions(
  input: Pick<StatsInput, "sessions" | "official">,
  now: Date,
): AttendanceCounts {
  const official = input.official ?? null;

  // The college's figure is the opening balance; everything it already counted
  // is behind us, so only classes after that day are added to it. Counting
  // them twice would be worse than not counting them at all.
  let attended = official?.attended ?? 0;
  let missed = official ? official.held - official.attended : 0;
  let unmarked = 0;
  let remaining = 0;

  for (const s of input.sessions) {
    const isPast = s.startsAt <= now;

    if (!isPast) {
      remaining++;
      continue;
    }
    if (official && s.startsAt <= official.asOf) continue;

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

  return { attended, missed, unmarked, remaining };
}

/** Judge a module from its counts: the percentage, the room left, the status. */
export function attendanceFromCounts(
  input: Pick<StatsInput, "moduleId" | "name" | "code" | "colorToken" | "threshold" | "official">,
  { attended, missed, unmarked, remaining }: AttendanceCounts,
): ModuleAttendance {
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
    officialAsOf: input.official?.asOf ?? null,
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

/**
 * The college's figure off a module row, if one has been imported.
 *
 * A date column comes back as "2026-09-20" with no time, and a class marked on
 * that same day was part of what the college counted — so the cut-off is the
 * end of that day, not its start. It is pinned to UTC so it means the same
 * thing here and in `attendance_summary()`, whatever zone the server runs in.
 */
export function officialOf(module: {
  official_attended: number | null;
  official_held: number | null;
  official_as_of: string | null;
}) {
  if (
    module.official_attended === null ||
    module.official_held === null ||
    module.official_as_of === null
  ) {
    return null;
  }
  return {
    attended: module.official_attended,
    held: module.official_held,
    asOf: new Date(`${module.official_as_of}T23:59:59Z`),
  };
}
