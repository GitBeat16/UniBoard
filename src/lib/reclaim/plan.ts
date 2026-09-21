import { urgencyOf, type WorkItem } from "@/lib/work/urgency";

/**
 * Reclaim — turning a skipped class into a plan for the freed hours.
 *
 * This is the half that makes skipping defensible instead of lazy, so it has
 * to be honest in two directions:
 *
 *  - It refuses to invent a productive block out of twenty minutes. Below
 *    MIN_USEFUL it says so and hands the time back as a break.
 *  - It never produces an unbroken grind. Work comes in chunks with real
 *    breaks between them, and the plan always ends on a break, because a plan
 *    that ends mid-task is one nobody follows.
 *
 * Pure: window in, slots out. No clock, no database.
 */

export type SlotKind = "work" | "revision" | "goal" | "break" | "event";

export type Slot = {
  /** Stable within a plan, so React keys and the save action agree. */
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  kind: SlotKind;
  /** Shown to the student. Every slot explains itself, like the Advisor. */
  why: string;
  /** "event" slots are fixed — something pinned on the board — never saved as study. */
  linkedType: "assignment" | "exam" | "goal" | "event" | null;
  linkedId: string | null;
};

/** Something already on the student's board inside the window. */
export type BusyBlock = { id: string; title: string; from: Date; to: Date };

export type ReclaimGoal = {
  id: string;
  title: string;
  kind: "habit" | "project";
};

const FOCUS = 45;
const SHORT_BREAK = 10;
const LONG_BREAK = 15;
/** Below this, nothing worth starting fits. */
const MIN_USEFUL = 25;
/** Two focus blocks, then a longer break. */
const CHUNKS_BEFORE_LONG_BREAK = 2;

const MINUTE = 60_000;

type Task = {
  title: string;
  kind: Exclude<SlotKind, "break">;
  why: string;
  linkedType: Slot["linkedType"];
  linkedId: string | null;
  minutes: number;
};

export function buildReclaimPlan({
  from,
  to,
  work,
  goals,
  now,
  busy = [],
}: {
  from: Date;
  to: Date;
  work: WorkItem[];
  goals: ReclaimGoal[];
  now: Date;
  /** Events pinned on the board. The plan works around them, never over them. */
  busy?: BusyBlock[];
}): Slot[] {
  if (to.getTime() <= from.getTime()) return [];

  const blocks = mergeBusy(busy, from, to);
  const queue = buildQueue(work, goals, now);
  const out: Slot[] = [];
  let cursor = from;

  // Plan each free stretch in turn, sharing one queue so a task finished
  // before the event is not scheduled again after it.
  for (const b of blocks) {
    if (b.from > cursor) out.push(...planSegment(cursor, b.from, queue));
    out.push(
      slotFrom({
        start: b.from,
        end: b.to,
        title: b.title,
        kind: "event",
        why: "Pinned on your board — the plan works around it.",
        linkedType: "event",
        linkedId: b.id,
      }),
    );
    cursor = b.to;
  }
  if (cursor < to) out.push(...planSegment(cursor, to, queue));

  // Ids are positional so React keys and the save action agree.
  return out.map((slot, index) => ({ ...slot, id: `slot-${index}` }));
}

/** Clip to the window, sort, and merge overlaps so free stretches are clean. */
function mergeBusy(busy: BusyBlock[], from: Date, to: Date): BusyBlock[] {
  const clipped = busy
    .map((b) => ({
      ...b,
      from: new Date(Math.max(b.from.getTime(), from.getTime())),
      to: new Date(Math.min(b.to.getTime(), to.getTime())),
    }))
    .filter((b) => b.to > b.from)
    .sort((a, b) => a.from.getTime() - b.from.getTime());

  const merged: BusyBlock[] = [];
  for (const b of clipped) {
    const last = merged.at(-1);
    if (last && b.from <= last.to) {
      if (b.to > last.to) last.to = b.to;
      last.title = `${last.title} + ${b.title}`;
    } else {
      merged.push({ ...b });
    }
  }
  return merged;
}

/** One free stretch. Consumes tasks from the shared queue as it goes. */
function planSegment(from: Date, to: Date, queue: Task[]): Slot[] {
  const total = Math.floor((to.getTime() - from.getTime()) / MINUTE);
  if (total <= 0) return [];

  if (total < MIN_USEFUL) {
    return [
      slot({
        index: 0,
        start: from,
        minutes: total,
        title: "Take the time back",
        kind: "break",
        why: "Too short to start anything real. Coffee, walk, actual rest.",
        linkedType: null,
        linkedId: null,
      }),
    ];
  }

  const slots: Slot[] = [];

  let cursor = new Date(from);
  let remaining = total;
  let chunksSinceBreak = 0;
  let index = 0;

  // Hold back a closing break so the plan never ends mid-task.
  const reserved = Math.min(SHORT_BREAK, Math.floor(total * 0.15));

  while (queue.length > 0 && remaining - reserved >= MIN_USEFUL) {
    const task = queue[0];
    const length = Math.min(FOCUS, task.minutes, remaining - reserved);

    if (length < MIN_USEFUL) {
      // Not enough left for this task to be worth starting; try the next one.
      queue.shift();
      continue;
    }

    slots.push(
      slot({
        index: index++,
        start: cursor,
        minutes: length,
        title: task.title,
        kind: task.kind,
        why: task.why,
        linkedType: task.linkedType,
        linkedId: task.linkedId,
      }),
    );

    cursor = new Date(cursor.getTime() + length * MINUTE);
    remaining -= length;
    task.minutes -= length;
    if (task.minutes <= 0) queue.shift();

    chunksSinceBreak++;

    const breakLength =
      chunksSinceBreak >= CHUNKS_BEFORE_LONG_BREAK ? LONG_BREAK : SHORT_BREAK;

    // Only insert a mid-plan break if there is still work to come after it.
    const moreToDo = queue.length > 0;
    if (moreToDo && remaining - reserved - breakLength >= MIN_USEFUL) {
      slots.push(
        slot({
          index: index++,
          start: cursor,
          minutes: breakLength,
          title: "Break",
          kind: "break",
          why:
            breakLength === LONG_BREAK
              ? "Two blocks in. Get up and leave the screen."
              : "Short reset — it is part of the plan, not a reward.",
          linkedType: null,
          linkedId: null,
        }),
      );
      cursor = new Date(cursor.getTime() + breakLength * MINUTE);
      remaining -= breakLength;
      if (breakLength === LONG_BREAK) chunksSinceBreak = 0;
    }
  }

  const leftover = Math.floor((to.getTime() - cursor.getTime()) / MINUTE);
  if (leftover >= SHORT_BREAK) {
    slots.push(
      slot({
        index: index++,
        start: cursor,
        minutes: leftover,
        title: slots.length === 0 ? "Nothing pressing — take it" : "Stop properly",
        kind: "break",
        why:
          slots.length === 0
            ? "Nothing is due and no goals are set. This one is genuinely free."
            : "Finish on a break so the next thing does not eat into it.",
        linkedType: null,
        linkedId: null,
      }),
    );
  }

  return slots;
}

/**
 * Most urgent work first, then exam revision, then goals. Goals come last on
 * purpose: they matter, but not at the cost of something with a deadline.
 */
function buildQueue(work: WorkItem[], goals: ReclaimGoal[], now: Date): Task[] {
  const rank = { overdue: 0, today: 1, soon: 2, this_week: 3, later: 4, done: 5 };

  const live = work
    .filter((w) => urgencyOf(w, now) !== "done")
    .sort((a, b) => {
      const byUrgency = rank[urgencyOf(a, now)] - rank[urgencyOf(b, now)];
      if (byUrgency !== 0) return byUrgency;
      return new Date(a.at).getTime() - new Date(b.at).getTime();
    })
    .slice(0, 4);

  const tasks: Task[] = live.map((item) => {
    const urgency = urgencyOf(item, now);
    const isExam = item.kind === "exam";

    return {
      title: isExam ? `Revise for ${item.title}` : item.title,
      kind: isExam ? "revision" : "work",
      why: whyFor(item, urgency),
      linkedType: isExam ? "exam" : "assignment",
      linkedId: item.id,
      // An unestimated task still deserves a block; assume one focus session.
      minutes: Math.max(FOCUS, Math.round((item.estimatedHours ?? 0.75) * 60)),
    };
  });

  for (const goal of goals.slice(0, 2)) {
    tasks.push({
      title: goal.title,
      kind: "goal",
      why:
        goal.kind === "habit"
          ? "A habit you said you wanted to keep up."
          : "One of your goals. Deadlines will always shout louder, so it gets a slot.",
      linkedType: "goal",
      linkedId: goal.id,
      minutes: FOCUS,
    });
  }

  return tasks;
}

function whyFor(item: WorkItem, urgency: ReturnType<typeof urgencyOf>): string {
  if (urgency === "overdue") return "Already past its date — this is the one that hurts.";
  if (urgency === "today") return "Due today.";
  if (urgency === "soon") return "Due within three days.";
  if (item.kind === "exam") return "Close enough that revision now beats revision later.";
  return "Due this week, and easier now than the night before.";
}

function slot({
  index,
  start,
  minutes,
  ...rest
}: {
  index: number;
  start: Date;
  minutes: number;
  title: string;
  kind: SlotKind;
  why: string;
  linkedType: Slot["linkedType"];
  linkedId: string | null;
}): Slot {
  return {
    id: `slot-${index}`,
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + minutes * MINUTE).toISOString(),
    ...rest,
  };
}

function slotFrom({
  start,
  end,
  ...rest
}: {
  start: Date;
  end: Date;
  title: string;
  kind: SlotKind;
  why: string;
  linkedType: Slot["linkedType"];
  linkedId: string | null;
}): Slot {
  return { id: "slot", startsAt: start.toISOString(), endsAt: end.toISOString(), ...rest };
}

export function planMinutes(slots: Slot[]): number {
  return slots.reduce(
    (n, s) =>
      n + (new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / MINUTE,
    0,
  );
}
