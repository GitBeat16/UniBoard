import { notFound } from "next/navigation";
import { AdvisorView, type AdvisorPayload } from "@/components/advisor/advisor-view";
import { moduleAttendance } from "@/lib/attendance/stats";
import { createClient } from "@/lib/supabase/server";
import { loadBoardBusy } from "@/lib/board/busy";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { asTone } from "@/lib/tones";

const DEFAULT_THRESHOLD = 75;

export default async function AdvisorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("class_sessions")
    .select(
      "id, module_id, type, starts_at, ends_at, room, is_assessed, has_submission, is_recorded",
    )
    .eq("id", id)
    .single();

  if (!session) notFound();

  const [{ data: module }, { data: siblings }, { data: records }, { data: profile }] =
    await Promise.all([
      supabase
        .from("modules")
        .select("id, name, code, color_token, threshold")
        .eq("id", session.module_id)
        .single(),
      fetchAll((from, to) =>
        supabase
          .from("class_sessions")
          .select("id, starts_at")
          .eq("module_id", session.module_id)
          .order("id")
          .range(from, to),
      ).then((data) => ({ data })),
      // Only this module's records, joined through the session — reading every
      // record the student has ever made just to use one module's worth hits the
      // same 1000-row ceiling as everything else.
      fetchAll((from, to) =>
        supabase
          .from("attendance_records")
          .select("session_id, status, class_sessions!inner(module_id)")
          .eq("class_sessions.module_id", session.module_id)
          .order("id")
          .range(from, to),
      ).then((data) => ({ data })),
      supabase
        .from("profiles")
        .select(
          "attendance_threshold, attendance_monitored, travel_minutes, university_profiles(attendance_threshold)",
        )
        .single(),
    ]);

  if (!module) notFound();

  const statusBySession = new Map((records ?? []).map((r) => [r.session_id, r.status]));
  const threshold = Number(
    module.threshold ??
      profile?.attendance_threshold ??
      profile?.university_profiles?.attendance_threshold ??
      DEFAULT_THRESHOLD,
  );

  const now = new Date();

  const attendance = moduleAttendance(
    {
      moduleId: module.id,
      name: module.name,
      code: module.code,
      colorToken: module.color_token,
      threshold,
      sessions: (siblings ?? []).map((s) => ({
        startsAt: new Date(s.starts_at),
        status: statusBySession.get(s.id) ?? null,
      })),
    },
    now,
  );

  // Only open work counts as pressure — a submitted assignment is not a reason
  // to skip anything.
  const horizon = new Date(now.getTime() + 14 * 24 * 3_600_000).toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: assignments }, { data: exams }, { data: goals }, busy] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_at, module_id, status, estimated_hours")
      .gte("due_at", now.toISOString())
      .lte("due_at", horizon)
      .in("status", ["not_started", "in_progress"]),
    supabase
      .from("exams")
      .select("id, title, starts_at, module_id")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", horizon),
    supabase.from("goals").select("id, title, kind").eq("active", true),
    loadBoardBusy(supabase, user!.id, new Date(session.starts_at), new Date(session.ends_at)),
  ]);

  const payload: AdvisorPayload = {
    session: {
      id: session.id,
      moduleId: session.module_id,
      moduleName: module.name,
      code: module.code,
      tone: asTone(module.color_token),
      type: session.type,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      room: session.room,
      isAssessed: session.is_assessed,
      hasSubmission: session.has_submission,
      isRecorded: session.is_recorded,
      status: statusBySession.get(session.id) ?? null,
    },
    attendance,
    deadlines: (assignments ?? []).map((a) => ({
      title: a.title,
      dueAt: a.due_at,
      moduleId: a.module_id,
    })),
    exams: (exams ?? []).map((e) => ({
      title: e.title,
      startsAt: e.starts_at,
      moduleId: e.module_id,
    })),
    work: [
      ...(assignments ?? []).map((a) => ({
        id: a.id,
        kind: "assignment" as const,
        title: a.title,
        at: a.due_at,
        moduleId: a.module_id,
        moduleName: null,
        tone: "coral" as const,
        status: a.status,
        weight: null,
        estimatedHours: a.estimated_hours,
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
    ],
    goals: (goals ?? []).map((g) => ({ id: g.id, title: g.title, kind: g.kind })),
    travelMinutes: profile?.travel_minutes ?? null,
    attendanceMonitored: profile?.attendance_monitored ?? false,
    nowIso: now.toISOString(),
    busy: busy.map((b) => ({ id: b.id, title: b.title, from: b.from.toISOString(), to: b.to.toISOString() })),
  };

  return <AdvisorView payload={payload} />;
}
