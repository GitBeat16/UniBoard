import { HomeView } from "@/components/screens/home-view";
import { moduleAttendance } from "@/lib/attendance/stats";
import { urgencyOf, type WorkItem } from "@/lib/work/urgency";
import { createClient } from "@/lib/supabase/server";
import { asTone } from "@/lib/tones";
import type { SessionVM } from "@/lib/view-models";

const DEFAULT_THRESHOLD = 75;

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nowIso = new Date().toISOString();

  const [
    { data: profile },
    { data: modules },
    { data: sessions },
    { data: records },
    { data: assignments },
    { data: exams },
  ] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user!.id).single(),
      supabase.from("modules").select("id, name, code, color_token, threshold"),
      supabase
        .from("class_sessions")
        .select("id, module_id, type, starts_at, ends_at, room, is_assessed, has_submission")
        .order("starts_at"),
      supabase.from("attendance_records").select("session_id, status"),
      supabase.from("assignments").select("id, title, due_at, module_id, status"),
      supabase.from("exams").select("id, title, starts_at, module_id"),
    ]);

  const moduleById = new Map((modules ?? []).map((m) => [m.id, m]));
  const statusBySession = new Map((records ?? []).map((r) => [r.session_id, r.status]));

  const upcoming = (sessions ?? []).find((s) => s.starts_at >= nowIso);
  const nextSession: SessionVM | null = upcoming
    ? {
        id: upcoming.id,
        moduleId: upcoming.module_id,
        moduleName: moduleById.get(upcoming.module_id)?.name ?? "Class",
        code: moduleById.get(upcoming.module_id)?.code ?? null,
        tone: asTone(moduleById.get(upcoming.module_id)?.color_token),
        type: upcoming.type,
        startsAt: upcoming.starts_at,
        endsAt: upcoming.ends_at,
        room: upcoming.room,
        isAssessed: upcoming.is_assessed,
        hasSubmission: upcoming.has_submission,
        status: null,
      }
    : null;

  const now = new Date();

  let modulesBelow = 0;
  const atRisk = (modules ?? []).filter((m) => {
    const stats = moduleAttendance(
      {
        moduleId: m.id,
        name: m.name,
        code: m.code,
        colorToken: m.color_token,
        threshold: Number(m.threshold ?? DEFAULT_THRESHOLD),
        sessions: (sessions ?? [])
          .filter((s) => s.module_id === m.id)
          .map((s) => ({
            startsAt: new Date(s.starts_at),
            status: statusBySession.get(s.id) ?? null,
          })),
      },
      now,
    );
    if (stats.status === "below") modulesBelow++;
    return stats.status === "below" || stats.status === "thin";
  }).length;

  // Flora needs to know what is actually pressing, so the same urgency rules
  // the Board uses decide what she mentions.
  const workItems: WorkItem[] = [
    ...(assignments ?? []).map((a) => ({
      id: a.id,
      kind: "assignment" as const,
      title: a.title,
      at: a.due_at,
      moduleId: a.module_id,
      moduleName: null,
      tone: "sky" as const,
      status: a.status,
      weight: null,
      estimatedHours: null,
    })),
    ...(exams ?? []).map((e) => ({
      id: e.id,
      kind: "exam" as const,
      title: e.title,
      at: e.starts_at,
      moduleId: e.module_id,
      moduleName: null,
      tone: "iris" as const,
      status: null,
      weight: null,
      estimatedHours: null,
    })),
  ];

  const overdueCount = workItems.filter((i) => urgencyOf(i, now) === "overdue").length;
  const dueTodayCount = workItems.filter((i) => urgencyOf(i, now) === "today").length;

  const minutesToNextClass = upcoming
    ? Math.round((new Date(upcoming.starts_at).getTime() - now.getTime()) / 60_000)
    : null;

  return (
    <HomeView
      displayName={profile?.display_name ?? "there"}
      todayIso={nowIso}
      nextSession={nextSession}
      atRisk={atRisk}
      modulesBelow={modulesBelow}
      overdueCount={overdueCount}
      dueTodayCount={dueTodayCount}
      minutesToNextClass={minutesToNextClass}
    />
  );
}
