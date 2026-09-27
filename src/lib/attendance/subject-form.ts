import { TONES, type Tone } from "@/lib/tones";

/**
 * Checking a subject edit before it touches the database.
 *
 * Pure, so every rule is tested without a server. The college figure is the
 * delicate part: it is all three fields or none. A count without a date
 * cannot be carried forward (the maths would not know which classes it
 * already covers), and a date without counts means nothing.
 */

export type SubjectEdit = {
  name: string;
  code: string | null;
  tone: Tone;
  /** Percent, or null to follow the university's. */
  threshold: number | null;
  /** The college's figure, or null to clear it. */
  official: { attended: number; held: number; asOf: string } | null;
};

export type Parsed = { ok: true; value: SubjectEdit } | { ok: false; message: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function whole(raw: string) {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/** `today` is the student's own date, yyyy-mm-dd, so "not in the future" is theirs. */
export function parseSubjectEdit(
  fields: Record<string, string | undefined>,
  today: string,
): Parsed {
  const get = (k: string) => (fields[k] ?? "").trim();

  const name = get("name").replace(/\s+/g, " ");
  if (name.length < 1) return { ok: false, message: "Give the subject a name." };
  if (name.length > 60) return { ok: false, message: "That name is too long." };

  const code = get("code").toUpperCase() || null;
  if (code && code.length > 16) return { ok: false, message: "That code is too long." };

  const toneRaw = get("tone");
  if (!(TONES as readonly string[]).includes(toneRaw)) return { ok: false, message: "Pick a colour." };

  let threshold: number | null = null;
  if (get("threshold")) {
    const t = whole(get("threshold"));
    if (t === null || t < 1 || t > 100) {
      return { ok: false, message: "The threshold is a percentage from 1 to 100." };
    }
    threshold = t;
  }

  const attendedRaw = get("attended");
  const heldRaw = get("held");
  const asOf = get("asOf");
  const filled = [attendedRaw, heldRaw, asOf].filter(Boolean).length;

  let official: SubjectEdit["official"] = null;
  if (filled > 0) {
    if (filled < 3) {
      return {
        ok: false,
        message: "The college figure needs all three: attended, held, and the date it is up to.",
      };
    }
    const attended = whole(attendedRaw);
    const held = whole(heldRaw);
    if (attended === null || held === null) {
      return { ok: false, message: "Attended and held are whole numbers of classes." };
    }
    if (held === 0) return { ok: false, message: "Held has to be at least one class." };
    if (attended > held) return { ok: false, message: "You cannot attend more classes than were held." };
    if (held > 1000) return { ok: false, message: "That is more classes than a term holds." };
    if (!DATE.test(asOf)) return { ok: false, message: "The date looks wrong." };
    if (asOf > today) return { ok: false, message: "The college cannot have counted days that have not happened." };
    official = { attended, held, asOf };
  }

  return { ok: true, value: { name, code, tone: toneRaw as Tone, threshold, official } };
}

/** Same subject, however it is typed: "D.M", "dm " and "DM" are one name. */
export function sameName(a: string, b: string) {
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
}
