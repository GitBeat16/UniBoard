import { HomeView } from "@/components/screens/home-view";
import { moduleAttendance } from "@/lib/attendance/stats";
import { urgencyOf, type WorkItem } from "@/lib/work/urgency";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
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
      supabase
        .from("profiles")
        .select("display_name, attendance_threshold, university_profiles(attendance_threshold)")
        .eq("id", user!.id)
        .single(),
      supabase.from("modules").select("id, name, code, color_token, threshold"),
      fetchAll((from, to) =>
        supabase
          .from("class_sessions")
          .select("id, module_id, type, starts_at, ends_at, room, is_assessed, has_submission")
          .order("starts_at")
          .order("id")
          .range(from, to),
      ).then((data) => ({ data })),
      fetchAll((from, to) =>
        supabase
          .from("attendance_records")
          .select("session_id, status")
          .order("id")
          .range(from, to),
      ).then((data) => ({ data })),
      supabase.from("assignments").select("id, title, due_at, module_id, status"),
      supabase.from("exams").select("id, title, starts_at, module_id"),
    ]);

  const moduleById = new Map((modules ?? []).map((m) => [m.id, m]));
  const statusBySession = new Map((records ?? []).map((r) => [r.session_id, r.status]));

  // A class that started ten minutes ago is still the one that matters: the
  // card should say "on now", not skip ahead to this afternoon.
  const upcoming = (sessions ?? []).find((s) => s.ends_at > nowIso);
  const isLive = upcoming ? upcoming.starts_at <= nowIso : false;
  // Flora's "next class in N minutes" is about one that has NOT started yet.
  const nextToStart = (sessions ?? []).find((s) => s.starts_at >= nowIso);
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
        // Same precedence as Timetable, so Home's "needs attention" count and
        // the Timetable's rings never disagree about the same module.
        threshold: Number(
          m.threshold ??
            profile?.attendance_threshold ??
            profile?.university_profiles?.attendance_threshold ??
            DEFAULT_THRESHOLD,
        ),
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
      moduleName: a.module_id ? (moduleById.get(a.module_id)?.name ?? null) : null,
      tone: asTone(a.module_id ? moduleById.get(a.module_id)?.color_token : "sky"),
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
      moduleName: e.module_id ? (moduleById.get(e.module_id)?.name ?? null) : null,
      tone: asTone(e.module_id ? moduleById.get(e.module_id)?.color_token : "iris"),
      status: null,
      weight: null,
      estimatedHours: null,
    })),
  ];

  const overdueCount = workItems.filter((i) => urgencyOf(i, now) === "overdue").length;
  const dueTodayCount = workItems.filter((i) => urgencyOf(i, now) === "today").length;

  const minutesToNextClass = nextToStart
    ? Math.round((new Date(nextToStart.starts_at).getTime() - now.getTime()) / 60_000)
    : null;

  return (
    <HomeView
      displayName={profile?.display_name ?? "there"}
      todayIso={nowIso}
      nextSession={nextSession}
      nextSessionLive={isLive}
      atRisk={atRisk}
      modulesBelow={modulesBelow}
      overdueCount={overdueCount}
      dueTodayCount={dueTodayCount}
      minutesToNextClass={minutesToNextClass}
    />
  );
}
