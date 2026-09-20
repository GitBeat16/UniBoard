import type { Transition, Variants } from "motion/react";

/**
 * Motion system for "Paper & Doodle".
 *
 * The rule from PLAN.md §4: slow and soft, 250–350ms, gentle spring, nothing
 * bouncy. Overshoot reads as toy-like and fights the hand-drawn calm we are
 * after, so every spring here is critically-damped-ish.
 *
 * Everything animated in the app pulls from this file. One-off durations
 * scattered through components are how a motion system stops feeling like one.
 */

// Matches --ease-soft in globals.css so CSS transitions and JS animations agree.
export const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export const SOFT_SPRING: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 30,
  mass: 0.9,
};

/** Shared-layout moves (the nav pill, the day underline). */
export const LAYOUT_SPRING: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.7,
};

/** A card or row arriving: fade up, no scale — scale on cards looks cheap. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: EASE_SOFT },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.22, ease: EASE_SOFT },
  },
};

/** Parent that pours its children in one after another. */
export const stagger = (delayChildren = 0.04, staggerChildren = 0.06): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
});

/** Press feedback. Small — the button should feel solid, not squishy. */
export const press = { scale: 0.97 } as const;
