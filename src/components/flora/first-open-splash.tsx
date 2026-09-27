"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { Scene } from "./loading/scenes";
import { SPLASH_KEY } from "@/lib/flora/splash";

/** Long enough to register as a moment, short enough never to feel like a wait. */
const MIN_MS = 1200;

/**
 * The moment the app opens: the logo, Flora watering her sprout, one line.
 *
 * Once per browser session — opening UniBoard is an occasion, the fifth tab
 * change of the morning is not. It is drawn on the server and so is on screen
 * from the first paint, before any JavaScript; the inline script in the
 * layout hides it before paint on a reload within the same session, so it
 * never flashes.
 *
 * It lifts once the app is ready and at least 1.2 s have passed since the
 * page was asked for. If the app's JavaScript never arrives, CSS lifts it
 * after six seconds anyway (see .first-splash in globals.css) — a splash that
 * could trap you is worse than none.
 */
export function FirstOpenSplash() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_KEY) === "1";
    } catch {
      // No storage (private mode): show it, just not remembered.
    }
    if (seen) {
      const t = setTimeout(() => setGone(true), 0);
      return () => clearTimeout(t);
    }

    // performance.now() counts from the moment the page was asked for.
    const wait = Math.max(0, MIN_MS - performance.now());
    const lift = setTimeout(() => {
      setLeaving(true);
      try {
        sessionStorage.setItem(SPLASH_KEY, "1");
      } catch {
        // Fine — it shows again next time.
      }
    }, wait);
    const remove = setTimeout(() => setGone(true), wait + 450);
    return () => {
      clearTimeout(lift);
      clearTimeout(remove);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      role="status"
      aria-label="Opening UniBoard"
      className={cn(
        "first-splash fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-canvas px-6",
        leaving && "is-leaving",
      )}
    >
      {/* Drawn complete, not animated in: the splash has to read before any JavaScript runs. */}
      <Logo size={52} animated={false} />
      <div className="splash-flora">
        <Scene activity="watering" />
      </div>
      <p className="text-label font-semibold text-ink">Getting your day ready…</p>
    </div>
  );
}
