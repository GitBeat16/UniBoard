import { z } from "zod";
import type { Enums } from "@/lib/supabase/database.types";

/**
 * Turning a photographed timetable grid into classes.
 *
 * Asking a model for a flat list of classes reads badly: a university grid has
 * merged cells, break rows, and cells holding two subjects for different
 * batches, and anything the model loses track of simply never appears — a
 * whole weekday can go missing without a word. So it is asked for the grid
 * instead, cell by cell, with a row per time slot and a column per weekday.
 * An unreadable cell then comes back empty rather than absent, and everything
 * that needs judgement — merged slots, batches, rooms, session types — happens
 * here, where it can be tested.
 */

export const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const Row = z.object({
  startTime: z.string(),
  endTime: z.string(),
  cells: z.array(z.string().nullable()),
});

export const Grid = z.object({
  days: z.array(z.string()),
  rows: z.array(Row),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().nullable(),
});

export type TimetableGrid = z.infer<typeof Grid>;

/** Mirrors the Zod schema above; Groq wants JSON Schema on the wire. */
export const GRID_JSON_SCHEMA = {
  type: "object",
  properties: {
    days: {
      type: "array",
      description: "The weekday column headings, left to right, as printed",
      items: { type: "string" },
    },
    rows: {
      type: "array",
      description: "One per time row of the grid, top to bottom",
      items: {
        type: "object",
        properties: {
          startTime: { type: "string", description: "24-hour HH:MM" },
          endTime: { type: "string", description: "24-hour HH:MM" },
          cells: {
            type: "array",
            description:
              "One entry per column in days, same order. Empty string for a blank cell.",
            items: { type: ["string", "null"] },
          },
        },
        required: ["startTime", "endTime", "cells"],
        additionalProperties: false,
      },
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    notes: { type: ["string", "null"] },
  },
  required: ["days", "rows", "confidence", "notes"],
  additionalProperties: false,
} as const;

export type GridEntry = {
  moduleName: string;
  code: string | null;
  type: Enums<"session_type">;
  weekday: number;
  startTime: string;
  endTime: string;
  room: string | null;
  /** Batch labels this class is for, or null when the whole class attends. */
  batches: string[] | null;
};

const BREAK = /\b(break|lunch|recess|interval)\b/i;
/** A batch label as timetables print them: E3, G3, B2, A. */
const BATCH = /^[A-Z]{1,2}\d{0,2}$/;
/** A room as timetables print them: A1-213, LT4, 311. */
const ROOM_HINT = /\d/;

/**
 * Batch labels used anywhere in the grid.
 *
 * Checked across the whole grid rather than cell by cell: a single odd token
 * in one cell is far more likely to be part of a subject's name, while a real
 * batch split names the same handful of labels over and over.
 */
export function batchesIn(grid: TimetableGrid): string[] {
  const counts = new Map<string, number>();

  for (const row of grid.rows) {
    for (const cell of row.cells) {
      for (const segment of segmentsOf(cell ?? "")) {
        for (const label of candidateBatches(segment)) {
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
      }
    }
  }

  // One label on its own is a subject's name, not a split. Two or more, each
  // appearing more than once, is a timetable divided into batches.
  const found = [...counts.entries()].filter(([, n]) => n > 1).map(([label]) => label);
  return found.length > 1 ? found.sort() : [];
}

/**
 * Flatten the grid into classes.
 *
 * `batch` keeps only the classes that batch attends; without it every class is
 * kept, which is right for a timetable that is not split.
 */
export function gridToEntries(
  grid: TimetableGrid,
  { batch }: { batch?: string | null } = {},
): GridEntry[] {
  const known = new Set(batchesIn(grid));
  const columns = grid.days.map(weekdayOfHeading);
  const rows = asDayOrder(grid.rows);
  const out: GridEntry[] = [];

  for (let c = 0; c < columns.length; c++) {
    const weekday = columns[c];
    if (weekday === null) continue;

    for (const run of runsInColumn(rows, c)) {
      for (const segment of segmentsOf(run.text)) {
        const parsed = parseSegment(segment, known);
        if (!parsed) continue;
        if (batch && parsed.batches && !parsed.batches.includes(batch)) continue;

        out.push({
          ...parsed,
          weekday,
          startTime: run.startTime,
          endTime: run.endTime,
          room: parsed.roomFor(batch ?? null),
        });
      }
    }
  }

  return out;
}

/**
 * The runs of one column: consecutive rows holding the same class.
 *
 * A cell merged down the grid is asked for once per row it covers, so the same
 * text twice in a row is one long class — a two-hour lab — not two.
 */
function runsInColumn(rows: TimetableGrid["rows"], column: number) {
  const runs: Array<{ text: string; startTime: string; endTime: string }> = [];

  for (const row of rows) {
    const text = (row.cells[column] ?? "").trim();
    if (!text || BREAK.test(text)) continue;
    if (!isClock(row.startTime) || !isClock(row.endTime)) continue;

    const last = runs.at(-1);
    if (last && sameClass(last.text, text) && last.endTime === row.startTime) {
      last.endTime = row.endTime;
      continue;
    }
    runs.push({ text, startTime: row.startTime, endTime: row.endTime });
  }

  return runs;
}

/**
 * Put the rows on a 24-hour clock.
 *
 * Timetables print the afternoon as "01:45 to 02:45", and a model transcribing
 * faithfully hands that straight back — which would file the whole afternoon
 * in the small hours. The grid runs down the day, so a row that appears to
 * start before the one above it is read twelve hours later instead.
 */
export function asDayOrder(rows: TimetableGrid["rows"]): TimetableGrid["rows"] {
  let floor = 0;

  return rows.map((row) => {
    const start = minutesOf(row.startTime);
    const end = minutesOf(row.endTime);
    if (start === null || end === null) return row;

    const from = start >= floor ? start : start + 12 * 60 >= floor ? start + 12 * 60 : start;
    const to = end > from ? end : end + 12 * 60 > from ? end + 12 * 60 : end;
    floor = Math.max(floor, from);

    return { ...row, startTime: clockOf(from), endTime: clockOf(to) };
  });
}

function minutesOf(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

function clockOf(total: number) {
  const minutes = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Two cells hold the same class if their text matches once tidied. */
function sameClass(a: string, b: string) {
  const tidy = (s: string) => s.toLowerCase().replace(/[\s,]+/g, " ").trim();
  return tidy(a) === tidy(b);
}

/** A cell can hold a class per batch: "COAL E3 F3 / DSL G3 H3". */
function segmentsOf(cell: string): string[] {
  return cell
    .split(/\s*[/|]\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !BREAK.test(s));
}

/** Tokens in a segment that look like batch labels. */
function candidateBatches(segment: string): string[] {
  const withoutRooms = segment.replace(/\[[^\]]*\]/g, " ");
  const tokens = withoutRooms.split(/[\s,]+/).filter(Boolean);
  // The first token is the subject, however much it looks like a label.
  return tokens.slice(1).filter((t) => BATCH.test(t.toUpperCase()) && /\d/.test(t));
}

type ParsedSegment = {
  moduleName: string;
  code: string | null;
  type: Enums<"session_type">;
  batches: string[] | null;
  roomFor: (batch: string | null) => string | null;
};

function parseSegment(segment: string, known: Set<string>): ParsedSegment | null {
  const bracket = segment.match(/\[([^\]]*)\]/);
  const rooms = bracket ? parseRooms(bracket[1]) : { shared: null, byBatch: new Map() };

  const body = segment.replace(/\[[^\]]*\]/g, " ").trim();
  const tokens = body.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const batches: string[] = [];
  const nameParts: string[] = [];
  for (const [i, token] of tokens.entries()) {
    const label = token.toUpperCase();
    // A label only counts as a batch if the grid uses it as one elsewhere, and
    // never in first place, where it is the subject.
    if (i > 0 && known.has(label)) batches.push(label);
    else nameParts.push(token);
  }

  const name = nameParts.join(" ").trim();
  if (!name) return null;

  return {
    moduleName: tidyName(name),
    code: null,
    type: typeOf(name, batches.length > 0),
    batches: batches.length > 0 ? batches : null,
    roomFor: (batch) => (batch && rooms.byBatch.get(batch)) || rooms.shared,
  };
}

/**
 * Rooms inside the brackets.
 *
 * Usually one for everybody — "[A1-213]" — but a session split by batch lists
 * one each: "[E3-A1-213 F3-A1-111 G3-A1-311]".
 */
function parseRooms(inside: string) {
  const byBatch = new Map<string, string>();
  const loose: string[] = [];

  for (const token of inside.split(/[\s,;]+/).filter(Boolean)) {
    const m = token.match(/^([A-Z]{1,2}\d{1,2})-(.+)$/i);
    if (m && BATCH.test(m[1].toUpperCase()) && ROOM_HINT.test(m[2])) {
      byBatch.set(m[1].toUpperCase(), m[2]);
    } else {
      loose.push(token);
    }
  }

  return { shared: loose.length > 0 ? loose.join(" ") : null, byBatch };
}

const TYPE_WORDS: Array<[RegExp, Enums<"session_type">]> = [
  [/\b(tut|tutorial)\b/i, "tutorial"],
  [/\b(lab|practical|prac)\b/i, "lab"],
  [/\b(seminar)\b/i, "seminar"],
  [/\b(workshop)\b/i, "workshop"],
];

function typeOf(name: string, hasBatches: boolean): Enums<"session_type"> {
  for (const [pattern, type] of TYPE_WORDS) {
    if (pattern.test(name)) return type;
  }
  // A session split into batches is a practical: that is what the split is for.
  return hasBatches ? "lab" : "lecture";
}

/**
 * "MENTOR MEET" reads better as "Mentor Meet", but "DSL" must stay "DSL".
 *
 * Decided for the name as a whole, so a phrase never comes out half shouted:
 * short words all through means an acronym and is left alone, while a real
 * word anywhere in it means the whole phrase is a title.
 */
function tidyName(name: string) {
  const words = name.split(/\s+/);
  if (name !== name.toUpperCase()) return name;
  if (words.every((w) => w.replace(/\W/g, "").length <= 4)) return name;
  return words.map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
}

function weekdayOfHeading(heading: string): number | null {
  const key = heading.trim().toLowerCase();
  const index = DAY_NAMES.findIndex((d) => key.startsWith(d.slice(0, 3)) && key.length <= 12);
  return index === -1 ? null : index;
}

function isClock(value: string) {
  return /^\d{1,2}:\d{2}$/.test(value.trim());
}
