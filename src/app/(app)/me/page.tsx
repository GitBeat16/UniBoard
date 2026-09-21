import { MeView, type GoalVM, type ProfileVM } from "@/components/screens/me-view";
import { createClient } from "@/lib/supabase/server";
import { getCanonicalOrigin } from "@/lib/url/server";

const DEFAULT_THRESHOLD = 75;

export default async function MePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: goals }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name, attendance_threshold, attendance_monitored, travel_minutes, calendar_token, university_id, university_profiles(name, short_name, attendance_threshold)",
      )
      .eq("id", user!.id)
      .single(),
    supabase.from("goals").select("id, title, kind, target_per_week, progress").eq("active", true).order("created_at"),
  ]);

  const vm: ProfileVM = {
    displayName: profile?.display_name ?? "",
    universityId: profile?.university_id ?? null,
    universityName: profile?.university_profiles?.name ?? "",
    universityShort: profile?.university_profiles?.short_name ?? null,
    threshold: Number(
      profile?.attendance_threshold ??
        profile?.university_profiles?.attendance_threshold ??
        DEFAULT_THRESHOLD,
    ),
    attendanceMonitored: profile?.attendance_monitored ?? false,
    travelMinutes: profile?.travel_minutes ?? null,
  };

  const goalVms: GoalVM[] = (goals ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    kind: g.kind,
    targetPerWeek: g.target_per_week,
    progress: Number(g.progress),
  }));

  // Canonical, not this request's host: this link gets pasted into Google
  // Calendar once and must outlive whichever preview deployment it came from.
  const feedUrl = profile?.calendar_token
    ? `${await getCanonicalOrigin()}/api/calendar/${profile.calendar_token}`
    : null;

  return (
    <MeView
      profile={vm}
      goals={goalVms}
      isGuest={user?.is_anonymous ?? false}
      feedUrl={feedUrl}
    />
  );
}
