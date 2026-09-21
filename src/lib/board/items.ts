import type { Tone } from "@/lib/tones";
import { sortByUrgency, urgencyOf, type Urgency, type WorkItem } from "@/lib/work/urgency";

/**
 * What goes on the soft board, in what order, and how each card hangs.
 * Pure — the board screen only draws what this decides.
 */

export const SHAPES = ["index", "sticky", "polaroid", "tag", "torn"] as const;
export type CardShape = (typeof SHAPES)[number];

export const SHAPE_LABEL: Record<CardShape, string> = {
  index: "Index card",
  sticky: "Sticky note",
  polaroid: "Polaroid",
  tag: "Tag",
  torn: "Torn note",
};

export type BoardKind = "assignment" | "exam" | "event";

/** Each kind gets a shape that suits it until the student picks another. */
export const DEFAULT_SHAPE: Record<BoardKind, CardShape> = {
  assignment: "index",
  exam: "tag",
  event: "polaroid",
};

export function asShape(v: string | null | undefined): CardShape | null {
  return (SHAPES as readonly string[]).includes(v ?? "") ? (v as CardShape) : null;
}

export type BoardEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  details: string | null;
  tags: string[];
  visibility: "private" | "university";
  /** Posted by this student. Only then can it be edited or deleted. */
  mine: boolean;
  /** This student's mark on someone else's shared event. */
  mark: "save" | "hide" | null;
  shape: CardShape | null;
};

export type BoardCard = {
  key: string;
  kind: BoardKind;
  id: string;
  title: string;
  at: string;
  tone: Tone;
  urgency: Urgency;
  shape: CardShape;
  tags: string[];
  work?: WorkItem & { shape: CardShape | null };
  event?: BoardEvent;
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function eventEnd(e: Pick<BoardEvent, "startsAt" | "endsAt">) {
  return e.endsAt ? new Date(e.endsAt) : new Date(new Date(e.startsAt).getTime() + HOUR);
}

/** An event is "done" once it has ended; while it is on, it is today's. */
export function eventUrgency(e: Pick<BoardEvent, "startsAt" | "endsAt">, now: Date): Urgency {
  const start = new Date(e.startsAt);
  if (eventEnd(e) <= now) return "done";
  if (start <= now) return "today";
  const sameDay =
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate();
  if (sameDay) return "today";
  const ahead = start.getTime() - now.getTime();
  if (ahead <= 3 * DAY) return "soon";
  if (ahead <= 7 * DAY) return "this_week";
  return "later";
}

const RANK: Record<Urgency, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  this_week: 3,
  later: 4,
  done: 5,
};

/**
 * Pinned: the student's own work and events, plus shared events they saved.
 * Campus: classmates' shared events they have not decided about yet, and
 * that have not ended. Hidden ones appear nowhere.
 */
export function buildBoard({
  work,
  events,
  now,
}: {
  work: Array<WorkItem & { shape: CardShape | null }>;
  events: BoardEvent[];
  now: Date;
}): { pinned: BoardCard[]; campus: BoardEvent[] } {
  const workCards: BoardCard[] = sortByUrgency(work, now).map((w) => ({
    key: `${w.kind}:${w.id}`,
    kind: w.kind,
    id: w.id,
    title: w.title,
    at: w.at,
    tone: w.tone,
    urgency: urgencyOf(w, now),
    shape: w.shape ?? DEFAULT_SHAPE[w.kind],
    tags: [w.kind === "exam" ? "Exam" : "Hand-in", ...(w.moduleName ? [w.moduleName] : [])],
    work: w,
  }));

  const eventCards: BoardCard[] = events
    .filter((e) => e.mine || e.mark === "save")
    .map((e) => ({
      key: `event:${e.id}`,
      kind: "event" as const,
      id: e.id,
      title: e.title,
      at: e.startsAt,
      tone: e.visibility === "university" ? ("iris" as const) : ("leaf" as const),
      urgency: eventUrgency(e, now),
      shape: e.shape ?? DEFAULT_SHAPE.event,
      tags: e.tags,
      event: e,
    }));

  const pinned = [...workCards, ...eventCards].sort(
    (a, b) =>
      RANK[a.urgency] - RANK[b.urgency] || new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  const campus = events
    .filter((e) => !e.mine && e.mark === null && e.visibility === "university")
    .filter((e) => eventEnd(e) > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return { pinned, campus };
}

/** Deal cards into two columns row by row, so the most urgent sit at the top. */
export function twoColumns<T>(items: T[]): [T[], T[]] {
  const left: T[] = [];
  const right: T[] = [];
  items.forEach((item, i) => (i % 2 === 0 ? left : right).push(item));
  return [left, right];
}

function hash(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * How a card hangs: a small tilt and where the pin went in. Derived from the
 * card's key, so a card hangs the same way every time the board is opened.
 */
export function hangOf(key: string): { tilt: number; pinX: number } {
  const h = hash(key);
  const tilt = ((h % 1000) / 1000) * 6 - 3; // −3° … +3°
  const pinX = (((h >>> 10) % 1000) / 1000) * 24 - 12; // −12 … +12 px
  return { tilt: Math.round(tilt * 10) / 10, pinX: Math.round(pinX) };
}

/**
 * "Hackathon, #coding , hackathon" → ["Hackathon", "coding"]. Tags are
 * de-duplicated ignoring case — the first spelling wins — and capped, so one
 * card cannot bury the filter row.
 */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, 24);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === 6) break;
  }
  return out;
}

/** The tags worth offering as filters: most used first, case-insensitive. */
export function topTags(cards: BoardCard[], limit = 6): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const c of cards) {
    for (const t of c.tags) {
      const k = t.toLowerCase();
      const cur = counts.get(k);
      if (cur) cur.n++;
      else counts.set(k, { label: t, n: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((c) => c.label);
}

export function hasTag(card: BoardCard, tag: string): boolean {
  const k = tag.toLowerCase();
  return card.tags.some((t) => t.toLowerCase() === k);
}
