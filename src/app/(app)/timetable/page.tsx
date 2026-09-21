import { TimetableView } from "@/components/screens/timetable-view";
import { moduleAttendance, type ModuleAttendance } from "@/lib/attendance/stats";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { asTone } from "@/lib/tones";
import type { SessionVM } from "@/lib/view-models";

const DEFAULT_THRESHOLD = 75;

export default async function TimetablePage() {
  const supabase = await createClient();

  const [{ data: modules }, { data: sessions }, { data: records }, { data: profile }] =
    await Promise.all([
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
      supabase
        .from("profiles")
        .select("attendance_threshold, university_id, university_profiles(attendance_threshold)")
        .single(),
    ]);

  // One shared default: the university profile's threshold, overridable per module.
  const uniThreshold = Number(
    profile?.attendance_threshold ??
      profile?.university_profiles?.attendance_threshold ??
      DEFAULT_THRESHOLD,
  );

  const statusBySession = new Map(
    (records ?? []).map((r) => [r.session_id, r.status]),
  );
  const moduleById = new Map((modules ?? []).map((m) => [m.id, m]));

  const vms: SessionVM[] = (sessions ?? []).map((s) => {
    const m = moduleById.get(s.module_id);
    return {
      id: s.id,
      moduleId: s.module_id,
      moduleName: m?.name ?? "Class",
      code: m?.code ?? null,
      tone: asTone(m?.color_token),
      type: s.type,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      room: s.room,
      isAssessed: s.is_assessed,
      hasSubmission: s.has_submission,
      status: statusBySession.get(s.id) ?? null,
    };
  });

  const now = new Date();
  const stats: ModuleAttendance[] = (modules ?? [])
    .map((m) =>
      moduleAttendance(
        {
          moduleId: m.id,
          name: m.name,
          code: m.code,
          colorToken: m.color_token,
          threshold: Number(m.threshold ?? uniThreshold),
          sessions: (sessions ?? [])
            .filter((s) => s.module_id === m.id)
            .map((s) => ({
              startsAt: new Date(s.starts_at),
              status: statusBySession.get(s.id) ?? null,
            })),
        },
        now,
      ),
    )
    // Most urgent first: below threshold, then thin, then the rest.
    .sort((a, b) => rank(a.status) - rank(b.status) || a.name.localeCompare(b.name));

  return <TimetableView sessions={vms} modules={stats} />;
}

function rank(status: ModuleAttendance["status"]) {
  return { below: 0, thin: 1, safe: 2, unknown: 3 }[status];
}
