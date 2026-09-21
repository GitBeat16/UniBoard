import type { Enums } from "@/lib/supabase/database.types";
import type { Tone } from "@/lib/tones";

/**
 * Urgency ranking for everything with a date on it.
 *
 * Pure, and `now` is a parameter — the interesting cases are all boundaries
 * ("due at 23:59 tonight", "due first thing tomorrow") and those are only
 * testable if the clock is injected.
 */

export type WorkKind = "assignment" | "exam";

export type WorkItem = {
  id: string;
  kind: WorkKind;
  title: string;
  at: string; // ISO
  moduleId: string | null;
  moduleName: string | null;
  tone: Tone;
  status: Enums<"assignment_status"> | null;
  weight: number | null;
  estimatedHours: number | null;
};

export type Urgency = "done" | "overdue" | "today" | "soon" | "this_week" | "later";

export const URGENCY_COPY: Record<Urgency, { label: string; chip: string }> = {
  overdue: { label: "Overdue", chip: "bg-coral text-paper" },
  today: { label: "Today", chip: "bg-coral-soft text-coral" },
  soon: { label: "Within 3 days", chip: "bg-sun-soft text-sun" },
  this_week: { label: "This week", chip: "bg-sky-soft text-sky" },
  later: { label: "Later", chip: "bg-canvas text-muted" },
  done: { label: "Done", chip: "bg-leaf-soft text-leaf" },
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function urgencyOf(item: WorkItem, now: Date): Urgency {
  // An exam is never "done" — it is either ahead of you or behind you.
  if (item.kind === "assignment" && (item.status === "submitted" || item.status === "graded")) {
    return "done";
  }

  const at = new Date(item.at);
  if (at.getTime() < now.getTime()) return "overdue";

  if (sameDay(at, now)) return "today";

  const hours = (at.getTime() - now.getTime()) / HOUR;
  if (hours <= 72) return "soon";
  if (hours <= 7 * 24) return "this_week";
  return "later";
}

/** Live work first, ordered by date; finished and past items sink. */
export function sortByUrgency<T extends WorkItem>(items: T[], now: Date): T[] {
  const rank: Record<Urgency, number> = {
    overdue: 0,
    today: 1,
    soon: 2,
    this_week: 3,
    later: 4,
    done: 5,
  };

  return [...items].sort((a, b) => {
    const byRank = rank[urgencyOf(a, now)] - rank[urgencyOf(b, now)];
    if (byRank !== 0) return byRank;
    return new Date(a.at).getTime() - new Date(b.at).getTime();
  });
}

/** Total hours of unfinished work due inside the window. Feeds Reclaim in P4. */
export function outstandingHours(items: WorkItem[], now: Date, withinDays = 7): number {
  const cutoff = now.getTime() + withinDays * DAY;

  return items.reduce((total, item) => {
    const urgency = urgencyOf(item, now);
    if (urgency === "done") return total;
    if (new Date(item.at).getTime() > cutoff) return total;
    return total + (item.estimatedHours ?? 0);
  }, 0);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
