import {
  addDays,
  parseClock,
  wallTimeToInstant,
  wallToday,
  weekdayOf,
  type WallDate,
} from "@/lib/time/zone";
import { extractText, getDocumentProxy } from "unpdf";
import {
  askGroqJson,
  GroqError,
  groqClient,
  TEXT_MODEL,
  VISION_MODEL,
} from "@/lib/groq/json";
import type { Enums } from "@/lib/supabase/database.types";
import {
  batchesIn,
  Grid,
  GRID_JSON_SCHEMA,
  gridToEntries,
  type TimetableGrid,
} from "./grid";

/**
 * Reading a timetable out of a photo or a PDF, via Groq.
 *
 * Two routes, because Groq's vision model takes images only:
 *
 *   image  -> qwen/qwen3.8-27b reads the grid directly
 *   PDF    -> text is extracted locally with unpdf, then a text model
 *             structures it. A scanned PDF has no text layer, so that case is
 *             reported honestly rather than silently returning nothing.
 *
 * University timetables are almost always a weekly grid rather than a list of
 * dated events, so the model is asked for the repeating pattern — weekday plus
 * times — and this module expands it across the term. An entry that does carry
 * an explicit date is honoured instead.
 *
 * Groq's structured outputs run in best-effort mode on these models: the schema
 * is a strong hint, not a guarantee. Everything that comes back is therefore
 * parsed and validated here, with one retry, rather than trusted.
 */

/** Below this many characters a PDF is almost certainly scanned, not digital. */
const MIN_PDF_TEXT = 120;

export const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const VISION_ACCEPT = [...SUPPORTED_IMAGE_TYPES, "application/pdf"].join(",");

/** A reading failure, as opposed to a fetching one. */
export class VisionError extends GroqError {}

/**
 * A timetable once it has been read: the classes themselves, and the batches
 * the grid splits its practicals between. Nothing here is parsed off the wire
 * — the model returns a grid, and `gridToEntries` builds this from it — so it
 * is a plain type rather than a schema.
 */
export type TimetableEntry = {
  moduleName: string;
  code: string | null;
  type: Enums<"session_type">;
  weekday: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  room: string | null;
  /** Which batches attend, or null when the whole class does. */
  batches: string[] | null;
};

export type TimetableExtraction = {
  entries: TimetableEntry[];
  confidence: "high" | "medium" | "low";
  notes: string | null;
  batches: string[];
};

const SYSTEM = `You transcribe university timetables into JSON. You are copying a
grid, not summarising it.

The grid has a row per time slot and a column per weekday.

Rules:
- "days" is the weekday headings, left to right, exactly as printed. Leave out
  a leading "Time" or "Period" column.
- One row per time row of the grid, top to bottom, including break rows.
- "cells" has one entry per weekday, in the same order as "days". Use an empty
  string for a blank cell. Never skip a cell — the count must match every time.
- Copy each cell's text as printed, including batch labels like E3 or G3 and
  anything in square brackets. Do not tidy, expand or translate it.
- If one cell holds two subjects for different batches, join them with " / ".
- If a cell is merged across several time rows, repeat its text in every row it
  covers.
- Times as printed, in HH:MM. A 12-hour grid stays 12-hour; it is read later.
- If a cell is unreadable, use an empty string and say so in notes.
- Set confidence to low if the image is blurred, cropped or partly illegible.
- Return only the JSON object. No commentary, no markdown fences.`;

export async function extractTimetable({
  data,
  mediaType,
}: {
  /** base64, no newlines */
  data: string;
  mediaType: string;
}): Promise<TimetableGrid> {
  const client = groqClient();

  if (mediaType === "application/pdf") {
    const text = await pdfToText(data);
    return askGroqJson({
      client,
      model: TEXT_MODEL,
      schema: Grid,
      jsonSchema: GRID_JSON_SCHEMA,
      name: "timetable",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Transcribe this timetable grid.\n\n${text}` },
      ],
    });
  }

  return askGroqJson({
    client,
    model: VISION_MODEL,
    schema: Grid,
    jsonSchema: GRID_JSON_SCHEMA,
    name: "timetable",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe this timetable grid." },
          // Groq takes local images as a base64 data URL.
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${data}` } },
        ],
      },
    ],
  });
}

/**
 * The grid as the rest of the app wants it: a flat list of classes, plus the
 * batches the student may have to choose between.
 *
 * The batch is passed in rather than filtered later, because a session split
 * by batch is also roomed by batch, and only the chosen one's room is theirs.
 */
export function fromGrid(
  grid: TimetableGrid,
  batch?: string | null,
): TimetableExtraction {
  const entries = gridToEntries(grid, { batch }).map((e) => ({ ...e, date: null }));
  return {
    entries,
    batches: batchesIn(grid),
    confidence: entries.length === 0 ? "low" : grid.confidence,
    notes: grid.notes,
  };
}

async function pdfToText(base64: string): Promise<string> {
  let text: string;
  try {
    const bytes = new Uint8Array(Buffer.from(base64, "base64"));
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  } catch {
    throw new VisionError("That PDF could not be opened.");
  }

  // A scanned timetable is an image in a PDF wrapper: there is no text layer to
  // read, and Groq's vision model cannot take PDFs. Say so instead of returning
  // an empty timetable and letting the student think it worked.
  if (text.trim().length < MIN_PDF_TEXT) {
    throw new VisionError(
      "That PDF has no readable text — it is probably a scan. Screenshot it and upload the image instead.",
    );
  }

  return text.slice(0, 40_000);
}

export type ExpandedSession = {
  uid: string;
  title: string;
  type: Enums<"session_type">;
  location: string | null;
  start: Date;
  end: Date;
};

/**
 * Turn the extracted weekly pattern into concrete occurrences.
 *
 * The uid is derived from the pattern rather than a random value, so
 * re-uploading the same timetable updates those rows instead of duplicating
 * the whole term. It has to name the slot completely — module, type, day and
 * times — because one module usually meets at the same hour on more than one
 * day, and two slots sharing a uid would collide on import.
 */
export function expandExtraction(
  extraction: TimetableExtraction,
  { weeks, from, timeZone }: { weeks: number; from: Date; timeZone: string },
): ExpandedSession[] {
  const out: ExpandedSession[] = [];

  // Monday of the starting week, on the student's wall calendar — not the
  // server's, which runs in UTC and would put every class 5½ hours late.
  const today = wallToday(from, timeZone);
  const weekStart = addDays(today, -((weekdayOf(today) + 6) % 7));

  // A photo can be read twice — the same row picked up from two columns of a
  // grid, say. Identical slots are the same class, so the second one is dropped
  // rather than fighting the first for the same uid.
  const seen = new Set<string>();

  for (const entry of extraction.entries) {
    const start = parseClock(entry.startTime);
    const end = parseClock(entry.endTime);
    if (!start || !end) continue;

    const when = entry.date ?? (entry.weekday === null ? null : `d${entry.weekday}`);
    if (!when) continue;

    const key = [
      entry.code ?? entry.moduleName,
      entry.type,
      when,
      entry.startTime,
      entry.endTime,
    ]
      .join("|")
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (seen.has(key)) continue;
    seen.add(key);

    if (entry.date) {
      const m = entry.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) continue;
      const day = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
      const slot = makeSlot(day, start, end, timeZone);
      if (!slot) continue;
      out.push({
        uid: `vision:${key}`,
        title: entry.moduleName,
        type: entry.type,
        location: entry.room,
        ...slot,
      });
      continue;
    }

    if (entry.weekday === null) continue;

    for (let w = 0; w < weeks; w++) {
      const day = addDays(weekStart, w * 7 + ((entry.weekday + 6) % 7));
      const slot = makeSlot(day, start, end, timeZone);
      if (!slot) continue;
      out.push({
        uid: `vision:${key}:w${w}`,
        title: entry.moduleName,
        type: entry.type,
        location: entry.room,
        ...slot,
      });
    }
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function makeSlot(
  day: WallDate,
  [sh, sm]: [number, number],
  [eh, em]: [number, number],
  timeZone: string,
) {
  const start = wallTimeToInstant({ ...day, hour: sh, minute: sm }, timeZone);
  const end = wallTimeToInstant({ ...day, hour: eh, minute: em }, timeZone);
  // A class that ends before it starts is a misread, not a midnight class.
  if (end.getTime() <= start.getTime()) return null;
  return { start, end };
}
