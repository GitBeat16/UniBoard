"use client";

import { useEffect, useState } from "react";
import type { FloraReaction } from "./lines";

/**
 * How a screen tells Flora what just happened.
 *
 * A module-level channel rather than context or props: the thing that knows a
 * class was marked is a card three levels down a list, and Flora lives at the
 * top of the page. Threading a callback between them would put her in the
 * signature of every component in between, for a message that is genuinely
 * fire-and-forget.
 *
 * Reactions are deliberately short-lived. She answers while the action is
 * still on screen, then goes back to whatever she was saying — a mascot still
 * congratulating you a minute later is a mascot you stop reading.
 */

const LIFETIME_MS = 6_000;

type Listener = (reaction: FloraReaction) => void;

const listeners = new Set<Listener>();

export function tellFlora(reaction: FloraReaction) {
  listeners.forEach((l) => l(reaction));
}

/** The reaction to show right now, or null. */
export function useFloraReaction(): FloraReaction | null {
  const [reaction, setReaction] = useState<FloraReaction | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const listener: Listener = (next) => {
      setReaction(next);
      clearTimeout(timer);
      timer = setTimeout(() => setReaction(null), LIFETIME_MS);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      clearTimeout(timer);
    };
  }, []);

  return reaction;
}
