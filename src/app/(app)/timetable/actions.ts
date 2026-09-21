"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchIcs, IcsFetchError } from "@/lib/ics/fetch";
import { parseIcs } from "@/lib/ics/parse";
import {
  expandExtraction,
  extractTimetable,
  SUPPORTED_IMAGE_TYPES,
  VisionError,
} from "@/lib/ics/vision";
import { extractModule, moduleKey, toneForIndex } from "@/lib/ics/module-map";
import {
  addDays,
  parseClock,
  wallTimeToInstant,
  wallToday,
  weekdayOf,
  zoneOrFallback,
} from "@/lib/time/zone";
import type { Enums, TablesInsert } from "@/lib/supabase/database.types";

export type ActionState = { ok: boolean; message: string } | null;

const WEEKS_BACK = 8;
const WEEKS_FORWARD = 26;
const CHUNK = 500;

function importWindow(now = new Date()) {
  const from = new Date(now);
  from.setDate(from.getDate() - WEEKS_BACK * 7);
  const to = new Date(now);
  to.setDate(to.getDate() + WEEKS_FORWARD * 7);
  return { from, to };
}

/** One shape for both import routes, so the insert path stays single. */
type IncomingSession = {
  uid: string;
  title: string;
  location?: string | null;
  start: Date;
  end: Date;
  /** Set by the vision route, which reads the session type off the page. */
  type?: Enums<"session_type">;
};

/** Keep in step with `bodySizeLimit` in next.config.ts and the client's MAX_FILE. */
const MAX_UPLOAD = 4 * 1024 * 1024;

function isVisionFile(type: string) {
  return type === "application/pdf" || (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(type);
}

export async function importTimetable(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const url = String(formData.get("url") ?? "").trim();
  const pasted = String(formData.get("ics") ?? "").trim();
  const file = formData.get("file");
  const weeks = Math.min(30, Math.max(1, Number(formData.get("weeks") ?? 12) || 12));
  // The student's zone, from the browser. Wall-clock times in a photo, a
  // hand-typed class or a zone-less feed mean *their* clock, not the server's.
  const timeZone = zoneOrFallback(formData.get("tz"));

  let incoming: IncomingSession[] = [];
  const notes: string[] = [];

  try {
    if (file instanceof File && file.size > 0 && isVisionFile(file.type)) {
      // ---- photo or PDF -> Claude reads the grid ----
      if (file.size > MAX_UPLOAD) {
        return { ok: false, message: "That file is too large (4 MB max)." };
      }

      const data = Buffer.from(await file.arrayBuffer()).toString("base64");
      const extraction = await extractTimetable({ data, mediaType: file.type });

      incoming = expandExtraction(extraction, { weeks, from: new Date(), timeZone });

      if (extraction.confidence !== "high") {
        notes.push(
          `read with ${extraction.confidence} confidence — check the week before you trust it`,
        );
      }
      if (extraction.notes) notes.push(extraction.notes);
    } else {
      // ---- calendar feed, .ics upload, or pasted text ----
      let text = "";
      if (url) {
        text = await fetchIcs(url);
      } else if (file instanceof File && file.size > 0) {
        if (file.size > MAX_UPLOAD) {
          return { ok: false, message: "That file is too large (4 MB max)." };
        }
        text = await file.text();
      } else if (pasted) {
        text = pasted;
      } else {
        return {
          ok: false,
          message: "Paste a calendar link, or upload an .ics file, photo or PDF.",
        };
      }

      const parsed = parseIcs(text, { ...importWindow(), timeZone });
      incoming = parsed.sessions;
      if (parsed.skipped > 0) notes.push(`${parsed.skipped} entries were unreadable`);
      if (parsed.truncated) notes.push("the feed was very large, so it was trimmed");
    }
  } catch (error) {
    if (error instanceof IcsFetchError || error instanceof VisionError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Could not read that timetable." };
  }

  if (incoming.length === 0) {
    return {
      ok: false,
      message: "No classes found. If it is a photo, a straight-on crop reads best.",
    };
  }

  // Group occurrences into modules.
  const groups = new Map<
    string,
    { name: string; code: string | null; sessions: Array<IncomingSession & { type: Enums<"session_type"> }> }
  >();

  for (const session of incoming) {
    const info = extractModule(session.title);
    const key = moduleKey(info);
    const group = groups.get(key) ?? { name: info.name, code: info.code, sessions: [] };
    if (!group.code && info.code) group.code = info.code;
    // The vision route already knows the session type; the ICS route infers it.
    group.sessions.push({ ...session, type: session.type ?? info.type });
    groups.set(key, group);
  }

  const { data: existing, error: existingError } = await supabase
    .from("modules")
    .select("id, code, name");
  if (existingError) return { ok: false, message: existingError.message };

  const byKey = new Map<string, string>();
  for (const m of existing ?? []) {
    byKey.set((m.code ?? m.name).toLowerCase(), m.id);
    byKey.set(m.name.toLowerCase(), m.id);
  }

  const toCreate = [...groups.entries()].filter(([key]) => !byKey.has(key));
  if (toCreate.length > 0) {
    const rows: TablesInsert<"modules">[] = toCreate.map(([, g], i) => ({
      user_id: user.id,
      name: g.name,
      code: g.code,
      color_token: toneForIndex((existing?.length ?? 0) + i),
    }));

    const { data: created, error } = await supabase
      .from("modules")
      .insert(rows)
      .select("id, code, name");
    if (error) return { ok: false, message: error.message };

    created?.forEach((m, i) => byKey.set(toCreate[i][0], m.id));
  }

  const sessionRows: TablesInsert<"class_sessions">[] = [];
  for (const [key, group] of groups) {
    const moduleId = byKey.get(key);
    if (!moduleId) continue;
    for (const s of group.sessions) {
      sessionRows.push({
        user_id: user.id,
        module_id: moduleId,
        type: s.type,
        starts_at: s.start.toISOString(),
        ends_at: s.end.toISOString(),
        room: s.location ?? null,
        external_uid: s.uid,
      });
    }
  }

  for (let i = 0; i < sessionRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("class_sessions")
      .upsert(sessionRows.slice(i, i + CHUNK), { onConflict: "user_id,external_uid" });
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/timetable");
  revalidatePath("/");

  return {
    ok: true,
    message:
      `Imported ${sessionRows.length} classes across ${groups.size} modules` +
      (notes.length ? ` (${notes.join("; ")}).` : "."),
  };
}

const manualSchema = z.object({
  name: z.string().trim().min(2, "Give the module a name."),
  type: z.enum(["lecture", "lab", "seminar", "tutorial", "workshop", "other"]),
  room: z.string().trim().max(80).optional(),
  weekday: z.coerce.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Start time looks wrong."),
  end: z.string().regex(/^\d{2}:\d{2}$/, "End time looks wrong."),
  weeks: z.coerce.number().int().min(1).max(30),
  tz: z.string().optional(),
});

export async function addManualClass(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;

  if (input.end <= input.start) {
    return { ok: false, message: "The class has to end after it starts." };
  }

  const { data: existing } = await supabase
    .from("modules")
    .select("id, name")
    .ilike("name", input.name)
    .limit(1);

  let moduleId = existing?.[0]?.id;
  if (!moduleId) {
    const { count } = await supabase
      .from("modules")
      .select("id", { count: "exact", head: true });
    const { data: created, error } = await supabase
      .from("modules")
      .insert({
        user_id: user.id,
        name: input.name,
        color_token: toneForIndex(count ?? 0),
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    moduleId = created.id;
  }

  const seriesId = crypto.randomUUID();
  const timeZone = zoneOrFallback(input.tz);
  const [sh, sm] = parseClock(input.start)!;
  const [eh, em] = parseClock(input.end)!;

  // First occurrence: the next matching weekday on the student's calendar,
  // today included. Built as wall-clock times in their zone — setHours() here
  // would use the server's UTC clock and put a 09:00 class at 14:30 in Pune.
  const today = wallToday(new Date(), timeZone);
  const first = addDays(today, (input.weekday - weekdayOf(today) + 7) % 7);

  const rows: TablesInsert<"class_sessions">[] = [];
  for (let w = 0; w < input.weeks; w++) {
    const day = addDays(first, w * 7);
    const startsAt = wallTimeToInstant({ ...day, hour: sh, minute: sm }, timeZone);
    const endsAt = wallTimeToInstant({ ...day, hour: eh, minute: em }, timeZone);

    rows.push({
      user_id: user.id,
      module_id: moduleId,
      series_id: seriesId,
      type: input.type,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      room: input.room || null,
      external_uid: `manual:${seriesId}:${w}`,
    });
  }

  const { error } = await supabase.from("class_sessions").insert(rows);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/timetable");
  revalidatePath("/");
  return { ok: true, message: `Added ${rows.length} classes.` };
}

export async function markAttendance(
  sessionId: string,
  status: Enums<"attendance_status">,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // A Server Action is a public POST endpoint, so sessionId is untrusted input.
  // RLS keeps the ROW we write scoped to this user, but it says nothing about
  // which session that row points AT. attendance_records is unique on
  // session_id, so without this check anyone could claim another student's
  // session and permanently block them from marking their own attendance on it.
  const { data: owned } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!owned) return;

  await supabase
    .from("attendance_records")
    .upsert(
      { user_id: user.id, session_id: sessionId, status, source: "manual" },
      { onConflict: "session_id" },
    );

  revalidatePath("/timetable");
  revalidatePath("/");
}
