"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { skyArc, skyPhase, type SkyPhase } from "@/lib/home/day";

/**
 * The top of Home: a sky that follows the student's clock.
 *
 * Dawn, day, dusk and night each get their own soft wash, and the sun (or
 * the moon) sits on its arc for the hour — so opening the app at 7am and at
 * 10pm feel like different moments, without a single extra word on screen.
 *
 * Every wash stays light, so the ink greeting reads at every hour; night is
 * a lavender sky with stars, not a dark mode.
 */
const WASH: Record<SkyPhase, string> = {
  dawn: "linear-gradient(160deg, var(--color-sun-soft) 0%, var(--color-coral-soft) 45%, var(--color-sky-soft) 100%)",
  day: "linear-gradient(170deg, var(--color-sky-soft) 0%, #f4f9fe 55%, var(--color-paper) 100%)",
  dusk: "linear-gradient(160deg, var(--color-coral-soft) 0%, var(--color-iris-soft) 55%, var(--color-sky-soft) 100%)",
  night: "linear-gradient(165deg, #e3dff7 0%, var(--color-iris-soft) 50%, var(--color-sky-soft) 100%)",
};

/** A few stars, placed by hand so they never land on the greeting. */
const STARS = [
  { x: 62, y: 14, r: 1.6, d: 0 },
  { x: 74, y: 30, r: 1.1, d: 0.8 },
  { x: 86, y: 12, r: 1.4, d: 1.6 },
  { x: 93, y: 38, r: 1, d: 0.4 },
  { x: 68, y: 46, r: 0.9, d: 1.2 },
];

export function HomeSky({
  hour,
  minute,
  children,
  className,
}: {
  /** The viewer's hour, or null before the clock is known (the server's render). */
  hour: number | null;
  minute?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const still = Boolean(useReducedMotion());
  const phase = hour === null ? "day" : skyPhase(hour);
  const arc = hour === null ? 0.5 : skyArc(hour, minute);
  const isNight = phase === "night";

  // The body travels the right-hand part of the sky, well clear of the words.
  const left = 58 + arc * 34; // %
  const top = 58 - Math.sin(Math.PI * arc) * 42; // %

  return (
    <section
      className={cn("relative isolate overflow-hidden rounded-card px-5 pb-5 pt-6 shadow-soft @2xl:px-8 @2xl:pt-8", className)}
      style={{ backgroundImage: WASH[phase], transition: "background-image 1s" }}
    >
      {/* sun or moon */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10"
        initial={false}
        animate={{ left: `${left}%`, top: `${top}%` }}
        transition={{ duration: still ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ translateX: "-50%", translateY: "-50%" }}
      >
        {isNight ? <Moon /> : <Sun still={still} dawn={phase === "dawn" || phase === "dusk"} />}
      </motion.div>

      {isNight &&
        STARS.map((s, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute -z-10 rounded-full bg-ink/55"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2.6, height: s.r * 2.6 }}
            animate={still ? undefined : { opacity: [0.25, 0.8, 0.25] }}
            transition={{ duration: 3.2, delay: s.d, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

      {/* Soft hills along the bottom, for Flora to stand on. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 60"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-16 w-full"
      >
        <path d="M0 42 C 70 22, 140 30, 210 38 S 340 24, 400 32 V60 H0 Z" fill="var(--color-paper)" opacity="0.55" />
        <path d="M0 50 C 90 38, 180 46, 260 50 S 360 42, 400 46 V60 H0 Z" fill="var(--color-paper)" opacity="0.85" />
      </svg>

      {children}
    </section>
  );
}

function Sun({ still, dawn }: { still: boolean; dawn: boolean }) {
  return (
    <motion.div
      className="relative size-14 @2xl:size-20"
      animate={still ? undefined : { rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, var(--color-sun) 0 38%, ${dawn ? "rgba(242,132,107,0.25)" : "rgba(245,206,114,0.35)"} 40%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}

function Moon() {
  // A crescent cut out of the disc with a mask, so no second shape has to
  // guess the colour of the sky behind it.
  return (
    <span
      className="block size-11 rounded-full bg-paper shadow-[0_0_24px_6px_rgba(255,255,255,0.55)] @2xl:size-14"
      style={{
        WebkitMaskImage: "radial-gradient(circle at 72% 30%, transparent 52%, #000 53%)",
        maskImage: "radial-gradient(circle at 72% 30%, transparent 52%, #000 53%)",
      }}
    />
  );
}
