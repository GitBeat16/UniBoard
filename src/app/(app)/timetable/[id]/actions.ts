"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Reason, Verdict } from "@/lib/advisor/engine";
import { buildReclaimPlan } from "@/lib/reclaim/plan";
import { loadBoardBusy } from "@/lib/board/busy";
import type { WorkItem } from "@/lib/work/urgency";
import type { TablesInsert } from "@/lib/supabase/database.types";

/**
 * Logged so the advisor can eventually be tuned against what this student
 * actually did, rather than living on fixed weights forever (PLAN.md §5).
 */
export async function recordDecision({
  sessionId,
  verdict,
  score,
  reasons,
  choseToSkip,
}: {
  sessionId: string;
  verdict: Verdict;
  score: number;
  reasons: Reason[];
  choseToSkip: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // sessionId arrives from a public endpoint — confirm it is this user's before
  // writing a row that references it. See markAttendance for the same rule.
  const { data: owned } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!owned) return;

  await supabase.from("skip_decisions").insert({
    user_id: user.id,
    session_id: sessionId,
    verdict,
    score,
    reasons,
    chose_to_skip: choseToSkip,
  });

  revalidatePath("/timetable");
}


/**
 * Saves the freed hours as study blocks.
 *
 * The plan is rebuilt here from the database rather than accepted from the
 * client. A Server Action is a public POST endpoint, so client-supplied slots
 * would let anyone write arbitrary rows into their own calendar with arbitrary
 * titles and times — and the plan would silently diverge from what the pure
 * planner actually produces. Same function, same inputs, trusted source.
 */
export async function saveReclaimPlan(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, starts_at, ends_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) return { ok: false, message: "That class is not yours." };

  const now = new Date();
  const horizon = new Date(now.getTime() + 21 * 24 * 3_600_000).toISOString();

  const from = new Date(session.starts_at);
  const to = new Date(session.ends_at);

  const [{ data: assignments }, { data: exams }, { data: goals }, busy] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_at, module_id, status, estimated_hours")
      .lte("due_at", horizon)
      .in("status", ["not_started", "in_progress"]),
    supabase.from("exams").select("id, title, starts_at, module_id").lte("starts_at", horizon),
    supabase.from("goals").select("id, title, kind").eq("active", true),
    loadBoardBusy(supabase, user.id, from, to),
  ]);

  const work: WorkItem[] = [
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
  ];

  const slots = buildReclaimPlan({
    from,
    to,
    work,
    goals: (goals ?? []).map((g) => ({ id: g.id, title: g.title, kind: g.kind })),
    now,
    busy,
  });

  if (slots.length === 0) return { ok: false, message: "Nothing to schedule." };

  // Re-running Reclaim for the same class replaces its blocks rather than
  // stacking a second copy on top.
  await supabase
    .from("study_blocks")
    .delete()
    .eq("user_id", user.id)
    .eq("source", "reclaim")
    .gte("starts_at", session.starts_at)
    .lte("ends_at", session.ends_at);

  // Pinned events are already on the board (and in the feed) — they are part
  // of the plan's shape, not study blocks to save.
  const rows: TablesInsert<"study_blocks">[] = slots
    .filter((s) => s.kind !== "event")
    .map((s) => ({
      user_id: user.id,
      starts_at: s.startsAt,
      ends_at: s.endsAt,
      title: s.title,
      source: "reclaim",
      linked_type: s.linkedType,
      linked_id: s.linkedId,
    }));

  const { error } = await supabase.from("study_blocks").insert(rows);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/timetable");
  revalidatePath("/");
  return { ok: true, message: `Added ${rows.length} blocks to your day.` };
}
