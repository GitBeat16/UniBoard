"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type ActionState = { ok: boolean; message: string } | null;

const workSchema = z.object({
  kind: z.enum(["assignment", "exam"]),
  title: z.string().trim().min(2, "Give it a title."),
  moduleId: z.string().uuid().or(z.literal("")).optional(),
  at: z.string().min(1, "Pick a date and time."),
  weight: z.coerce.number().min(0).max(100).optional(),
  estimatedHours: z.coerce.number().min(0).max(200).optional(),
});

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

  const at = new Date(input.at);
  if (Number.isNaN(at.getTime())) {
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
        })
      : await supabase.from("exams").insert({
          user_id: user.id,
          module_id: moduleId,
          title: input.title,
          starts_at: at.toISOString(),
        });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/board");
  revalidatePath("/");
  return { ok: true, message: `Added “${input.title}”.` };
}

export async function setAssignmentStatus(
  id: string,
  status: Enums<"assignment_status">,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS already scopes this, but every Server Action is a public POST endpoint
  // and should not rely on a single layer. Belt and braces, cheaply.
  await supabase
    .from("assignments")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/board");
  revalidatePath("/");
}

export async function removeWork(kind: "assignment" | "exam", id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Deletes deserve the loudest version of the check.
  await supabase
    .from(kind === "assignment" ? "assignments" : "exams")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/board");
  revalidatePath("/");
}
