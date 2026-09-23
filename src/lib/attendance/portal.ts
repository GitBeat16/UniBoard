import { z } from "zod";
import {
  askGroqJson,
  GroqError,
  groqClient,
  TEXT_MODEL,
  VISION_MODEL,
} from "@/lib/groq/json";

/**
 * The college's own attendance figures, read off its portal.
 *
 * Every college counts attendance itself, and its number is the one that
 * decides whether a student sits the exam. The app cannot see that page — it
 * is behind a login — so the student brings it: a screenshot, or the page's
 * text. What comes back is a subject and two numbers, which is all the maths
 * needs.
 */

const Row = z.object({
  subject: z.string(),
  code: z.string().nullable(),
  attended: z.number().int().min(0),
  held: z.number().int().min(0),
});

export const PortalReading = z.object({
  rows: z.array(Row),
  /** The date the page says the figures were taken, if it says. */
  asOf: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().nullable(),
});

export type PortalReading = z.infer<typeof PortalReading>;
export type PortalRow = z.infer<typeof Row>;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Subject name or abbreviation, as printed" },
          code: { type: ["string", "null"], description: "Subject code, if a column has one" },
          attended: { type: "integer", description: "Classes attended" },
          held: { type: "integer", description: "Classes held — the total, not the percentage" },
        },
        required: ["subject", "code", "attended", "held"],
        additionalProperties: false,
      },
    },
    asOf: { type: ["string", "null"], description: "YYYY-MM-DD if the page gives a date" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    notes: { type: ["string", "null"] },
  },
  required: ["rows", "asOf", "confidence", "notes"],
  additionalProperties: false,
} as const;

const SYSTEM = `You read attendance pages from university portals and return JSON.

Rules:
- One row per subject. Copy the subject exactly as printed, abbreviation and all.
- "attended" and "held" are counts of classes, never percentages. A cell like
  "32/40" is attended 32, held 40. "78%" alone is not enough — leave that row
  out and say so in notes.
- If attended and held are in separate columns, use them as they are.
- Ignore totals, averages and "overall" rows. Subjects only.
- If a subject appears twice, once for theory and once for practical, keep both
  rows as printed.
- asOf is the date the page says the figures are up to, as YYYY-MM-DD. Null if
  it does not say.
- Do not calculate, correct or fill in anything. If a number is unreadable,
  leave the row out and say so in notes.
- Return only the JSON object. No commentary, no markdown fences.`;

export async function readAttendanceImage({
  data,
  mediaType,
}: {
  /** base64, no newlines */
  data: string;
  mediaType: string;
}): Promise<PortalReading> {
  return askGroqJson({
    client: groqClient(),
    model: VISION_MODEL,
    schema: PortalReading,
    jsonSchema: JSON_SCHEMA,
    name: "attendance",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "Read the attendance figures from this page." },
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${data}` } },
        ],
      },
    ],
  });
}

export async function readAttendanceText(text: string): Promise<PortalReading> {
  if (text.trim().length < 40) {
    throw new GroqError("There was nothing to read on that page.");
  }
  return askGroqJson({
    client: groqClient(),
    model: TEXT_MODEL,
    schema: PortalReading,
    jsonSchema: JSON_SCHEMA,
    name: "attendance",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Read the attendance figures from this page.\n\n${text.slice(0, 40_000)}` },
    ],
  });
}
