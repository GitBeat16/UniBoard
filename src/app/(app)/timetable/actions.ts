"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchIcs, IcsFetchError } from "@/lib/ics/fetch";
import { parseIcs } from "@/lib/ics/parse";
import {
  expandExtraction,
  extractTimetable,
  fromGrid,
  SUPPORTED_IMAGE_TYPES,
} from "@/lib/ics/vision";
import { batchesIn, Grid, type TimetableGrid } from "@/lib/ics/grid";
import { seriesIdFor, seriesKeyOf } from "@/lib/ics/series";
import { matchRows } from "@/lib/attendance/match";
import { parseSubjectEdit, sameName } from "@/lib/attendance/subject-form";
import {
  readAttendanceImage,
  readAttendanceText,
  type PortalReading,
} from "@/lib/attendance/portal";
import { fetchPageText, looksLikeSignIn } from "@/lib/attendance/fetch-page";
import { GroqError } from "@/lib/groq/json";
import { extractModule, moduleKey, toneForIndex } from "@/lib/ics/module-map";
import {
  addDays,
  parseClock,
  wallTimeToInstant,
  wallToday,
  weekdayOf,
  zonedParts,
  zoneOrFallback,
} from "@/lib/time/zone";
import type { Enums, TablesInsert } from "@/lib/supabase/database.types";

export type ActionState = {
  ok: boolean;
  message: string;
  /**
   * Set when the timetable splits practicals between batches and the student
   * has not said which is theirs. The grid travels back with the question so
   * answering it costs nothing — the photo is read once, not once per answer.
   */
  ask?: { batches: string[]; grid: string; weeks: number };
} | null;

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
  // A photo is a whole weekly pattern, not an addition to one, so a second
  // upload replaces what the last one put in the diary.
  let fromPhoto = false;

  const batch = String(formData.get("batch") ?? "").trim() || null;
  const answered = readGrid(formData.get("grid"));

  try {
    if (answered || (file instanceof File && file.size > 0 && isVisionFile(file.type))) {
      fromPhoto = true;

      // Either the photo is being read for the first time, or the student has
      // just picked their batch and the grid has come back with the answer.
      let grid: TimetableGrid;
      if (answered) {
        grid = answered;
      } else {
        const photo = file as File;
        if (photo.size > MAX_UPLOAD) {
          return { ok: false, message: "That file is too large (4 MB max)." };
        }
        const data = Buffer.from(await photo.arrayBuffer()).toString("base64");
        grid = await extractTimetable({ data, mediaType: photo.type });
      }

      // Practicals split by batch: importing all four would fill the week with
      // classes she does not attend, so ask before writing anything.
      const batches = batchesIn(grid);
      if (batches.length > 1 && (!batch || !batches.includes(batch))) {
        return {
          ok: false,
          message: "This timetable is split into batches. Which one are you in?",
          ask: { batches, grid: JSON.stringify(grid), weeks },
        };
      }

      const extraction = fromGrid(grid, batch);
      incoming = expandExtraction(extraction, { weeks, from: new Date(), timeZone });
      if (batch) notes.push(`batch ${batch} only`);

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
    // GroqError covers VisionError too, so a rejected key or a rate limit
    // reaches her as itself rather than as "could not read that timetable".
    if (error instanceof IcsFetchError || error instanceof GroqError) {
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

  // Keyed by external_uid: Postgres refuses an upsert whose batch names the
  // same row twice ("ON CONFLICT DO UPDATE command cannot affect row a second
  // time"), and a messy feed or a photo read twice can do exactly that. The
  // last reading of a slot wins.
  const byUid = new Map<string, TablesInsert<"class_sessions">>();
  for (const [key, group] of groups) {
    const moduleId = byKey.get(key);
    if (!moduleId) continue;
    for (const s of group.sessions) {
      byUid.set(s.uid, {
        user_id: user.id,
        module_id: moduleId,
        // Every week of one slot shares a series, so "every week" can find
        // them later without guessing from times.
        series_id: seriesIdFor(user.id, seriesKeyOf(s.uid)),
        type: s.type,
        starts_at: s.start.toISOString(),
        ends_at: s.end.toISOString(),
        room: s.location ?? null,
        external_uid: s.uid,
      });
    }
  }
  const sessionRows = [...byUid.values()];

  for (let i = 0; i < sessionRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("class_sessions")
      .upsert(sessionRows.slice(i, i + CHUNK), { onConflict: "user_id,external_uid" });
    if (error) return { ok: false, message: error.message };
  }

  if (fromPhoto) {
    const stale = await clearReplacedPhotoClasses(supabase, user.id, new Set(byUid.keys()));
    if (stale > 0) notes.push(`${stale} classes from an earlier photo were replaced`);
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

/** A YYYY-MM-DD day from the timetable, as a wall date. */
function dayFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

/** The grid the batch question sent back, if this is the answer to it. */
function readGrid(value: FormDataEntryValue | null): TimetableGrid | null {
  if (typeof value !== "string" || value.length === 0) return null;
  // It has been through the browser, so it is checked, not trusted.
  if (value.length > 200_000) return null;
  try {
    const parsed = Grid.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Drop the classes a previous photo import left behind.
 *
 * Only ones still to come: a class that has already happened may carry an
 * attendance mark, and that mark is the student's, not the timetable's.
 */
async function clearReplacedPhotoClasses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keep: Set<string>,
): Promise<number> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, external_uid")
    .eq("user_id", userId)
    .like("external_uid", "vision:%")
    .gt("starts_at", new Date().toISOString());
  if (error || !data) return 0;

  const ids = data.filter((s) => s.external_uid && !keep.has(s.external_uid)).map((s) => s.id);
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error: removeError } = await supabase
      .from("class_sessions")
      .delete()
      .eq("user_id", userId)
      .in("id", ids.slice(i, i + CHUNK));
    if (removeError) return 0;
  }
  return ids.length;
}

const manualSchema = z.object({
  name: z.string().trim().min(2, "Give the module a name."),
  type: z.enum(["lecture", "lab", "seminar", "tutorial", "workshop", "other"]),
  room: z.string().trim().max(80).optional(),
  weekday: z.coerce.number().int().min(0).max(6).optional(),
  /** A day picked on the timetable, when the class is being added to one. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
  if (input.weekday === undefined && !input.date) {
    return { ok: false, message: "Say which day the class is on." };
  }

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

  // First occurrence: the day she picked on the timetable, or the next
  // matching weekday on her calendar, today included. Built as wall-clock
  // times in her zone — setHours() here would use the server's UTC clock and
  // put a 09:00 class at 14:30 in Pune.
  const today = wallToday(new Date(), timeZone);
  const first = input.date
    ? dayFromKey(input.date)
    : addDays(today, ((input.weekday ?? weekdayOf(today)) - weekdayOf(today) + 7) % 7);

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
  return {
    ok: true,
    message: rows.length === 1 ? "Class added." : `Added ${rows.length} classes.`,
  };
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

const editSchema = z.object({
  id: z.string().uuid(),
  moduleId: z.string().uuid(),
  type: z.enum(["lecture", "lab", "seminar", "tutorial", "workshop", "other"]),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Start time looks wrong."),
  end: z.string().regex(/^\d{2}:\d{2}$/, "End time looks wrong."),
  room: z.string().trim().max(80).optional(),
  /** "one" is this class; "series" is this one and every later week of it. */
  scope: z.enum(["one", "series"]).default("one"),
  tz: z.string().optional(),
});

/**
 * Change a class.
 *
 * A photographed timetable is read well but not perfectly, and a university
 * moves a class now and then, so every class has to be correctable by hand —
 * either this one instance or the whole weekly slot from here on.
 *
 * Earlier weeks are never touched. Attendance hangs off the classes that have
 * already happened, and rewriting their times would quietly rewrite her record
 * of the term.
 */
export async function updateClass(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;
  if (input.end <= input.start) {
    return { ok: false, message: "The class has to end after it starts." };
  }

  const targets = await siblingsOf(supabase, user.id, input.id, input.scope);
  if (targets.length === 0) return { ok: false, message: "That class is no longer there." };

  // The module has to be the student's own: a Server Action is a public
  // endpoint, and RLS scopes the row we write, not the row we point at.
  const { data: module } = await supabase
    .from("modules")
    .select("id")
    .eq("id", input.moduleId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!module) return { ok: false, message: "Pick a module from your own list." };

  const timeZone = zoneOrFallback(input.tz);
  const [sh, sm] = parseClock(input.start)!;
  const [eh, em] = parseClock(input.end)!;

  for (const target of targets) {
    // Each week keeps its own date and takes the new wall-clock time, so a
    // class moved to 11:00 is 11:00 in Pune every week, not 11:00 in UTC.
    const on = zonedParts(new Date(target.starts_at), timeZone);
    const day = { year: on.year, month: on.month, day: on.day };
    const startsAt = wallTimeToInstant({ ...day, hour: sh, minute: sm }, timeZone);
    const endsAt = wallTimeToInstant({ ...day, hour: eh, minute: em }, timeZone);

    const { error } = await supabase
      .from("class_sessions")
      .update({
        module_id: input.moduleId,
        type: input.type,
        room: input.room || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .eq("id", target.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/timetable");
  revalidatePath("/");
  return {
    ok: true,
    message: targets.length === 1 ? "Class updated." : `Updated ${targets.length} weeks.`,
  };
}

/** Remove a class, or the whole weekly slot from this week on. */
export async function deleteClass(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const id = String(formData.get("id") ?? "");
  const scope = formData.get("scope") === "series" ? "series" : "one";
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, message: "That class is no longer there." };
  }

  const targets = await siblingsOf(supabase, user.id, id, scope);
  if (targets.length === 0) return { ok: false, message: "That class is no longer there." };

  const { error } = await supabase
    .from("class_sessions")
    .delete()
    .eq("user_id", user.id)
    .in("id", targets.map((t) => t.id));
  if (error) return { ok: false, message: error.message };

  revalidatePath("/timetable");
  revalidatePath("/");
  return {
    ok: true,
    message: targets.length === 1 ? "Class removed." : `Removed ${targets.length} weeks.`,
  };
}

/**
 * The classes an edit applies to: just this one, or this one and every later
 * week of the same slot.
 *
 * A slot is normally a series id, set at import. Anything older than that —
 * or typed in before series ids existed — is matched on what makes a slot a
 * slot: same module, same type, same weekday, same time of day.
 */
async function siblingsOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: string,
  scope: "one" | "series",
) {
  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, module_id, type, series_id, starts_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!session) return [];
  if (scope === "one") return [session];

  const query = supabase
    .from("class_sessions")
    .select("id, module_id, type, series_id, starts_at")
    .eq("user_id", userId)
    .gte("starts_at", session.starts_at);

  const { data: later } = session.series_id
    ? await query.eq("series_id", session.series_id)
    : await query.eq("module_id", session.module_id).eq("type", session.type);

  if (session.series_id) return later ?? [session];

  // Without a series id, keep only the ones on the same weekday at the same
  // time — the same slot, week after week.
  const at = new Date(session.starts_at);
  return (later ?? []).filter((s) => {
    const d = new Date(s.starts_at);
    return d.getUTCDay() === at.getUTCDay() && d.getUTCHours() === at.getUTCHours()
      && d.getUTCMinutes() === at.getUTCMinutes();
  });
}

/**
 * Import the college's own attendance figures.
 *
 * The app can only count the classes it knows about, which starts the day the
 * timetable is imported. The college has been counting since the term began,
 * and its number is the one that decides whether she sits the exam — so it is
 * taken as the opening balance, and everything marked after that day is added
 * to it.
 *
 * A portal page is behind a login, so a screenshot is the route that works. A
 * link is accepted too, and says so honestly when it lands on a sign-in page.
 */
export async function importAttendance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const file = formData.get("file");
  const url = String(formData.get("url") ?? "").trim();
  const asOfRaw = String(formData.get("asOf") ?? "").trim();
  const timeZone = zoneOrFallback(formData.get("tz"));

  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(asOfRaw) ? asOfRaw : todayIn(timeZone);
  if (asOf > todayIn(timeZone)) {
    return { ok: false, message: "That date is in the future." };
  }

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("id, name, code");
  if (modulesError) return { ok: false, message: modulesError.message };
  if (!modules || modules.length === 0) {
    return { ok: false, message: "Import your timetable first, so there is something to match to." };
  }

  let reading: PortalReading;
  let source: string;
  try {
    if (file instanceof File && file.size > 0) {
      if (!isVisionFile(file.type)) {
        return { ok: false, message: "Upload a screenshot of the attendance page." };
      }
      if (file.size > MAX_UPLOAD) {
        return { ok: false, message: "That file is too large (4 MB max)." };
      }
      const data = Buffer.from(await file.arrayBuffer()).toString("base64");
      reading = await readAttendanceImage({ data, mediaType: file.type });
      source = "photo";
    } else if (url) {
      const text = await fetchPageText(url);
      if (looksLikeSignIn(text)) {
        return {
          ok: false,
          message:
            "That link asked us to sign in, so there were no figures on it. A screenshot of the page works.",
        };
      }
      reading = await readAttendanceText(text);
      source = "link";
    } else {
      return { ok: false, message: "Upload a screenshot, or paste a link to the page." };
    }
  } catch (error) {
    if (error instanceof IcsFetchError || error instanceof GroqError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Could not read that attendance page." };
  }

  const targets = modules.map((m) => ({ moduleId: m.id, name: m.name, code: m.code }));
  const { matched, unmatched } = matchRows(reading.rows, targets);

  if (matched.length === 0) {
    return {
      ok: false,
      message:
        reading.rows.length === 0
          ? "No attendance figures on that page. It needs the counts, not just percentages."
          : "None of those subjects matched your modules. Rename a module to match the portal and try again.",
    };
  }

  // The page may carry its own date; the student's answer wins over ours only
  // when they gave one.
  const effective = asOfRaw ? asOf : /^\d{4}-\d{2}-\d{2}$/.test(reading.asOf ?? "") ? reading.asOf! : asOf;

  for (const m of matched) {
    const { error } = await supabase
      .from("modules")
      .update({
        official_attended: m.attended,
        official_held: m.held,
        official_as_of: effective,
        official_source: source,
      })
      .eq("id", m.moduleId)
      .eq("user_id", user.id);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/timetable");
  revalidatePath("/");

  const notes: string[] = [];
  if (unmatched.length > 0) {
    notes.push(`no module matched ${unmatched.map((r) => r.subject).join(", ")}`);
  }
  if (reading.confidence !== "high") {
    notes.push(`read with ${reading.confidence} confidence — worth a check`);
  }
  if (reading.notes) notes.push(reading.notes);

  return {
    ok: true,
    message:
      `Took ${matched.length} ${matched.length === 1 ? "subject" : "subjects"} from your college, as of ${effective}` +
      (notes.length ? ` (${notes.join("; ")}).` : "."),
  };
}

/** Today on the student's calendar, as YYYY-MM-DD. */
function todayIn(timeZone: string) {
  const d = wallToday(new Date(), timeZone);
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

/**
 * Correct a subject: its name, code, colour, threshold, or the college's
 * attendance figure for it.
 *
 * A photo is read well but not perfectly, and an attendance screenshot the
 * same — so every subject has to be fixable by hand. A figure typed here is
 * recorded as the student's own ("hand"), so it is clear where it came from.
 */
export async function updateSubject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "That subject is gone." };

  const timeZone = zoneOrFallback(formData.get("tz"));
  const fields = Object.fromEntries(
    [...formData.entries()].map(([k, v]) => [k, typeof v === "string" ? v : undefined]),
  );
  const parsed = parseSubjectEdit(fields, todayIn(timeZone));
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const edit = parsed.value;

  const { data: mine } = await supabase.from("modules").select("id, name, official_attended, official_held, official_as_of");
  const current = mine?.find((m) => m.id === id);
  if (!current) return { ok: false, message: "That subject is gone." };

  // Renaming onto another subject's name would leave two of the same: that is
  // a merge, and it should be one on purpose.
  const clash = mine?.find((m) => m.id !== id && sameName(m.name, edit.name));
  if (clash) {
    return {
      ok: false,
      message: `You already have ${clash.name}. Merge this into it instead.`,
    };
  }

  const officialChanged =
    (edit.official?.attended ?? null) !== current.official_attended ||
    (edit.official?.held ?? null) !== current.official_held ||
    (edit.official?.asOf ?? null) !== current.official_as_of;

  const { error } = await supabase
    .from("modules")
    .update({
      name: edit.name,
      code: edit.code,
      color_token: edit.tone,
      threshold: edit.threshold,
      official_attended: edit.official?.attended ?? null,
      official_held: edit.official?.held ?? null,
      official_as_of: edit.official?.asOf ?? null,
      // Only re-label the source when the figure itself was touched.
      ...(officialChanged ? { official_source: edit.official ? "hand" : null } : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/timetable");
  revalidatePath("/");
  return { ok: true, message: `${edit.name} saved.` };
}

/** Fold a misread duplicate into the real subject — classes, marks and all. */
export async function mergeSubject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const from = String(formData.get("id") ?? "");
  const into = String(formData.get("into") ?? "");
  const uuid = z.string().uuid();
  if (!uuid.safeParse(from).success || !uuid.safeParse(into).success) {
    return { ok: false, message: "Pick the subject to merge into." };
  }

  // One database function, one transaction: see merge_modules.sql.
  const { data: moved, error } = await supabase.rpc("merge_modules", { p_from: from, p_into: into });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/timetable");
  revalidatePath("/");
  revalidatePath("/board");
  return {
    ok: true,
    message: `Merged — ${moved ?? 0} ${moved === 1 ? "class" : "classes"} moved across.`,
  };
}

/**
 * Remove a subject that should not exist at all.
 *
 * Its classes and their marks go with it; hand-ins and exams stay, just
 * unlinked. The sheet asks twice before calling this.
 */
export async function deleteSubject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in." };

  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "That subject is gone." };

  const { data: removed, error } = await supabase
    .from("modules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("name");
  if (error) return { ok: false, message: error.message };
  if (!removed?.length) return { ok: false, message: "That subject is gone." };

  revalidatePath("/timetable");
  revalidatePath("/");
  revalidatePath("/board");
  return { ok: true, message: `${removed[0].name} removed.` };
}

/** Take a mark back off a class, so it counts as unmarked again. */
export async function clearAttendance(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Scoped by both ids: RLS already limits the row to this student, and the
  // session check matches markAttendance's, so the two stay symmetrical.
  await supabase
    .from("attendance_records")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  revalidatePath("/timetable");
  revalidatePath("/");
}
