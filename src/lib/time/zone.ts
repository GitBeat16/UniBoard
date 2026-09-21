/**
 * Wall-clock time ↔ instants, in a named IANA zone. Pure; uses only Intl.
 *
 * Why this exists: the server runs in UTC. "Monday 09:00", a datetime-local
 * field, or a calendar feed's zone-less DTSTART all describe a *wall-clock*
 * time where the student is. Building them with `setHours()` on the server
 * silently made every such time 5½ hours late for a student in Pune.
 *
 * Forms send the browser's zone (see <TimeZoneField>); the server converts.
 */

/** Used only when a request carries no usable zone (JavaScript off, etc.). */
export const FALLBACK_TIME_ZONE = "Asia/Kolkata";

export type WallDate = { year: number; month: number; day: number }; // month 1–12
export type WallTime = WallDate & { hour: number; minute: number };

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone from a form, or the fallback. Never throws. */
export function zoneOrFallback(tz: unknown): string {
  return isValidTimeZone(tz) ? tz : FALLBACK_TIME_ZONE;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string) {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    });
    partsCache.set(tz, f);
  }
  return f;
}

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** What a wall clock in `tz` shows at `instant`. weekday: 0 = Sunday. */
export function zonedParts(instant: Date, tz: string): WallTime & { second: number; weekday: number } {
  const out: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(instant)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAY[out.weekday] ?? 0,
  };
}

/** Offset of `tz` from UTC at `instant`, in minutes (Asia/Kolkata → +330). */
export function offsetMinutes(instant: Date, tz: string): number {
  const p = zonedParts(instant, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/**
 * The instant a wall clock in `tz` shows `t`. Two passes settle DST edges:
 * a time skipped by spring-forward lands just after the gap; an ambiguous
 * autumn time takes the first (earlier) occurrence.
 */
export function wallTimeToInstant(t: WallTime, tz: string): Date {
  const naive = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute);
  let guess = naive - offsetMinutes(new Date(naive), tz) * 60_000;
  guess = naive - offsetMinutes(new Date(guess), tz) * 60_000;
  return new Date(guess);
}

/** Calendar arithmetic on a wall date, free of any zone. */
export function addDays(d: WallDate, n: number): WallDate {
  const x = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate() };
}

/** 0 = Sunday, for a wall date. */
export function weekdayOf(d: WallDate): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
}

/** Today's date on the wall in `tz`. */
export function wallToday(now: Date, tz: string): WallDate {
  const p = zonedParts(now, tz);
  return { year: p.year, month: p.month, day: p.day };
}

/** "2026-09-25T14:00" (a datetime-local value) as an instant in `tz`. */
export function parseLocalDateTime(value: string, tz: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return wallTimeToInstant({ year, month, day, hour, minute }, tz);
}

/** "09:30" → [9, 30], or null. */
export function parseClock(value: string): [number, number] | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? [h, min] : null;
}
