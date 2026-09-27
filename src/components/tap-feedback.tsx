"use client";

import { useEffect } from "react";
import { HAPTIC, tapKindOf, vibrate } from "@/lib/feedback";
import { readHaptics, readSound } from "@/lib/flora/preference";
import { playClick, unlock } from "@/lib/flora/sound";

/**
 * Sound and haptics for every tap, from one listener.
 *
 * Wiring each button would mean remembering it on every button ever added;
 * one capture-phase listener on the document covers them all, including the
 * ones that do not exist yet. Anything can opt out with data-feedback="none",
 * and Flora marks herself data-feedback="flora" for her own bump — her voice
 * she plays herself, so the listener gives her only the buzz.
 *
 * pointerdown rather than click, so the feedback lands with the finger, not
 * after it lifts. It is also a user gesture, which is the one place a browser
 * lets audio start — so every tap keeps her voice ready to play.
 */
export function TapFeedback() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      const kind = tapKindOf(e.target instanceof Element ? e.target : null);
      if (!kind) return;

      // A buzz is motion you feel; reduced motion switches it off too.
      if (readHaptics() && !reduced.matches && e.pointerType !== "mouse") {
        vibrate(HAPTIC[kind]);
      }
      if (readSound()) {
        unlock();
        if (kind === "tap") playClick();
      }
    }

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);

  return null;
}
