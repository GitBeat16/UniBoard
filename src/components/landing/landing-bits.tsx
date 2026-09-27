"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import BlurText from "@/components/reactbits/BlurText";
import CountUp from "@/components/reactbits/CountUp";
import Magnet from "@/components/reactbits/Magnet";
import RotatingText from "@/components/reactbits/RotatingText";
import ShinyText from "@/components/reactbits/ShinyText";
import { ScrollVelocity } from "@/components/reactbits/ScrollVelocity";
import { cn } from "@/lib/cn";

/**
 * The landing page's moving parts, built from React Bits and dressed in
 * UniBoard's own colours and type. The page around them stays a server
 * component; these are the only pieces that need the browser.
 */

/** The eyebrow over the headline, with a coral glint running through it. */
export function Eyebrow({ children }: { children: string }) {
  return (
    <ShinyText
      text={children}
      speed={3}
      delay={1.5}
      color="#3d4247"
      shineColor="#f2846b"
      spread={110}
      className="text-caption font-semibold uppercase tracking-wide"
    />
  );
}

/**
 * The headline arrives a word at a time, out of a blur. Two BlurTexts inside
 * one <h1>, so it is still a single heading to a screen reader and a crawler.
 */
export function HeroHeadline() {
  return (
    <h1 className="mt-4 text-[2.5rem] leading-[1.04] tracking-tight sm:text-[3.4rem] lg:text-[3.6rem] xl:text-[4rem]">
      <BlurText
        text={"Your whole uni\u00A0day,"}
        delay={90}
        direction="bottom"
        className="font-normal"
      />
      <BlurText
        text="on one board."
        delay={120}
        direction="bottom"
        className="font-bold"
        // Follows once the first line is most of the way in.
        startDelay={380}
      />
    </h1>
  );
}

/** "It keeps your ___ straight", cycling through what UniBoard keeps. */
export function RotatingLine() {
  return (
    <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[1.15rem] font-semibold sm:text-[1.35rem]">
      <span>It keeps your</span>
      <RotatingText
        texts={["timetable", "attendance", "deadlines", "budget", "lunch plans"]}
        rotationInterval={2600}
        // A quick tween, not a spring: a spring's long settle left the chip
        // empty for a third of every cycle. Measured, this keeps the word
        // readable nearly all the time.
        staggerDuration={0.012}
        staggerFrom="first"
        splitLevelClassName="overflow-hidden pb-0.5"
        mainClassName="overflow-hidden rounded-xl bg-felt px-3 py-0.5 text-paper"
        transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      />
      <span>straight.</span>
    </p>
  );
}

/**
 * A call to action that leans towards the pointer. Held still under reduced
 * motion, and a no-op on touch, which has no pointer to lean towards.
 */
export function MagneticLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "soft";
  className?: string;
}) {
  const still = Boolean(useReducedMotion());
  return (
    <Magnet padding={70} magnetStrength={4} disabled={still}>
      <Link
        href={href}
        className={cn(
          "inline-flex h-14 items-center justify-center rounded-full px-8 text-label font-semibold shadow-soft transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          variant === "primary" ? "bg-ink text-paper hover:bg-ink/90" : "bg-paper text-ink hover:bg-canvas",
          className,
        )}
      >
        {children}
      </Link>
    </Magnet>
  );
}

/**
 * Two rows of what UniBoard does, drifting in opposite directions and
 * speeding up with the scroll — on a strip of the Board's own felt.
 */
export function FeatureBand() {
  const dot = <span className="mx-5 inline-block text-coral">✦</span>;
  const row = (items: string[]) => (
    <span className="text-[1.9rem] font-bold tracking-tight md:text-[2.8rem]">
      {items.map((t) => (
        <span key={t}>
          {t}
          {dot}
        </span>
      ))}
    </span>
  );

  return (
    <div className="felt relative overflow-hidden py-6 text-paper shadow-lift md:py-8" aria-hidden="true">
      <ScrollVelocity
        texts={[
          row(["Timetable", "Attendance", "Go or skip", "Soft board", "Money", "Flora"]),
          row(["Reads the photo", "Counts from your college", "Food a walk away", "Private by default"]),
        ]}
        velocity={38}
        numCopies={4}
        className="px-0"
        scrollerClassName="!text-[inherit] !leading-tight !drop-shadow-none"
        parallaxClassName="py-1"
      />
    </div>
  );
}

/** Small, true numbers — each one something the app actually does. */
export function Numbers({
  items,
}: {
  items: Array<{ to: number; suffix?: string; label: string }>;
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
      {items.map((n) => (
        <div key={n.label} className="text-center">
          <dt className="sr-only">{n.label}</dt>
          <dd>
            <span className="block text-[3rem] font-bold leading-none tracking-tight tnum sm:text-[3.6rem]">
              <CountUp to={n.to} duration={1.6} />
              {n.suffix}
            </span>
            <span className="mt-2 block text-label text-muted" aria-hidden="true">
              {n.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "Pin your first week", blurring in when the reader reaches it. */
export function ClosingHeadline() {
  return (
    <h2 className="mt-6 flex flex-wrap justify-center text-h1 sm:text-[2.6rem] sm:leading-tight">
      <BlurText text="Pin your" delay={80} className="font-normal" />
      <span>&nbsp;</span>
      <BlurText text="first week." delay={80} startDelay={200} className="font-bold" />
    </h2>
  );
}
