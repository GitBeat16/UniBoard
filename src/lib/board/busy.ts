import type { createClient } from "@/lib/supabase/server";
import type { BusyBlock } from "@/lib/reclaim/plan";

type Client = Awaited<ReturnType<typeof createClient>>;

const HOUR = 3_600_000;

/**
 * Events on this student's board that overlap [from, to): their own pinned
 * events, and classmates' shared ones they saved. Used by Reclaim so a freed
 * hour is never planned over something they have pinned.
 *
 * Shared by the Advisor page (preview) and the save action (the trusted
 * rebuild), so both plan around exactly the same things.
 */
export async function loadBoardBusy(
  supabase: Client,
  userId: string,
  from: Date,
  to: Date,
): Promise<BusyBlock[]> {
  // An event with no end is treated as an hour long, so look an hour back.
  const { data: events } = await supabase
    .from("board_events")
    .select("id, user_id, title, starts_at, ends_at, pinned")
    .lt("starts_at", to.toISOString())
    .gte("starts_at", new Date(from.getTime() - 2 * 24 * HOUR).toISOString());

  if (!events?.length) return [];

  const others = events.filter((e) => e.user_id !== userId).map((e) => e.id);
  const { data: marks } = others.length
    ? await supabase
        .from("board_event_marks")
        .select("event_id")
        .eq("kind", "save")
        .in("event_id", others)
    : { data: [] as Array<{ event_id: string }> };
  const saved = new Set((marks ?? []).map((m) => m.event_id));

  return events
    .filter((e) => (e.user_id === userId ? e.pinned : saved.has(e.id)))
    .map((e) => {
      const start = new Date(e.starts_at);
      const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + HOUR);
      return { id: e.id, title: e.title, from: start, to: end };
    })
    .filter((b) => b.to > from && b.from < to);
}
