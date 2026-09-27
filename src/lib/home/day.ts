import type { Enums } from "@/lib/supabase/database.types";

/**
 * Home's picture of the day and the week.
 *
 * Pure, and in the viewer's own clock: every function takes Dates and reads
 * them with local getters, and Home only calls them after mount, so "today"
 * and "this week" are the student's — never the server's, which runs in UTC.
 */

export type DaySession = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: Enums<"attendance_status"> | null;
};

/** Where a class stands, as the timeline draws it. */
export type ClassState = "attended" | "missed" | "excused" | "unmarked" | "now" | "later";

export function stateOf(s: DaySession, now: Date): ClassState {
  if (s.startsAt > now) return "later";
  if (s.status === "present" || s.status === "late") return "attended";
  if (s.status === "absent") return "missed";
  if (s.status === "excused") return "excused";
  // Started, not marked: on now if it has not finished, otherwise waiting on her.
  return s.endsAt > now ? "now" : "unmarked";
}

/** yyyy-mm-dd on the viewer's calendar. */
export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// ------------------------------------------------------------------- today

export type TimelineItem<S extends DaySession> =
  | { kind: "class"; session: S; state: ClassState }
  | { kind: "gap"; from: Date; to: Date; label: "Lunch" | "Break" | "Free" };

/** Breaks shorter than this are just walking between rooms, not worth a gap. */
const MIN_GAP_MIN = 15;

/**
 * Today's classes in order, with the gaps between them named.
 *
 * A gap that covers midday and runs half an hour or more is lunch; one of
 * two hours or more is free time worth using; anything else is a break.
 */
export function todayTimeline<S extends DaySession>(sessions: S[], now: Date): TimelineItem<S>[] {
  const today = localDayKey(now);
  const mine = sessions
    .filter((s) => localDayKey(s.startsAt) === today)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const out: TimelineItem<S>[] = [];
  let lastEnd: Date | null = null;

  for (const s of mine) {
    if (lastEnd && s.startsAt.getTime() - lastEnd.getTime() >= MIN_GAP_MIN * 60_000) {
      out.push({ kind: "gap", from: lastEnd, to: s.startsAt, label: gapLabel(lastEnd, s.startsAt) });
    }
    out.push({ kind: "class", session: s, state: stateOf(s, now) });
    if (!lastEnd || s.endsAt > lastEnd) lastEnd = s.endsAt;
  }

  return out;
}

function gapLabel(from: Date, to: Date): "Lunch" | "Break" | "Free" {
  const minutes = (to.getTime() - from.getTime()) / 60_000;
  const noon = new Date(from);
  noon.setHours(12, 30, 0, 0);
  if (minutes >= 30 && from <= noon && to >= noon && minutes < 120) return "Lunch";
  if (minutes >= 120) return "Free";
  return "Break";
}

/**
 * Where "now" falls across the day's classes, 0 to 1, or null when the day
 * has not started or is over — a now-line pinned to either end says nothing.
 */
export function nowPosition(sessions: DaySession[], now: Date): number | null {
  const today = localDayKey(now);
  const mine = sessions.filter((s) => localDayKey(s.startsAt) === today);
  if (mine.length === 0) return null;
  const start = Math.min(...mine.map((s) => s.startsAt.getTime()));
  const end = Math.max(...mine.map((s) => s.endsAt.getTime()));
  const t = now.getTime();
  if (t < start || t > end) return null;
  return (t - start) / (end - start);
}

// -------------------------------------------------------------------- week

export type WeekDay = {
  key: string;
  date: Date;
  /** "M", "T"… */
  letter: string;
  count: number;
  /** Every class that day has happened and been marked. */
  complete: boolean;
  isToday: boolean;
};

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** Monday to Sunday of the week `now` is in — universities do not run Sunday-first. */
export function weekStrip(sessions: DaySession[], now: Date): WeekDay[] {
  const today = startOfDay(now);
  const monday = addDays(today, -((today.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const key = localDayKey(date);
    const day = sessions.filter((s) => localDayKey(s.startsAt) === key);
    const complete =
      day.length > 0 && day.every((s) => s.endsAt <= now && isMarked(s));
    return {
      key,
      date,
      letter: LETTERS[date.getDay()],
      count: day.length,
      complete,
      isToday: key === localDayKey(now),
    };
  });
}

function isMarked(s: DaySession) {
  return s.status !== null && s.status !== "unknown";
}

// ------------------------------------------------------------------ streak

/**
 * Days in a row with every class marked, counting back from today.
 *
 * Days without classes neither count nor break it — a weekend is not a lapse.
 * Today only counts once everything that has started today is marked; until
 * then it is simply not in yet, so a morning with a class still to mark never
 * shows a broken streak. `lookback` caps how far back it looks.
 */
export function markStreak(sessions: DaySession[], now: Date, lookback = 30): number {
  const byDay = new Map<string, DaySession[]>();
  for (const s of sessions) {
    const key = localDayKey(s.startsAt);
    const list = byDay.get(key);
    if (list) list.push(s);
    else byDay.set(key, [s]);
  }

  let streak = 0;
  const today = startOfDay(now);

  for (let i = 0; i <= lookback; i++) {
    const day = byDay.get(localDayKey(addDays(today, -i)));
    if (!day) continue;

    const started = day.filter((s) => s.startsAt <= now);
    if (started.length === 0) continue; // today, nothing begun yet

    const allMarked = started.every(isMarked);
    if (i === 0) {
      // Today: in once it is all marked, otherwise neither in nor out.
      if (allMarked) streak++;
      continue;
    }
    if (!allMarked) break;
    streak++;
  }

  return streak;
}

// --------------------------------------------------------------------- sky

export type SkyPhase = "dawn" | "day" | "dusk" | "night";

export function skyPhase(hour: number): SkyPhase {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

/**
 * How far across the sky the sun (or moon) is, 0 to 1, for placing it on its
 * arc. The sun crosses 6:00→19:00; the moon 19:00→6:00.
 */
export function skyArc(hour: number, minute = 0): number {
  const t = hour + minute / 60;
  if (t >= 6 && t < 19) return (t - 6) / 13;
  const night = t >= 19 ? t - 19 : t + 5;
  return night / 11;
}
