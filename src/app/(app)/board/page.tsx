import { BoardView } from "@/components/screens/board-view";
import { createClient } from "@/lib/supabase/server";
import { asTone } from "@/lib/tones";
import type { WorkItem } from "@/lib/work/urgency";

export default async function BoardPage() {
  const supabase = await createClient();

  const [{ data: modules }, { data: assignments }, { data: exams }] = await Promise.all([
    supabase.from("modules").select("id, name, color_token").order("name"),
    supabase.from("assignments").select("id, title, due_at, module_id, status, weight, estimated_hours"),
    supabase.from("exams").select("id, title, starts_at, module_id"),
  ]);

  const moduleById = new Map((modules ?? []).map((m) => [m.id, m]));

  const items: WorkItem[] = [
    ...(assignments ?? []).map((a) => ({
      id: a.id,
      kind: "assignment" as const,
      title: a.title,
      at: a.due_at,
      moduleId: a.module_id,
      moduleName: a.module_id ? (moduleById.get(a.module_id)?.name ?? null) : null,
      tone: asTone(a.module_id ? moduleById.get(a.module_id)?.color_token : "coral"),
      status: a.status,
      weight: a.weight,
      estimatedHours: a.estimated_hours,
    })),
    ...(exams ?? []).map((e) => ({
      id: e.id,
      kind: "exam" as const,
      title: e.title,
      at: e.starts_at,
      moduleId: e.module_id,
      moduleName: e.module_id ? (moduleById.get(e.module_id)?.name ?? null) : null,
      tone: asTone(e.module_id ? moduleById.get(e.module_id)?.color_token : "iris"),
      status: null,
      weight: null,
      estimatedHours: null,
    })),
  ];

  return (
    <BoardView
      items={items}
      modules={(modules ?? []).map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}
