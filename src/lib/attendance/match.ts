import type { PortalRow } from "./portal";

/**
 * Matching the college's subjects to the modules the app already knows.
 *
 * The two names rarely agree. A timetable grid says "DM"; a portal says
 * "Discrete Mathematics" or "DISCRETE MATHEMATICS (DM)" or "210241 - DM". So
 * each rule below is tried in turn, strongest first, and a rule only counts
 * when exactly one module answers to it — an ambiguous match is left for the
 * student rather than guessed at, because a wrong match moves her attendance
 * figure onto the wrong subject.
 */

export type MatchTarget = { moduleId: string; name: string; code: string | null };

export type Matched = {
  moduleId: string;
  attended: number;
  held: number;
  /** Every portal row that fed this total, for showing back to the student. */
  labels: string[];
};

export type MatchResult = {
  matched: Matched[];
  unmatched: PortalRow[];
};

/** Lowercase, letters and digits only: "COA-2" and "coa 2" are the same thing. */
export function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** "Discrete Mathematics" -> "dm"; "Data Structures Lab" -> "dsl". */
export function initialsOf(value: string): string {
  const words = value
    .replace(/[([{].*?[)\]}]/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w.toLowerCase()));
  return words.map((w) => w[0].toLowerCase()).join("");
}

const STOP = new Set(["and", "of", "the", "for", "in", "to"]);

/** Anything in brackets, which is where a portal usually hides the short name. */
function bracketed(value: string): string[] {
  return [...value.matchAll(/[([{]([^)\]}]+)[)\]}]/g)].map((m) => m[1]);
}

/** The candidate names a row could be known by. */
function aliasesOf(label: string): string[] {
  const out = [label, ...bracketed(label)];
  // "210241 - Discrete Mathematics" — drop a leading course number.
  const withoutNumber = label.replace(/^\s*\d{4,}\s*[-–:]\s*/, "");
  if (withoutNumber !== label) out.push(withoutNumber);
  // "Discrete Mathematics (DM)" — the name without its bracketed short form.
  const withoutBrackets = label.replace(/[([{][^)\]}]*[)\]}]/g, " ").trim();
  if (withoutBrackets && withoutBrackets !== label) out.push(withoutBrackets);
  return out.filter(Boolean);
}

/**
 * The module a portal row is about, or null if it is not clear.
 *
 * Exported for its own tests; `matchRows` is what callers want.
 */
export function matchOne(row: PortalRow, modules: MatchTarget[]): string | null {
  const labels = [...aliasesOf(row.subject), ...(row.code ? aliasesOf(row.code) : [])];
  const keys = new Set(labels.map(key).filter(Boolean));
  const initials = new Set(labels.map(initialsOf).filter((i) => i.length > 1));
  const words = new Set(
    labels.flatMap((l) => l.split(/[^A-Za-z0-9]+/)).map(key).filter(Boolean),
  );

  const rules: Array<(m: MatchTarget) => boolean> = [
    // The codes agree.
    (m) => Boolean(m.code) && keys.has(key(m.code!)),
    // The names agree.
    (m) => keys.has(key(m.name)),
    // The module is the subject's initials: "DM" for "Discrete Mathematics".
    (m) => initials.has(key(m.name)) || (Boolean(m.code) && initials.has(key(m.code!))),
    // The module's name appears as a whole word: "DM" in "DM Practical".
    // Whole words only, so "DS" does not claim "DSL".
    (m) => words.has(key(m.name)) || (Boolean(m.code) && words.has(key(m.code!))),
    // One name sits inside the other, and is long enough to mean something.
    (m) =>
      key(m.name).length >= 4 &&
      [...keys].some((k) => k.includes(key(m.name)) || key(m.name).includes(k)),
  ];

  for (const rule of rules) {
    const hits = modules.filter(rule);
    if (hits.length === 1) return hits[0].moduleId;
    // More than one module answers to this rule: too close to call, so the
    // student is asked rather than told.
    if (hits.length > 1) return null;
  }

  return null;
}

/**
 * Match every row, adding up the ones that land on the same module.
 *
 * A portal often lists a subject twice — theory and practical — and the
 * college's own percentage is the two added together.
 */
export function matchRows(rows: PortalRow[], modules: MatchTarget[]): MatchResult {
  const byModule = new Map<string, Matched>();
  const unmatched: PortalRow[] = [];

  for (const row of rows) {
    if (row.held <= 0 || row.attended > row.held) {
      unmatched.push(row);
      continue;
    }

    const moduleId = matchOne(row, modules);
    if (!moduleId) {
      unmatched.push(row);
      continue;
    }

    const found = byModule.get(moduleId);
    if (found) {
      found.attended += row.attended;
      found.held += row.held;
      found.labels.push(row.subject);
    } else {
      byModule.set(moduleId, {
        moduleId,
        attended: row.attended,
        held: row.held,
        labels: [row.subject],
      });
    }
  }

  return { matched: [...byModule.values()], unmatched };
}
