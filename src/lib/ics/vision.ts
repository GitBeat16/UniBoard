import Groq from "groq-sdk";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import type { Enums } from "@/lib/supabase/database.types";

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

/** The only Groq model that accepts images. */
const VISION_MODEL = "qwen/qwen3.8-27b";
/** Used for the text extracted out of a PDF. */
const TEXT_MODEL = "openai/gpt-oss-120b";

/** Below this many characters a PDF is almost certainly scanned, not digital. */
const MIN_PDF_TEXT = 120;

export const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const VISION_ACCEPT = [...SUPPORTED_IMAGE_TYPES, "application/pdf"].join(",");

export class VisionError extends Error {}

const SessionType = z.enum([
  "lecture",
  "lab",
  "seminar",
  "tutorial",
  "workshop",
  "other",
]);

const Entry = z.object({
  moduleName: z.string(),
  code: z.string().nullable(),
  type: SessionType,
  weekday: z.number().int().min(0).max(6).nullable(),
  date: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  room: z.string().nullable(),
});

const Extraction = z.object({
  entries: z.array(Entry),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().nullable(),
});

export type TimetableExtraction = z.infer<typeof Extraction>;

/** Mirrors the Zod schema above; Groq wants JSON Schema on the wire. */
const JSON_SCHEMA = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          moduleName: {
            type: "string",
            description: "Module or subject name, without the session type",
          },
          code: { type: ["string", "null"], description: "e.g. CS2004, or null" },
          type: {
            type: "string",
            enum: ["lecture", "lab", "seminar", "tutorial", "workshop", "other"],
          },
          weekday: {
            type: ["integer", "null"],
            description: "0=Sunday … 6=Saturday. Null only when date is given",
          },
          date: {
            type: ["string", "null"],
            description: "YYYY-MM-DD, only if a specific date is shown",
          },
          startTime: { type: "string", description: "24-hour HH:MM" },
          endTime: { type: "string", description: "24-hour HH:MM" },
          room: { type: ["string", "null"] },
        },
        required: [
          "moduleName",
          "code",
          "type",
          "weekday",
          "date",
          "startTime",
          "endTime",
          "room",
        ],
        additionalProperties: false,
      },
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    notes: { type: ["string", "null"] },
  },
  required: ["entries", "confidence", "notes"],
  additionalProperties: false,
} as const;

const SYSTEM = `You read university timetables and return JSON.

Rules:
- Extract every scheduled class you can see. Do not invent entries.
- A weekly grid repeats: give weekday plus times, and leave date null.
- Only set date when the timetable shows a specific calendar date.
- Times are 24-hour HH:MM. If a cell spans two slots, use the full span.
- Strip session-type words out of moduleName ("Databases", not "Databases Lecture").
- If something is unreadable, leave it out and say so in notes rather than guessing.
- Set confidence to low if the source is blurred, cropped, or partly illegible.
- Return only the JSON object. No commentary, no markdown fences.`;

export async function extractTimetable({
  data,
  mediaType,
}: {
  /** base64, no newlines */
  data: string;
  mediaType: string;
}): Promise<TimetableExtraction> {
  if (!process.env.GROQ_API_KEY) {
    throw new VisionError(
      "Reading images and PDFs needs a GROQ_API_KEY in .env.local. A calendar link or .ics file works without one.",
    );
  }

  const client = new Groq();

  if (mediaType === "application/pdf") {
    const text = await pdfToText(data);
    return callGroq(client, TEXT_MODEL, [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Extract every class from this timetable.\n\n${text}`,
      },
    ]);
  }

  return callGroq(client, VISION_MODEL, [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract every class from this timetable." },
        // Groq takes local images as a base64 data URL.
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${data}` } },
      ],
    },
  ]);
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

async function callGroq(
  client: Groq,
  model: string,
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
  attempt = 1,
): Promise<TimetableExtraction> {
  let raw: string | null | undefined;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0,
      max_completion_tokens: 8000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "timetable", schema: JSON_SCHEMA },
      },
    });
    raw = completion.choices[0]?.message?.content;
  } catch (error) {
    throw asVisionError(error);
  }

  if (!raw) throw new VisionError("The model returned nothing to read.");

  const parsed = parseExtraction(raw);
  if (parsed) return parsed;

  // Best-effort mode can return valid JSON in the wrong shape. One retry with
  // the failure pointed out is cheap and usually enough.
  if (attempt === 1) {
    return callGroq(
      client,
      model,
      [
        ...messages,
        { role: "assistant", content: raw },
        {
          role: "user",
          content:
            "That did not match the required schema. Return only the JSON object, with every required field present.",
        },
      ],
      2,
    );
  }

  throw new VisionError(
    "Could not read a timetable out of that file. A straight-on, uncropped image reads best.",
  );
}

function parseExtraction(raw: string): TimetableExtraction | null {
  // Some models still wrap JSON in a markdown fence despite being told not to.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return null;
  }

  const result = Extraction.safeParse(json);
  return result.success ? result.data : null;
}

function asVisionError(error: unknown): VisionError {
  if (error instanceof Groq.AuthenticationError) {
    return new VisionError("That GROQ_API_KEY was rejected.");
  }
  if (error instanceof Groq.RateLimitError) {
    return new VisionError("Groq rate limited the request. Try again shortly.");
  }
  if (error instanceof Groq.BadRequestError) {
    return new VisionError(`Groq rejected the request: ${error.message}`);
  }
  if (error instanceof Groq.APIConnectionError) {
    return new VisionError("Could not reach Groq.");
  }
  if (error instanceof Groq.APIError) {
    return new VisionError(`Groq returned ${error.status}.`);
  }
  return new VisionError("Could not read that file.");
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
 * the whole term.
 */
export function expandExtraction(
  extraction: TimetableExtraction,
  { weeks, from }: { weeks: number; from: Date },
): ExpandedSession[] {
  const out: ExpandedSession[] = [];

  // Monday of the starting week.
  const weekStart = new Date(from);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  for (const entry of extraction.entries) {
    const [sh, sm] = entry.startTime.split(":").map(Number);
    const [eh, em] = entry.endTime.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) continue;

    const key = `${entry.code ?? entry.moduleName}|${entry.type}|${entry.startTime}`
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (entry.date) {
      const day = new Date(`${entry.date}T00:00:00`);
      if (Number.isNaN(day.getTime())) continue;
      const slot = makeSlot(day, sh, sm, eh, em);
      if (!slot) continue;
      out.push({
        uid: `vision:${key}:${entry.date}`,
        title: entry.moduleName,
        type: entry.type,
        location: entry.room,
        ...slot,
      });
      continue;
    }

    if (entry.weekday === null) continue;

    for (let w = 0; w < weeks; w++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + w * 7 + ((entry.weekday + 6) % 7));
      const slot = makeSlot(day, sh, sm, eh, em);
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

function makeSlot(day: Date, sh: number, sm: number, eh: number, em: number) {
  const start = new Date(day);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(day);
  end.setHours(eh, em, 0, 0);
  // A class that ends before it starts is a misread, not a midnight class.
  if (end.getTime() <= start.getTime()) return null;
  return { start, end };
}
