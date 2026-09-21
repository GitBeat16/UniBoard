"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, CURRENCIES, formatMoney } from "@/lib/money/budget";

export type ActionState = { ok: boolean; message: string } | null;

const DAY = 86_400_000;

/**
 * The browser sends its own local date, because "today" is the student's
 * today and the server runs in UTC. It is only trusted within a day either
 * side of the server's clock — enough for every time zone, not enough to
 * backdate a budget.
 */
function plausibleLocalDay(day: string) {
  const t = Date.parse(`${day}T12:00:00Z`);
  return Number.isFinite(t) && Math.abs(t - Date.now()) <= 1.6 * DAY;
}

const amount = z.coerce
  .number({ message: "Enter an amount." })
  .positive("Amounts are above zero.")
  .max(9_999_999, "That is a very large number.")
  .transform((n) => Math.round(n * 100) / 100);

const budgetSchema = z
  .object({
    kind: z.enum(["week", "month"]),
    total: amount,
    food: z
      .union([z.literal(""), amount])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    currency: z.string().refine((c) => CURRENCIES.includes(c), "Pick a currency from the list."),
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((b) => b.food === null || b.food <= b.total, {
    message: "The food part cannot be more than the whole budget.",
  });

export async function setBudget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const b = parsed.data;
  if (!plausibleLocalDay(b.today)) return { ok: false, message: "Your device's date looks off." };

  // Takes effect today; setting it twice in a day replaces the first. Earlier
  // budgets stay, so last month is still measured against last month's number.
  const { error } = await supabase.from("budget_periods").upsert(
    {
      user_id: user.id,
      kind: b.kind,
      total_budget: b.total,
      food_budget: b.food,
      currency: b.currency,
      starts_at: b.today,
    },
    { onConflict: "user_id,starts_at" },
  );
  if (error) return { ok: false, message: error.message };

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ currency: b.currency })
    .eq("id", user.id);
  if (pErr) return { ok: false, message: pErr.message };

  revalidatePath("/money");
  return { ok: true, message: `Budget set: ${formatMoney(b.total, b.currency)} a ${b.kind}.` };
}

const expenseSchema = z.object({
  amount,
  category: z.enum(CATEGORIES),
  note: z
    .string()
    .trim()
    .max(120, "Keep the note under 120 characters.")
    .optional()
    .transform((v) => v || null),
});

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const e = parsed.data;

  // spent_at defaults to now() in the database: an instant, so no time-zone
  // question arises until the browser buckets it into a local day.
  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    amount: e.amount,
    category: e.category,
    note: e.note,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/money");
  return { ok: true, message: "Logged." };
}

export async function removeExpense(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !z.string().uuid().safeParse(id).success) return;

  await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/money");
}

/**
 * Accepts either the two numbers a geolocation fix gives, or one pasted
 * "18.4575, 73.8508" string — which is what Google Maps copies when you
 * long-press a spot.
 */
const campusSchema = z
  .object({
    coords: z.string().trim().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    label: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => v || null),
  })
  .transform((v, ctx) => {
    let lat = v.lat;
    let lng = v.lng;
    if (v.coords) {
      const m = v.coords.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
      if (!m) {
        ctx.addIssue({ code: "custom", message: "Paste it as two numbers, like 18.4575, 73.8508." });
        return z.NEVER;
      }
      lat = Number(m[1]);
      lng = Number(m[2]);
    }
    if (
      lat === undefined ||
      lng === undefined ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      ctx.addIssue({ code: "custom", message: "Those coordinates are not on Earth." });
      return z.NEVER;
    }
    // Six decimals is ~10 cm. Anything past that is noise, not precision.
    const r = (n: number) => Math.round(n * 1e6) / 1e6;
    return { lat: r(lat), lng: r(lng), label: v.label };
  });

export async function setCampus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const parsed = campusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the location." };
  }
  const c = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ campus_lat: c.lat, campus_lng: c.lng, campus_label: c.label })
    .eq("id", user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/money");
  return { ok: true, message: "Campus pin saved." };
}

export async function clearCampus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ campus_lat: null, campus_lng: null, campus_label: null })
    .eq("id", user.id);
  revalidatePath("/money");
}
