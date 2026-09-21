import { BoardView, type BoardWork } from "@/components/screens/board-view";
import { asShape, type BoardEvent } from "@/lib/board/items";
import { createClient } from "@/lib/supabase/server";
import { asTone } from "@/lib/tones";

// Events that ended more than this long ago are not worth loading.
const EVENT_HISTORY_DAYS = 30;

function eventsSince() {
  return new Date(Date.now() - EVENT_HISTORY_DAYS * 86_400_000).toISOString();
}

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: modules },
    { data: assignments },
    { data: exams },
    { data: events },
    { data: marks },
    { data: profile },
  ] = await Promise.all([
    supabase.from("modules").select("id, name, color_token").order("name"),
    supabase
      .from("assignments")
      .select("id, title, due_at, module_id, status, weight, estimated_hours, card_shape"),
    supabase.from("exams").select("id, title, starts_at, module_id, card_shape"),
    // RLS returns the student's own events plus those shared with their
    // university — nothing else is visible to this query.
    supabase
      .from("board_events")
      .select("id, user_id, title, starts_at, ends_at, location, details, tags, visibility, card_shape")
      .gte("starts_at", eventsSince())
      .order("starts_at")
      .limit(200),
    supabase.from("board_event_marks").select("event_id, kind"),
    supabase
      .from("profiles")
      .select("university_profiles(name, short_name)")
      .eq("id", user!.id)
      .single(),
  ]);

  const moduleById = new Map((modules ?? []).map((m) => [m.id, m]));
  const markByEvent = new Map((marks ?? []).map((m) => [m.event_id, m.kind]));

  const work: BoardWork[] = [
    ...(assignments ?? []).map((a) => ({
      id: a.id,
      kind: "assignment" as const,
      title: a.title,
      at: a.due_at,
      moduleId: a.module_id,
      moduleName: a.module_id ? (moduleById.get(a.module_id)?.name ?? null) : null,
      tone: asTone(a.module_id ? moduleById.get(a.module_id)?.color_token : "sky"),
      status: a.status,
      weight: a.weight,
      estimatedHours: a.estimated_hours,
      shape: asShape(a.card_shape),
    })),
    ...(exams ?? []).map((e) => ({
      id: e.id,
      kind: "exam" as const,
      title: e.title,
      at: e.starts_at,
      moduleId: e.module_id,
      moduleName: e.module_id ? (moduleById.get(e.module_id)?.name ?? null) : null,
      tone: asTone(e.module_id ? moduleById.get(e.module_id)?.color_token : "coral"),
      status: null,
      weight: null,
      estimatedHours: null,
      shape: asShape(e.card_shape),
    })),
  ];

  const boardEvents: BoardEvent[] = (events ?? []).map((e) => {
    const mark = markByEvent.get(e.id);
    return {
      id: e.id,
      title: e.title,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      location: e.location,
      details: e.details,
      tags: e.tags,
      visibility: e.visibility === "university" ? "university" : "private",
      mine: e.user_id === user!.id,
      mark: mark === "save" || mark === "hide" ? mark : null,
      shape: asShape(e.card_shape),
    };
  });

  const uni = profile?.university_profiles ?? null;

  return (
    <BoardView
      work={work}
      events={boardEvents}
      modules={(modules ?? []).map((m) => ({ id: m.id, name: m.name }))}
      university={uni ? { name: uni.name, shortName: uni.short_name } : null}
    />
  );
}
