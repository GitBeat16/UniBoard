"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { EASE_SOFT, SOFT_SPRING, press } from "@/lib/motion";
import {
  ACTIVITY,
  firstActivity,
  firstTip,
  nextActivity,
  TIPS,
  type Activity,
  type LoadingScreen,
} from "@/lib/flora/loading";
import { useFloraEnabled, useFloraSound } from "@/lib/flora/preference";
import { play, playTap, unlock } from "@/lib/flora/sound";
import { Scene, StillScene } from "./loading/scenes";

/** Long enough that a quick load never shows her at all. */
const DELAY_MS = 400;
const TIP_MS = 3800;

const WHAT: Record<LoadingScreen, string> = {
  home: "your day",
  timetable: "your timetable",
  board: "your board",
  money: "your money",
};

/**
 * Flora, keeping you company while a screen loads.
 *
 * She is a reward for waiting, not a toll: nothing appears for the first
 * 400 ms, so a fast load goes straight from the skeleton to the page and she
 * is never seen. Past that she walks on with a trick fitted to the screen —
 * pinning on the Board, counting coins on Money — and a tip underneath about
 * something the app really does. Tap her and she does another trick.
 *
 * "overlay" floats her over a skeleton (Home, whose skeleton is the real page
 * shape); "inline" centres her where the page will be, for screens without one.
 */
export function FloraLoader({
  screen,
  variant = "inline",
}: {
  screen: LoadingScreen;
  variant?: "overlay" | "inline";
}) {
  const enabled = useFloraEnabled();
  const sound = useFloraSound();
  const still = Boolean(useReducedMotion());

  // Nothing is chosen until the delay passes, so there is nothing random on
  // the server to disagree with the browser about.
  const [activity, setActivity] = useState<Activity | null>(null);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setActivity(firstActivity(screen, new Date().getHours(), Math.random()));
      setTip(firstTip(Math.random()));
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [screen]);

  // One tip at a time. Under reduced motion the first one simply stays.
  useEffect(() => {
    if (!activity || still) return;
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), TIP_MS);
    return () => clearInterval(t);
  }, [activity, still]);

  function onTap() {
    if (!activity) return;
    const next = nextActivity(screen, new Date().getHours(), activity);
    setActivity(next);
    if (sound) {
      unlock();
      playTap();
      setTimeout(() => play(ACTIVITY[next].mood), 90);
    }
  }

  const status = <span className="sr-only">Loading {WHAT[screen]}…</span>;

  // Flora switched off: Home keeps its skeleton; elsewhere a quiet line.
  if (!enabled) {
    return variant === "overlay" ? null : (
      <div role="status" className="flex min-h-[50dvh] items-center justify-center">
        <p className="text-label text-muted motion-safe:animate-pulse">Loading {WHAT[screen]}…</p>
      </div>
    );
  }

  const card = activity && (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SOFT_SPRING}
      className="pointer-events-auto w-[19rem] max-w-full rounded-card bg-paper px-4 pb-4 pt-3 shadow-lift"
    >
      <motion.button
        type="button"
        onClick={onTap}
        whileTap={press}
        data-feedback="flora"
        aria-label="Flora — tap for another trick"
        className="block w-full rounded-tile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {/* Swapping tricks crossfades, so a tap reads as her changing her mind. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activity}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: EASE_SOFT }}
          >
            {still ? <StillScene mood={ACTIVITY[activity].mood} /> : <Scene activity={activity} />}
          </motion.div>
        </AnimatePresence>
      </motion.button>

      <p className="mt-1 text-center text-label font-semibold text-ink">
        {ACTIVITY[activity].caption}
      </p>

      {/* Fixed height, so a longer tip never makes the card jump. */}
      <div className="relative mt-2 h-10 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={tip}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE_SOFT }}
            className="absolute inset-0 text-center text-caption leading-snug text-muted"
          >
            {TIPS[tip]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-28 z-30 flex justify-center px-5",
          // Centred on the content column, not the window, beside the sidebar.
          "lg:bottom-10 lg:pl-60",
        )}
      >
        {card}
      </div>
    );
  }

  return (
    <div role="status" className="flex min-h-[60dvh] items-center justify-center">
      {status}
      {card}
    </div>
  );
}
