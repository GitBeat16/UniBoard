"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { nameKey, shortKey, tidyShortName, tidyUniversityName } from "@/lib/university/names";

export type ActionState = { ok: boolean; message: string } | null;

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Names cannot be blank.").max(60),
  /** Set when the student picked an existing university from the suggestions. */
  universityId: z.string().uuid().or(z.literal("")).optional(),
  universityName: z.string().trim().max(120).optional(),
  universityShort: z.string().trim().max(16).optional(),
  threshold: z.coerce.number().min(0).max(100),
  attendanceMonitored: z.union([z.literal("on"), z.literal("")]).optional(),
  travelMinutes: z.coerce.number().min(0).max(300).optional(),
});

export type UniversityHit = {
  id: string;
  name: string;
  shortName: string | null;
  threshold: number;
};

/**
 * Suggestions while typing. Matches the normalised key, so capitals, spacing
 * and punctuation never matter, and the short name ("pict") exactly.
 */
export async function searchUniversities(query: string): Promise<UniversityHit[]> {
  const key = nameKey(query);
  if (key.length < 2) return [];
  const sk = shortKey(query);

  const supabase = await createClient();
  // The key holds only letters, digits and single spaces, so quoting it is
  // enough to keep PostgREST's filter grammar intact.
  const { data } = await supabase
    .from("university_profiles")
    .select("id, name, short_name, attendance_threshold, name_key, short_key")
    .eq("is_public", true)
    .or(`name_key.ilike."*${key}*",short_key.eq."${sk}"`)
    .limit(8);

  return (data ?? [])
    .sort((a, b) => rankHit(a, key, sk) - rankHit(b, key, sk) || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map((u) => ({
      id: u.id,
      name: u.name,
      shortName: u.short_name,
      threshold: Number(u.attendance_threshold),
    }));
}

function rankHit(u: { name_key: string; short_key: string | null }, key: string, sk: string) {
  if (u.name_key === key || u.short_key === sk) return 0;
  if (u.name_key.startsWith(key)) return 1;
  return 2;
}

/**
 * Join an existing shared university, or create one. Whatever the capitals,
 * a name that already exists is joined, never duplicated — the database's
 * unique index on name_key backs that up if two students race.
 */
async function resolveUniversity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: z.infer<typeof profileSchema>,
): Promise<{ id: string | null; note: string | null } | { error: string }> {
  if (input.universityId) {
    const { data } = await supabase
      .from("university_profiles")
      .select("id")
      .eq("id", input.universityId)
      .eq("is_public", true)
      .maybeSingle();
    if (!data) return { error: "That university is no longer listed. Type it again." };
    return { id: data.id, note: null };
  }

  const typed = input.universityName?.trim() ?? "";
  if (!typed) return { id: null, note: null };
  if (typed.length < 3) return { error: "Write the university's full name." };

  const key = nameKey(typed);
  const existing = async () =>
    (
      await supabase
        .from("university_profiles")
        .select("id, name")
        .eq("is_public", true)
        .eq("name_key", key)
        .maybeSingle()
    ).data;

  const found = await existing();
  if (found) return { id: found.id, note: `Joined ${found.name}.` };

  const name = tidyUniversityName(typed);
  const short = input.universityShort ? tidyShortName(input.universityShort) : null;
  const { data: created, error } = await supabase
    .from("university_profiles")
    .insert({
      name,
      short_name: short && short.length >= 2 ? short : null,
      attendance_threshold: input.threshold,
      created_by: userId,
      is_public: true,
    })
    .select("id, name")
    .single();

  if (error) {
    // Someone added the same name a moment ago: join theirs.
    if (error.code === "23505") {
      const raced = await existing();
      if (raced) return { id: raced.id, note: `Joined ${raced.name}.` };
      return { error: "That university already exists. Pick it from the suggestions." };
    }
    return { error: error.message };
  }
  return { id: created.id, note: `Added ${created.name}. Classmates can now join it.` };
}

export async function saveProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;

  const uni = await resolveUniversity(supabase, user.id, input);
  if ("error" in uni) return { ok: false, message: uni.error };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      university_id: uni.id,
      // The student's own number. Joining a shared university never changes
      // anyone else's "you can miss N more".
      attendance_threshold: input.threshold,
      attendance_monitored: input.attendanceMonitored === "on",
      travel_minutes: input.travelMinutes ?? null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/me");
  revalidatePath("/timetable");
  revalidatePath("/board");
  revalidatePath("/");
  return { ok: true, message: uni.note ? `Saved. ${uni.note}` : "Saved." };
}

const goalSchema = z.object({
  title: z.string().trim().min(2, "Give the goal a name."),
  kind: z.enum(["habit", "project"]),
  targetPerWeek: z.coerce.number().min(0).max(50).optional(),
});

export async function addGoal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    title: parsed.data.title,
    kind: parsed.data.kind,
    target_per_week: parsed.data.targetPerWeek ?? null,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/me");
  return { ok: true, message: `Added “${parsed.data.title}”.` };
}

export async function setGoalProgress(id: string, progress: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("goals")
    .update({ progress: Math.max(0, Math.min(100, Math.round(progress))) })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/me");
}

export async function archiveGoal(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("goals")
    .update({ active: false })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/me");
}

const upgradeSchema = z.object({
  email: z.email("That does not look like an email address."),
  password: z.string().min(8, "Passwords need at least 8 characters."),
});

/**
 * Turns a guest (anonymous) account into a real one, keeping every row they
 * have already created — the user id never changes, so their timetable,
 * attendance and goals come with them.
 */
export async function upgradeAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  if (!user.is_anonymous) {
    return { ok: false, message: "This account already has an email." };
  }

  const parsed = upgradeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { error } = await supabase.auth.updateUser({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/me");
  return {
    ok: true,
    message:
      "Saved. If your project requires email confirmation, check your inbox to finish — your data is already attached either way.",
  };
}


/**
 * Rolls the calendar token, which revokes every existing subscription.
 * The old URL stops resolving immediately — there is no grace period, which is
 * the point of having the control at all.
 */
export async function regenerateCalendarToken(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ calendar_token: crypto.randomUUID() })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/me");
  return {
    ok: true,
    message: "New link created. Any calendar still using the old one will stop updating.",
  };
}
