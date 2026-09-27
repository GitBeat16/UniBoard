import type { FloraMood } from "@/components/flora/flora";

/**
 * What Flora does while a screen loads.
 *
 * Pure: which trick, which tips, in which order. The drawing lives in
 * src/components/flora/loading; this decides, so the rules can be tested
 * without a browser.
 *
 * Two rules shape it. A loading screen is a small reward, never a toll — so
 * it only appears once a load has taken long enough to notice. And every tip
 * describes something the app actually does, because a waiting student will
 * go and try it.
 */

export type LoadingScreen = "home" | "timetable" | "board" | "money";

export type Activity =
  | "watering"
  | "pinning"
  | "counting"
  | "juggling"
  | "reading"
  | "sleeping"
  | "coins";

export const ACTIVITY: Record<Activity, { mood: FloraMood; caption: string }> = {
  watering: { mood: "happy", caption: "Watering myself while your day loads." },
  pinning: { mood: "happy", caption: "Pinning your notes back up." },
  counting: { mood: "thinking", caption: "Doing the attendance maths." },
  juggling: { mood: "cheer", caption: "Juggling your deadlines. Carefully." },
  reading: { mood: "thinking", caption: "Reading your timetable. Right way up, eventually." },
  sleeping: { mood: "sleepy", caption: "Up late too? Loading anyway." },
  coins: { mood: "thinking", caption: "Counting what's left for today." },
};

/** Each screen gets tricks that belong on it. */
const POOLS: Record<LoadingScreen, Activity[]> = {
  home: ["watering", "pinning", "counting", "juggling", "reading"],
  timetable: ["reading", "counting"],
  board: ["pinning", "juggling"],
  money: ["coins"],
};

/** She only nods off when it is actually late — never as a hint that you should. */
export function isLate(hour: number) {
  return hour >= 23 || hour < 5;
}

export function poolFor(screen: LoadingScreen, hour: number): Activity[] {
  const pool = POOLS[screen];
  return isLate(hour) ? ["sleeping", ...pool] : pool;
}

/**
 * The trick to open with. `random` is passed in (0 ≤ r < 1) so the choice is
 * testable; late at night she is always asleep first, then wakes when tapped.
 */
export function firstActivity(screen: LoadingScreen, hour: number, random: number): Activity {
  const pool = poolFor(screen, hour);
  if (pool[0] === "sleeping") return "sleeping";
  return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))];
}

/** The next trick when tapped: round the pool, never the same one twice running. */
export function nextActivity(screen: LoadingScreen, hour: number, current: Activity): Activity {
  const pool = poolFor(screen, hour);
  if (pool.length === 1) return pool[0];
  const at = pool.indexOf(current);
  return pool[(at + 1) % pool.length];
}

/**
 * Things worth knowing, one at a time under her. Every one is a real feature,
 * in her voice — never a fake "Loading 73%".
 */
export const TIPS: readonly string[] = [
  "Tap me — I usually have more than one thing to say.",
  "The pencil on any class fixes what a photo read wrong.",
  "Bring in your college's attendance figure and my maths starts from theirs.",
  "Every card on the Board can be an index card, a sticky, a polaroid…",
  "Drop a campus pin and I'll find food you can walk to.",
  "Your timetable can live in Google Calendar — the link is on Me.",
  "“Go or skip?” on any class weighs it up, both sides shown.",
  "I can make a sound. The little speaker on my bubble turns it on.",
];

/** A starting tip, from a random number, so repeat visits see different ones. */
export function firstTip(random: number) {
  return Math.min(TIPS.length - 1, Math.floor(random * TIPS.length));
}
