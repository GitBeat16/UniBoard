"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Flora } from "./flora";
import { cn } from "@/lib/cn";
import { EASE_SOFT, SOFT_SPRING, press } from "@/lib/motion";
import {
  hasSomethingNew,
  isStale,
  nextObservation,
  observations,
  type FloraContext,
  type Observation,
  type SpeechLog,
} from "@/lib/flora/lines";
import { useFloraReaction } from "@/lib/flora/bus";
import { play, playTap, silence, unlock } from "@/lib/flora/sound";
import {
  setFloraEnabled,
  setFloraSound,
  useFloraEnabled,
  useFloraSound,
} from "@/lib/flora/preference";

/**
 * How long she leaves a thought up before offering an unsaid one.
 *
 * Long on purpose. Text that rewrites itself while you are reading it is
 * restless, and every change is announced to a screen reader — so she only
 * interrupts for something she has never said, and waits to be tapped for the
 * rest.
 */
const DWELL_MS = 90_000;

/**
 * Flora, and what she has to say.
 *
 * She is not a static caption. She reads what is on the screen, says the most
 * useful thing about it, and then — tapped, or left alone long enough — moves
 * on to the next thing rather than repeating herself. When something happens
 * she answers it while it is still on screen.
 *
 * What she will not do: talk over you. She says one thing at a time, waits
 * three quarters of a minute before offering another, and everything about
 * her can be switched off and stays off.
 */
export function FloraSays({
  context,
  className,
  size = "sm",
}: {
  context: FloraContext;
  className?: string;
  size?: "sm" | "md";
}) {
  const enabled = useFloraEnabled();
  const sound = useFloraSound();
  const reaction = useFloraReaction();
  const stillness = useReducedMotion();

  // The context object is rebuilt on every render by its parent, so what it
  // says is the dependency, not its identity.
  const signature = `${JSON.stringify(context)}|${reaction ?? ""}`;
  const all = useMemo(
    () => observations({ ...context, reaction }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );

  const [current, setCurrent] = useState<Observation | null>(null);
  // True when she has a thought she has never used — what the nudge is for.
  const [fresh, setFresh] = useState(false);
  const spoken = useRef<SpeechLog>({});

  const say = useCallback(
    (next: Observation | null, withSound: boolean, from: Observation[]) => {
      if (!next) return;
      spoken.current = { ...spoken.current, [next.id]: Date.now() };
      setCurrent(next);
      setFresh(hasSomethingNew(from, { spoken: spoken.current, currentId: next.id }));
      if (withSound) play(next.mood);
    },
    [],
  );

  // Arrive with her best line, and answer anything that happens after.
  useEffect(() => {
    const next = nextObservation(all, {
      now: Date.now(),
      spoken: spoken.current,
      currentId: current?.id ?? null,
    });
    // She moves when the line she is showing has stopped being true — a
    // reaction that has lapsed, or a count that has just been fixed. Leaving
    // it up would have her asserting something the screen disagrees with.
    const stale = isStale(all, current?.id);

    // Otherwise she only interrupts for a reaction or for her opening line,
    // so a re-render never makes her blurt.
    if (!current || stale || next?.repeatAfterMs === 0) {
      say(next, sound && Boolean(current) && !stale, all);
    } else {
      setFresh(hasSomethingNew(all, { spoken: spoken.current, currentId: current.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  // Left alone, she moves on — but only to something she has never said.
  useEffect(() => {
    if (!current) return;
    const timer = setInterval(() => {
      if (!hasSomethingNew(all, { spoken: spoken.current, currentId: current.id })) return;
      const next = nextObservation(all, {
        now: Date.now(),
        spoken: spoken.current,
        currentId: current.id,
      });
      if (next && next.id !== current.id) say(next, false, all);
    }, DWELL_MS);
    return () => clearInterval(timer);
  }, [all, current, say]);

  function onTap() {
    // A gesture is the only place a browser will let audio start.
    if (sound) {
      unlock();
      playTap();
    }
    say(
      nextObservation(all, {
        now: Date.now(),
        spoken: spoken.current,
        currentId: current?.id ?? null,
      }),
      sound,
      all,
    );
  }

  function toggleSound() {
    const on = !sound;
    setFloraSound(on);
    if (on) {
      unlock();
      // Answer the switch itself, so it is obvious what was turned on.
      setTimeout(() => play(current?.mood ?? "happy"), 60);
    } else {
      silence();
    }
  }

  if (!enabled || !current) return null;

  return (
    <div className={cn("flex items-end gap-1", className)}>
      <motion.button
        type="button"
        onClick={onTap}
        whileTap={press}
        // A nudge, not a jump: enough to catch the eye at the edge of vision.
        animate={fresh && !stillness ? { y: [0, -5, 0] } : { y: 0 }}
        transition={
          fresh && !stillness
            ? { duration: 1.6, repeat: Infinity, ease: EASE_SOFT, repeatDelay: 2.4 }
            : SOFT_SPRING
        }
        // Labelled by what a tap would actually do, so it is never a promise
        // of a thought she does not have.
        aria-label={
          fresh
            ? "Flora has something else to say"
            : all.length > 1
              ? "Ask Flora for another thought"
              : "Flora"
        }
        data-feedback="flora"
        className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        <Flora mood={current.mood} size={size} action={current.action ?? "idle"} />
        {fresh && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 size-2.5 rounded-full bg-coral ring-2 ring-canvas"
          />
        )}
      </motion.button>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: -8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 8, scale: 0.96 }}
          transition={{ duration: 0.3, ease: EASE_SOFT }}
          className="relative mb-3 flex-1 rounded-tile rounded-bl-md bg-paper p-4 pr-16 shadow-soft"
        >
          {/* Tail, drawn as a rotated square so it inherits the card's colour */}
          <span
            aria-hidden="true"
            className="absolute -left-1.5 bottom-3 size-3 rotate-45 bg-paper"
          />
          {/* Polite: her line is announced once, not on every idle change. */}
          <p className="relative text-label text-ink" aria-live="polite">
            {current.text}
          </p>

          <div className="absolute -top-1 right-2 flex gap-1">
            <motion.button
              type="button"
              onClick={toggleSound}
              whileTap={press}
              transition={SOFT_SPRING}
              aria-pressed={sound}
              aria-label={sound ? "Mute sounds" : "Turn sounds on"}
              className="grid size-6 place-items-center rounded-full bg-canvas text-muted hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Speaker on={sound} />
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setFloraEnabled(false)}
              whileTap={press}
              transition={SOFT_SPRING}
              aria-label="Hide Flora"
              className="grid size-6 place-items-center rounded-full bg-canvas text-caption font-bold text-muted hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              ×
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Speaker({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5.5 6.5 9H4v6h2.5L11 18.5Z" />
      {on ? (
        <>
          <path d="M14.8 9.4a3.6 3.6 0 0 1 0 5.2" />
          <path d="M17.4 6.9a7 7 0 0 1 0 10.2" />
        </>
      ) : (
        <path d="m15.5 10 4 4m0-4-4 4" />
      )}
    </svg>
  );
}

/** Flora on her own, no bubble — for empty states and the sign-in screen. */
export function FloraSolo({
  mood = "happy",
  size = "md",
  action = "idle",
  className,
}: {
  mood?: Parameters<typeof Flora>[0]["mood"];
  size?: Parameters<typeof Flora>[0]["size"];
  action?: Parameters<typeof Flora>[0]["action"];
  className?: string;
}) {
  const enabled = useFloraEnabled();
  if (!enabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SOFT_SPRING}
      className={className}
    >
      <Flora mood={mood} size={size} action={action} />
    </motion.div>
  );
}
