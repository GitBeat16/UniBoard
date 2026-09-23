/**
 * What the Home ticket says about time. Pure: `now` is passed in.
 */

export type ClassTiming =
  | { state: "upcoming"; minutesUntil: number }
  | { state: "live"; minutesLeft: number; progress: number }
  | { state: "ended" };

export function classTiming(startsAt: string, endsAt: string, now: Date): ClassTiming {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const t = now.getTime();
  if (t >= end) return { state: "ended" };
  if (t >= start) {
    return {
      state: "live",
      minutesLeft: Math.max(1, Math.ceil((end - t) / 60_000)),
      progress: Math.min(100, Math.max(0, ((t - start) / (end - start)) * 100)),
    };
  }
  return { state: "upcoming", minutesUntil: Math.ceil((start - t) / 60_000) };
}

/**
 * "45 min", "2 h 10 min", "5 h". Beyond twelve hours a countdown stops being
 * useful — the day and time on the ticket say it better — so it returns null.
 */
export function formatCountdown(minutes: number): string | null {
  if (minutes > 12 * 60) return null;
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** The light line of the greeting, by the student's own clock. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning,";
  if (hour >= 12 && hour < 17) return "Good afternoon,";
  if (hour >= 17 && hour < 22) return "Good evening,";
  return "Hello,";
}
