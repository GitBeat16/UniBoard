import { HomeView } from "@/components/screens/home-view";
import { attendanceFromCounts, officialOf } from "@/lib/attendance/stats";
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

  const now = new Date();
  const nowIso = now.toISOString();

  // Home needs a verdict per module and the next class or two — not the term.
  // It used to download every class and every mark ever made to work those
  // out; now the database does the counting (attendance_summary(), which
  // mirrors countSessions() rule for rule) and only the next few classes
  // cross the wire.
  const [
    { data: profile },
    { data: modules },
    { data: summary, error: summaryError },
    { data: upcomingSessions },
    { data: assignments },
    { data: exams },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, attendance_threshold, university_profiles(attendance_threshold)")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("modules")
      .select("id, name, code, color_token, threshold, official_attended, official_held, official_as_of"),
    supabase.rpc("attendance_summary"),
    // Anything not yet over, soonest first: a class that started ten minutes
    // ago is still the one that matters. A handful covers overlaps.
    supabase
      .from("class_sessions")
      .select("id, module_id, type, starts_at, ends_at, room, is_assessed, has_submission")
      .gt("ends_at", nowIso)
      .order("starts_at")
      .order("id")
      .limit(8),
    // Handed-in work is never pressing, so it never needs to leave the database.
    supabase
      .from("assignments")
      .select("id, title, due_at, module_id, status")
      .not("status", "in", "(submitted,graded)"),
    supabase.from("exams").select("id, title, starts_at, module_id"),
  ]);

  // Silently treating a failed count as "nothing below threshold" would be the
  // most reassuring possible wrong answer, so it fails loudly instead.
  if (summaryError) throw new Error(summaryError.message);

  const moduleById = new Map((modules ?? []).map((m) => [m.id, m]));

  const upcoming = upcomingSessions?.[0] ?? null;
  const isLive = upcoming ? new Date(upcoming.starts_at) <= now : false;
  // Flora's "next class in N minutes" is about one that has NOT started yet.
  const nextToStart = (upcomingSessions ?? []).find((s) => new Date(s.starts_at) >= now);
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

  // Whether there is a timetable at all — not just whether anything is left
  // this term — so an empty week never reads as "import your timetable".
  const countsByModule = new Map((summary ?? []).map((c) => [c.module_id, c]));
  const hasTimetable = (summary ?? []).some((c) => c.attended + c.missed + c.unmarked + c.remaining > 0);

  let modulesBelow = 0;
  const atRisk = (modules ?? []).filter((m) => {
    const counts = countsByModule.get(m.id) ?? { attended: 0, missed: 0, unmarked: 0, remaining: 0 };
    const stats = attendanceFromCounts(
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
        official: officialOf(m),
      },
      counts,
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
      hasOfficial={(modules ?? []).some((m) => m.official_as_of !== null)}
      hasTimetable={hasTimetable}
      overdueCount={overdueCount}
      dueTodayCount={dueTodayCount}
      minutesToNextClass={minutesToNextClass}
    />
  );
}
