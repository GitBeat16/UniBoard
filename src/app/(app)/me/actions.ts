"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string } | null;

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Names cannot be blank.").max(60),
  universityName: z.string().trim().max(120).optional(),
  threshold: z.coerce.number().min(0).max(100),
  attendanceMonitored: z.union([z.literal("on"), z.literal("")]).optional(),
  travelMinutes: z.coerce.number().min(0).max(300).optional(),
});

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

  const { data: current } = await supabase
    .from("profiles")
    .select("university_id")
    .eq("id", user.id)
    .single();

  let universityId = current?.university_id ?? null;

  if (input.universityName) {
    // Only rows this user created are theirs to edit. A shared public profile
    // belongs to everyone, so editing it would quietly change other students'
    // thresholds — fork a private one instead.
    const { data: owned } = universityId
      ? await supabase
          .from("university_profiles")
          .select("id, created_by")
          .eq("id", universityId)
          .single()
      : { data: null };

    if (owned && owned.created_by === user.id) {
      const { error } = await supabase
        .from("university_profiles")
        .update({ name: input.universityName, attendance_threshold: input.threshold })
        .eq("id", owned.id);
      if (error) return { ok: false, message: error.message };
    } else {
      const { data: created, error } = await supabase
        .from("university_profiles")
        .insert({
          name: input.universityName,
          attendance_threshold: input.threshold,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) return { ok: false, message: error.message };
      universityId = created.id;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      university_id: universityId,
      attendance_monitored: input.attendanceMonitored === "on",
      travel_minutes: input.travelMinutes ?? null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/me");
  revalidatePath("/timetable");
  revalidatePath("/");
  return { ok: true, message: "Saved." };
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
