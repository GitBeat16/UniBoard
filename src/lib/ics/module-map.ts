import type { Enums } from "@/lib/supabase/database.types";

export type SessionType = Enums<"session_type">;

export type ExtractedModule = {
  code: string | null;
  name: string;
  type: SessionType;
};

/**
 * Words universities append to a class title to say what kind of session it is.
 * Order matters: "computer lab" should not become a lab because of "lab" if a
 * more specific word is present, so the longer phrases are tested first.
 */
const TYPE_WORDS: Array<[RegExp, SessionType]> = [
  [/\b(practical|laboratory|lab)\b/i, "lab"],
  [/\b(seminar)\b/i, "seminar"],
  [/\b(tutorial|tut)\b/i, "tutorial"],
  [/\b(workshop)\b/i, "workshop"],
  [/\b(lecture|lec)\b/i, "lecture"],
];

/** e.g. "CS2004", "COMP 30120", "MATH-101" */
const CODE_PATTERN = /\b([A-Z]{2,5})[\s-]?(\d{3,5})\b/;

const NOISE = /[([{].*?[)\]}]/g; // "(Group B)", "[Week 1-11]"
const SEPARATORS = /\s*[-–—:|/]\s*/g;

/**
 * Turn a calendar event title into a module + session type.
 *
 * University feeds are wildly inconsistent — "CS2004 Databases - Lecture",
 * "Databases (Lab) Grp 3", "LEC/Databases/2024" are all real shapes. This is a
 * best-effort heuristic, not a parser, which is exactly why the UI lets the
 * student rename a module afterwards.
 */
export function extractModule(summary: string): ExtractedModule {
  const raw = summary.trim();

  let type: SessionType = "lecture";
  for (const [pattern, t] of TYPE_WORDS) {
    if (pattern.test(raw)) {
      type = t;
      break;
    }
  }

  const codeMatch = raw.match(CODE_PATTERN);
  const code = codeMatch ? `${codeMatch[1]}${codeMatch[2]}` : null;

  let name = raw
    .replace(NOISE, " ")
    .replace(CODE_PATTERN, " ")
    .replace(
      /\b(practical|laboratory|lab|seminar|tutorial|tut|workshop|lecture|lec|group|grp|week|wk)\b/gi,
      " ",
    )
    .replace(/\b(?:19|20)\d{2}\b/g, " ") // stray year, e.g. "LEC/Operating Systems/2026"
    .replace(/\b\d{1,3}\b/g, " ")
    .replace(SEPARATORS, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If stripping left nothing useful, the original title is a better label
  // than an empty string or a bare code.
  if (name.length < 3) name = code ?? raw;

  return { code, name: titleCase(name), type };
}

function titleCase(s: string) {
  if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s; // already mixed — trust it
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** Stable key for grouping occurrences into a module. */
export function moduleKey(m: ExtractedModule) {
  return (m.code ?? m.name).toLowerCase();
}

/** Cycled so a student's modules are visually distinguishable at a glance. */
export const MODULE_TONES = ["sky", "coral", "leaf", "iris", "sun"] as const;

export function toneForIndex(i: number) {
  return MODULE_TONES[i % MODULE_TONES.length];
}
