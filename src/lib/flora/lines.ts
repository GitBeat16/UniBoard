import type { FloraAction, FloraMood } from "@/components/flora/flora";
import type { Verdict } from "@/lib/advisor/engine";

/**
 * What Flora says, and how she looks saying it.
 *
 * Pure: context in, one line out. Keeping this out of the components means her
 * behaviour is testable, and — more importantly — that it stays *rule-based*.
 * A mascot who says something random is wallpaper. Flora says the single most
 * useful thing available, in a fixed priority order, or she says nothing.
 *
 * Tone rules, deliberately: she never nags, never guilt-trips, and never tells
 * a student to work harder. Bad news is delivered as information.
 */

export type FloraScreen =
  | "signin"
  | "home"
  | "timetable"
  | "board"
  | "me"
  | "advisor"
  | "money";

export type FloraContext = {
  screen: FloraScreen;
  isGuest?: boolean;
  hasTimetable?: boolean;
  modulesBelow?: number;
  modulesAtRisk?: number;
  overdueCount?: number;
  dueTodayCount?: number;
  unmarkedCount?: number;
  /** Whether any module carries the college's own attendance figure. */
  hasOfficial?: boolean;
  /** Days since the newest college figure, when there is one. */
  officialAgeDays?: number | null;
  minutesToNextClass?: number | null;
  nothingOnToday?: boolean;
  goalCount?: number;
  verdict?: Verdict;
  /** Money screen: where the current budget stands. */
  budget?: "none" | "fine" | "tight" | "over";
  budgetKind?: "week" | "month";
  hasCampus?: boolean;
  /**
   * What the student just did, if anything. Reactions are the difference
   * between a sign and a companion: marking a class and getting nothing back
   * is the moment she feels like wallpaper.
   */
  reaction?: FloraReaction | null;
  /** Which day of the timetable is open: -1 behind, 0 today, 1 ahead. */
  dayOffset?: number;
  /** How many classes are on that day. */
  dayCount?: number;
  /** How many classes on that day are still unmarked and already over. */
  dayUnmarked?: number;
};

/** Something that just happened on screen, worth a word from her. */
export type FloraReaction =
  | "marked-present"
  | "marked-absent"
  | "class-added"
  | "class-changed"
  | "class-removed"
  | "spend-logged"
  | "pinned";

const REACTIONS: Record<FloraReaction, FloraSpeech> = {
  "marked-present": { mood: "cheer", text: "Marked. That one's in the bank." },
  "marked-absent": { mood: "neutral", text: "Noted. I'll work it into the maths." },
  "class-added": { mood: "happy", text: "Added. Your week just got more accurate." },
  "class-changed": { mood: "happy", text: "Changed. I'll count it the new way." },
  "class-removed": { mood: "neutral", text: "Gone. The maths will catch up." },
  "spend-logged": { mood: "thinking", text: "Logged. Running total's updated." },
  pinned: { mood: "happy", text: "Pinned. It'll nag you from the board now." },
};

export type FloraSpeech = {
  mood: FloraMood;
  text: string;
  /** She points when she is asking you to do something specific. */
  action?: FloraAction;
};

/**
 * One thing she could say, and how long she should leave it before saying it
 * again. Everything true at once is collected rather than only the winner, so
 * she has somewhere to go when you tap her — a guide with one line is a sign,
 * not a guide.
 */
export type Observation = FloraSpeech & {
  /** Stable across renders, so "already said" survives a re-render. */
  id: string;
  /** Milliseconds before this is worth saying again. */
  repeatAfterMs: number;
};

const MINUTE = 60_000;

/** Urgent things bear repeating; pleasantries do not. */
export const REPEAT = {
  urgent: 4 * MINUTE,
  normal: 12 * MINUTE,
  nudge: 20 * MINUTE,
  filler: 45 * MINUTE,
} as const;

const VERDICT_LINES: Record<Verdict, FloraSpeech> = {
  go_matters: { mood: "worried", text: "I'd go to this one. Genuinely." },
  go_if_you_can: { mood: "neutral", text: "Nothing forces it, but it tips towards going." },
  your_call: { mood: "thinking", text: "This one is properly balanced. Read both sides." },
  skip_fine: { mood: "happy", text: "You have the room. Spend it on something that needs you." },
};

/**
 * Everything worth saying right now, best first.
 *
 * The order is the whole design: hard facts before nudges, nudges before
 * pleasantries. Collecting them all rather than returning the winner is what
 * lets her be tapped for the next thought, and what stops her repeating the
 * same sentence every time a screen re-renders.
 */
export function observations(ctx: FloraContext): Observation[] {
  const out: Observation[] = [];
  const add = (id: string, repeatAfterMs: number, speech: FloraSpeech) =>
    out.push({ id, repeatAfterMs, ...speech });

  // The Advisor screen already argues its case. Flora just sets the tone.
  if (ctx.screen === "advisor") {
    if (!ctx.verdict) return out;
    add(`verdict:${ctx.verdict}`, REPEAT.normal, VERDICT_LINES[ctx.verdict]);
    return out;
  }

  if (ctx.screen === "signin") {
    add("hello", REPEAT.filler, {
      mood: "cheer",
      text: "Hi! I'm Flora. I'll show you around.",
      action: "wave",
    });
    return out;
  }

  // --- What just happened, above everything ---------------------------------
  // She answers the action while it is still on screen, or not at all.
  if (ctx.reaction) {
    add(`reaction:${ctx.reaction}`, 0, REACTIONS[ctx.reaction]);
  }

  // --- Things that are actually wrong, hardest first ----------------------
  if (ctx.modulesBelow && ctx.modulesBelow > 0) {
    // On the college's own count this is not a warning about her habits, it is
    // where she actually stands, so it is said more plainly.
    const source = ctx.hasOfficial ? " on your college's count" : "";
    add("below", REPEAT.urgent, {
      mood: "worried",
      text:
        ctx.modulesBelow === 1
          ? `One module has slipped under its threshold${source}. Worth a look.`
          : `${ctx.modulesBelow} modules have slipped under their threshold${source}.`,
    });
  }

  if (ctx.overdueCount && ctx.overdueCount > 0) {
    add("overdue", REPEAT.urgent, {
      mood: "worried",
      text:
        ctx.overdueCount === 1
          ? "Something on the board is past its date."
          : `${ctx.overdueCount} things on the board are past their date.`,
    });
  }

  // --- Time-critical, but not a problem ------------------------------------
  if (
    typeof ctx.minutesToNextClass === "number" &&
    ctx.minutesToNextClass >= 0 &&
    ctx.minutesToNextClass <= 30
  ) {
    add("next-class", REPEAT.urgent, {
      mood: "cheer",
      text:
        ctx.minutesToNextClass <= 5
          ? "Your next class is starting about now."
          : `Next class in ${ctx.minutesToNextClass} minutes.`,
    });
  }

  if (ctx.dueTodayCount && ctx.dueTodayCount > 0) {
    add("due-today", REPEAT.normal, {
      mood: "thinking",
      text:
        ctx.dueTodayCount === 1
          ? "One thing is due today. You've got it."
          : `${ctx.dueTodayCount} things are due today.`,
    });
  }

  if (ctx.modulesAtRisk && ctx.modulesAtRisk > 0) {
    add("at-risk", REPEAT.normal, {
      mood: "thinking",
      text: "One of your modules is getting close to the line. Check before you skip.",
    });
  }

  // --- Money, on its own screen -------------------------------------------
  // Below attendance and deadlines on purpose: an overspent week is worth
  // knowing, a module under threshold is worth acting on.
  if (ctx.screen === "money") {
    const period = ctx.budgetKind === "month" ? "month" : "week";
    if (ctx.budget === "over") {
      add("budget-over", REPEAT.normal, {
        mood: "worried",
        text: `You're past this ${period}'s budget. Worth knowing, not a disaster.`,
      });
    } else if (ctx.budget === "tight") {
      add("budget-tight", REPEAT.normal, {
        mood: "thinking",
        text: `Spending's running a little quick this ${period}.`,
      });
    } else if (ctx.budget === "none") {
      add("budget-none", REPEAT.nudge, {
        mood: "neutral",
        text: "Set a budget and I'll keep the running maths for you.",
        action: "point",
      });
    } else {
      if (ctx.hasCampus === false) {
        add("campus-pin", REPEAT.nudge, {
          mood: "neutral",
          text: "Drop a campus pin and I'll find food close by.",
          action: "point",
        });
      }
      add("budget-fine", REPEAT.filler, { mood: "happy", text: "Money's comfortable. Enjoy lunch." });
    }
  }

  // --- Setup nudges --------------------------------------------------------
  if (ctx.hasTimetable === false) {
    add("no-timetable", REPEAT.nudge, {
      mood: "neutral",
      text: "Pop your timetable in and I can start doing something useful.",
      action: "point",
    });
  }

  // Before nagging about unmarked classes: the college's own figure settles
  // all of them at once, and it is the number that decides the exam hall.
  if (ctx.hasTimetable && ctx.hasOfficial === false) {
    add("no-official", REPEAT.nudge, {
      mood: "neutral",
      text: "If your college publishes attendance, bring its figure in — then my maths starts from theirs.",
      action: "point",
    });
  }

  if (ctx.hasOfficial && typeof ctx.officialAgeDays === "number" && ctx.officialAgeDays > 21) {
    add("official-stale", REPEAT.nudge, {
      mood: "thinking",
      text: `Your college's figure is ${Math.round(ctx.officialAgeDays / 7)} weeks old now. Worth taking a fresh one.`,
      action: "point",
    });
  }

  if (ctx.unmarkedCount && ctx.unmarkedCount > 2) {
    add("unmarked", REPEAT.normal, {
      mood: "thinking",
      text: `${ctx.unmarkedCount} classes are still unmarked, so my maths is guessing.`,
    });
  }

  if (ctx.isGuest && ctx.screen === "me") {
    add("guest", REPEAT.nudge, {
      mood: "neutral",
      text: "You're a guest right now. Add an email and all this stays yours.",
      action: "point",
    });
  }

  if (ctx.screen === "me" && !ctx.goalCount) {
    add("no-goals", REPEAT.nudge, {
      mood: "neutral",
      text: "Give me a goal and I'll find time for it.",
      action: "point",
    });
  }

  // --- Reading the day she has open ---------------------------------------
  // Below the nudges, because none of it is a call to action — it is the
  // company of someone looking at the same screen.
  if (ctx.screen === "timetable" && typeof ctx.dayCount === "number") {
    if (ctx.dayUnmarked && ctx.dayUnmarked > 0 && ctx.dayOffset !== undefined && ctx.dayOffset <= 0) {
      add("day-unmarked", REPEAT.normal, {
        mood: "thinking",
        text:
          ctx.dayUnmarked === 1
            ? "One class on this day is still unmarked."
            : `${ctx.dayUnmarked} classes on this day are still unmarked.`,
      });
    }
    if (ctx.dayOffset !== undefined && ctx.dayOffset > 0 && ctx.dayCount >= 5) {
      add("day-heavy", REPEAT.filler, {
        mood: "thinking",
        text: `${ctx.dayCount} classes that day. Worth an early night before it.`,
      });
    }
    if (ctx.dayOffset !== undefined && ctx.dayOffset > 0 && ctx.dayCount === 0) {
      add("day-clear", REPEAT.filler, {
        mood: "happy",
        text: "Nothing that day. Good one to put something of your own in.",
      });
    }
  }

  // --- Quiet days ----------------------------------------------------------
  if (ctx.nothingOnToday) {
    add("nothing-on", REPEAT.filler, {
      mood: "sleepy",
      text: "Nothing on today. Enjoy it, honestly.",
    });
  }

  if (ctx.screen === "board") {
    add("board-clear", REPEAT.filler, { mood: "happy", text: "Board's clear. Rare and excellent." });
  }

  // Only once there is something to be quiet about: "all quiet" next to "pop
  // your timetable in" is her contradicting herself a tap apart.
  if (ctx.hasTimetable !== false) {
    if (ctx.screen === "timetable") {
      add("attendance-healthy", REPEAT.filler, {
        mood: "happy",
        text: "Attendance is looking healthy.",
      });
    }

    if (ctx.screen === "home") {
      add("all-quiet", REPEAT.filler, { mood: "happy", text: "All quiet. You're on top of it." });
    }
  }

  return out;
}

/** The single most useful thing she has, or nothing. */
export function floraSpeech(ctx: FloraContext): FloraSpeech | null {
  return observations(ctx)[0] ?? null;
}

/** When each line was last said, by id. */
export type SpeechLog = Record<string, number>;

/**
 * The next thing she should say, given what she has already said.
 *
 * Three rules, in order:
 *
 *  1. A reaction to something that just happened always wins — answering it
 *     late is the same as not answering it.
 *  2. When she is not saying anything yet, she leads with her best line. An
 *     empty bubble on arrival would waste the one moment she is looked at.
 *  3. Otherwise she moves on: the best line she has not used recently, and
 *     failing that the stalest one that is not already on screen. Tapping her
 *     always does something; a companion who runs out is just a sticker.
 */
export function nextObservation(
  all: Observation[],
  {
    now,
    spoken,
    currentId,
  }: { now: number; spoken: SpeechLog; currentId?: string | null },
): Observation | null {
  if (all.length === 0) return null;

  const reaction = all.find((o) => o.repeatAfterMs === 0);
  if (reaction) return reaction;

  if (!currentId) return all[0];

  const fresh = all.find((o) => o.id !== currentId && isReady(o, spoken, now));
  if (fresh) return fresh;

  const others = all.filter((o) => o.id !== currentId);
  if (others.length === 0) return null;

  return others.reduce((oldest, o) =>
    (spoken[o.id] ?? 0) < (spoken[oldest.id] ?? 0) ? o : oldest,
  );
}

/**
 * Whether she has something new worth interrupting for.
 *
 * Used for the little nudge on her: she bobs when there is something she has
 * not said, and stays still when tapping her would only reshuffle old news.
 */
export function hasSomethingNew(
  all: Observation[],
  { spoken, currentId }: { spoken: SpeechLog; currentId?: string | null },
): boolean {
  return all.some((o) => o.id !== currentId && spoken[o.id] === undefined);
}

/**
 * Ready to be said again.
 *
 * A line she has never said is always ready — a cooldown measured from the
 * epoch would silence a brand-new line for the first four minutes of the
 * session, which is exactly when it matters most.
 */
function isReady(o: Observation, spoken: SpeechLog, now: number) {
  const said = spoken[o.id];
  return said === undefined || said + o.repeatAfterMs <= now;
}

/**
 * Whether what she is saying has stopped being true.
 *
 * A line only exists while the thing it describes does, so a line missing
 * from the current set is one she should move off: a reaction that has
 * lapsed, or a count the student has just fixed. Leaving it up would have her
 * asserting something the screen disagrees with.
 */
export function isStale(all: Observation[], currentId: string | null | undefined): boolean {
  return Boolean(currentId) && !all.some((o) => o.id === currentId);
}
