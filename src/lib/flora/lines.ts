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
  minutesToNextClass?: number | null;
  nothingOnToday?: boolean;
  goalCount?: number;
  verdict?: Verdict;
  /** Money screen: where the current budget stands. */
  budget?: "none" | "fine" | "tight" | "over";
  budgetKind?: "week" | "month";
  hasCampus?: boolean;
};

export type FloraSpeech = {
  mood: FloraMood;
  text: string;
  /** She points when she is asking you to do something specific. */
  action?: FloraAction;
};

const VERDICT_LINES: Record<Verdict, FloraSpeech> = {
  go_matters: { mood: "worried", text: "I'd go to this one. Genuinely." },
  go_if_you_can: { mood: "neutral", text: "Nothing forces it, but it tips towards going." },
  your_call: { mood: "thinking", text: "This one is properly balanced. Read both sides." },
  skip_fine: { mood: "happy", text: "You have the room. Spend it on something that needs you." },
};

export function floraSpeech(ctx: FloraContext): FloraSpeech | null {
  // The Advisor screen already argues its case. Flora just sets the tone.
  if (ctx.screen === "advisor") {
    return ctx.verdict ? VERDICT_LINES[ctx.verdict] : null;
  }

  if (ctx.screen === "signin") {
    return { mood: "cheer", text: "Hi! I'm Flora. I'll show you around.", action: "wave" };
  }

  // --- Things that are actually wrong, hardest first ----------------------
  if (ctx.modulesBelow && ctx.modulesBelow > 0) {
    return {
      mood: "worried",
      text:
        ctx.modulesBelow === 1
          ? "One module has slipped under its threshold. Worth a look."
          : `${ctx.modulesBelow} modules have slipped under their threshold.`,
    };
  }

  if (ctx.overdueCount && ctx.overdueCount > 0) {
    return {
      mood: "worried",
      text:
        ctx.overdueCount === 1
          ? "Something on the board is past its date."
          : `${ctx.overdueCount} things on the board are past their date.`,
    };
  }

  // --- Time-critical, but not a problem ------------------------------------
  if (
    typeof ctx.minutesToNextClass === "number" &&
    ctx.minutesToNextClass >= 0 &&
    ctx.minutesToNextClass <= 30
  ) {
    return {
      mood: "cheer",
      text:
        ctx.minutesToNextClass <= 5
          ? "Your next class is starting about now."
          : `Next class in ${ctx.minutesToNextClass} minutes.`,
    };
  }

  if (ctx.dueTodayCount && ctx.dueTodayCount > 0) {
    return {
      mood: "thinking",
      text:
        ctx.dueTodayCount === 1
          ? "One thing is due today. You've got it."
          : `${ctx.dueTodayCount} things are due today.`,
    };
  }

  if (ctx.modulesAtRisk && ctx.modulesAtRisk > 0) {
    return {
      mood: "thinking",
      text: "One of your modules is getting close to the line. Check before you skip.",
    };
  }

  // --- Money, on its own screen -------------------------------------------
  // Below attendance and deadlines on purpose: an overspent week is worth
  // knowing, a module under threshold is worth acting on.
  if (ctx.screen === "money") {
    const period = ctx.budgetKind === "month" ? "month" : "week";
    switch (ctx.budget) {
      case "over":
        return {
          mood: "worried",
          text: `You're past this ${period}'s budget. Worth knowing, not a disaster.`,
        };
      case "tight":
        return { mood: "thinking", text: `Spending's running a little quick this ${period}.` };
      case "none":
        return {
          mood: "neutral",
          text: "Set a budget and I'll keep the running maths for you.",
          action: "point",
        };
    }
    if (ctx.hasCampus === false) {
      return {
        mood: "neutral",
        text: "Drop a campus pin and I'll find food close by.",
        action: "point",
      };
    }
    return { mood: "happy", text: "Money's comfortable. Enjoy lunch." };
  }

  // --- Setup nudges --------------------------------------------------------
  if (ctx.hasTimetable === false) {
    return {
      mood: "neutral",
      text: "Pop your timetable in and I can start doing something useful.",
      action: "point",
    };
  }

  if (ctx.unmarkedCount && ctx.unmarkedCount > 2) {
    return {
      mood: "thinking",
      text: `${ctx.unmarkedCount} classes are still unmarked, so my maths is guessing.`,
    };
  }

  if (ctx.isGuest && ctx.screen === "me") {
    return {
      mood: "neutral",
      text: "You're a guest right now. Add an email and all this stays yours.",
      action: "point",
    };
  }

  if (ctx.screen === "me" && !ctx.goalCount) {
    return {
      mood: "neutral",
      text: "Give me a goal and I'll find time for it.",
      action: "point",
    };
  }

  // --- Quiet days ----------------------------------------------------------
  if (ctx.nothingOnToday) {
    return { mood: "sleepy", text: "Nothing on today. Enjoy it, honestly." };
  }

  if (ctx.screen === "board") {
    return { mood: "happy", text: "Board's clear. Rare and excellent." };
  }

  if (ctx.screen === "timetable") {
    return { mood: "happy", text: "Attendance is looking healthy." };
  }

  if (ctx.screen === "home") {
    return { mood: "happy", text: "All quiet. You're on top of it." };
  }

  return null;
}
