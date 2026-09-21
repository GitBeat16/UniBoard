"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import { parseTags, SHAPES } from "@/lib/board/items";
import { parseLocalDateTime, zoneOrFallback } from "@/lib/time/zone";

export type ActionState = { ok: boolean; message: string } | null;

const shape = z
  .enum(SHAPES)
  .or(z.literal(""))
  .optional()
  .transform((v) => v || null);

const workSchema = z.object({
  kind: z.enum(["assignment", "exam"]),
  title: z.string().trim().min(2, "Give it a title.").max(120),
  moduleId: z.string().uuid().or(z.literal("")).optional(),
  at: z.string().min(1, "Pick a date and time."),
  weight: z.coerce.number().min(0).max(100).optional(),
  estimatedHours: z.coerce.number().min(0).max(200).optional(),
  shape,
});

function refresh() {
  revalidatePath("/board");
  revalidatePath("/");
}

export async function addWork(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const parsed = workSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;

  // datetime-local has no zone: "14:00" means 14:00 where the student is.
  const at = parseLocalDateTime(input.at, zoneOrFallback(formData.get("tz")));
  if (!at) {
    return { ok: false, message: "That date did not parse." };
  }

  const moduleId = input.moduleId || null;

  const { error } =
    input.kind === "assignment"
      ? await supabase.from("assignments").insert({
          user_id: user.id,
          module_id: moduleId,
          title: input.title,
          due_at: at.toISOString(),
          weight: input.weight ?? null,
          estimated_hours: input.estimatedHours ?? null,
          card_shape: input.shape,
        })
      : await supabase.from("exams").insert({
          user_id: user.id,
          module_id: moduleId,
          title: input.title,
          starts_at: at.toISOString(),
          card_shape: input.shape,
        });

  if (error) return { ok: false, message: error.message };

  refresh();
  return { ok: true, message: `Pinned “${input.title}”.` };
}

const eventSchema = z.object({
  title: z.string().trim().min(2, "Give it a title.").max(120),
  startsAt: z.string().min(1, "When does it start?"),
  endsAt: z.string().optional(),
  location: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  details: z
    .string()
    .trim()
    .max(500, "Keep the details under 500 characters.")
    .optional()
    .transform((v) => v || null),
  tags: z.string().optional(),
  share: z.union([z.literal("on"), z.literal("")]).optional(),
  shape,
});

export async function addEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;
  const tz = zoneOrFallback(formData.get("tz"));

  const startsAt = parseLocalDateTime(input.startsAt, tz);
  if (!startsAt) return { ok: false, message: "The start time did not parse." };
  const endsAt = input.endsAt ? parseLocalDateTime(input.endsAt, tz) : null;
  if (input.endsAt && !endsAt) return { ok: false, message: "The end time did not parse." };
  if (endsAt && endsAt <= startsAt) {
    return { ok: false, message: "It has to end after it starts." };
  }

  // Sharing goes to the university the student actually belongs to — read
  // here, never taken from the form. The database policy checks it again.
  let universityId: string | null = null;
  if (input.share === "on") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("university_id")
      .eq("id", user.id)
      .single();
    universityId = profile?.university_id ?? null;
    if (!universityId) {
      return { ok: false, message: "Pick your university on Me before sharing with it." };
    }
  }

  const { error } = await supabase.from("board_events").insert({
    user_id: user.id,
    title: input.title,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() ?? null,
    location: input.location,
    details: input.details,
    tags: parseTags(input.tags ?? ""),
    visibility: universityId ? "university" : "private",
    university_id: universityId,
    card_shape: input.shape,
  });
  if (error) return { ok: false, message: error.message };

  refresh();
  return {
    ok: true,
    message: universityId
      ? `Pinned “${input.title}” and shared it with your university.`
      : `Pinned “${input.title}”.`,
  };
}

export async function setAssignmentStatus(id: string, status: Enums<"assignment_status">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS already scopes this, but every Server Action is a public POST endpoint
  // and should not rely on a single layer. Belt and braces, cheaply.
  await supabase.from("assignments").update({ status }).eq("id", id).eq("user_id", user.id);
  refresh();
}

const TABLE = { assignment: "assignments", exam: "exams", event: "board_events" } as const;
type Kind = keyof typeof TABLE;

export async function setCardShape(kind: Kind, id: string, next: string) {
  const parsed = z.enum(SHAPES).safeParse(next);
  if (!parsed.success || !(kind in TABLE)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Only the owner's card: a classmate's shared event keeps its author's shape.
  await supabase
    .from(TABLE[kind])
    .update({ card_shape: parsed.data })
    .eq("id", id)
    .eq("user_id", user.id);
  refresh();
}

export async function removeWork(kind: "assignment" | "exam", id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Deletes deserve the loudest version of the check.
  await supabase.from(TABLE[kind]).delete().eq("id", id).eq("user_id", user.id);
  refresh();
}

export async function removeEvent(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("board_events").delete().eq("id", id).eq("user_id", user.id);
  refresh();
}

/**
 * Save (pin to my board) or hide someone else's shared event, or clear the
 * mark. The table's policy only accepts marks on events this student can see.
 */
export async function markEvent(id: string, kind: "save" | "hide" | null) {
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (kind === null) {
    await supabase.from("board_event_marks").delete().eq("event_id", id).eq("user_id", user.id);
  } else {
    await supabase
      .from("board_event_marks")
      .upsert({ user_id: user.id, event_id: id, kind }, { onConflict: "user_id,event_id" });
  }
  refresh();
}

/** Share one of my own events with my university, or take it back. */
export async function setEventShared(id: string, shared: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  let universityId: string | null = null;
  if (shared) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("university_id")
      .eq("id", user.id)
      .single();
    universityId = profile?.university_id ?? null;
    if (!universityId) return;
  }

  await supabase
    .from("board_events")
    .update({ visibility: shared ? "university" : "private", university_id: universityId })
    .eq("id", id)
    .eq("user_id", user.id);
  refresh();
}
