/**
 * University names, matched the way people actually type them.
 *
 * `nameKey` mirrors the generated `university_profiles.name_key` column
 * (lower-case, every run of non-letters/digits → one space, trimmed), so
 * "PUNE institute of computer  technology." finds "Pune Institute of Computer
 * Technology". The database's unique index on that key is the real guard;
 * this is for looking up and for showing "joins the existing one" early.
 */

export function nameKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Mirrors `short_key`: "P.I.C.T" and "pict" are both "pict". */
export function shortKey(raw: string): string {
  return raw.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Words that stay lower-case inside a title: "Institute of Technology". */
const SMALL = new Set(["of", "and", "the", "for", "in", "at", "on", "de", "da", "di", "du", "&"]);

/**
 * How a NEW university's name is stored and shown to everyone who joins.
 *
 * Mixed case is kept exactly as typed — only the author knows "IIT Bombay" or
 * "McGill". Input that is all lower-case ("pune institute of computer
 * technology") or all capitals is title-cased, because nobody means their
 * university to read that way on every classmate's screen.
 */
export function tidyUniversityName(raw: string): string {
  const s = raw.replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");
  const hasLower = /\p{Ll}/u.test(s);
  const hasUpper = /\p{Lu}/u.test(s);
  if (hasLower && hasUpper) return s;

  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) =>
      i > 0 && SMALL.has(w) ? w : w.replace(/^(\p{L})/u, (c) => c.toUpperCase()),
    )
    .join(" ");
}

/** "pict" → "PICT"; "IITb" stays as typed; spaces removed. */
export function tidyShortName(raw: string): string {
  const s = raw.replace(/\s+/g, "").trim();
  return /\p{Lu}/u.test(s) ? s : s.toUpperCase();
}
