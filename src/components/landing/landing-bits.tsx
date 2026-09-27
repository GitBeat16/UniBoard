"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import BlurText from "@/components/reactbits/BlurText";
import CountUp from "@/components/reactbits/CountUp";
import Magnet from "@/components/reactbits/Magnet";
import RotatingText from "@/components/reactbits/RotatingText";
import ShinyText from "@/components/reactbits/ShinyText";
import TextPressure from "@/components/reactbits/TextPressure";
import { ScrollVelocity } from "@/components/reactbits/ScrollVelocity";
import { cn } from "@/lib/cn";
import { EASE_SOFT } from "@/lib/motion";

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
 * The headline, pressed: each letter swells, widens and leans toward the
 * pointer (React Bits TextPressure), and on a phone the pressure drifts
 * across on its own. Two lines, each justified to the column's width — so
 * "on one board." comes out larger than the line above it.
 *
 * The letters are split into spans for the effect, so a screen reader gets
 * the sentence once, from the visually hidden h1.
 */
export function HeroHeadline({ fontFamily }: { fontFamily: string }) {
  const line = {
    fontFamily,
    flex: true,
    alpha: false,
    stroke: false,
    width: true,
    weight: true,
    italic: true,
    textColor: "#111111",
    strokeColor: "#ff0000",
    minFontSize: 36,
    // Never thinner than a light weight or narrower than condensed, so the
    // sentence reads at rest; the full swell still happens under the pointer.
    weightRange: [300, 700],
    widthRange: [55, 110],
    as: "p",
  } as const;
  return (
    <>
      <h1 className="sr-only">Your whole uni day, on one board.</h1>
      <div aria-hidden="true" className="mt-4 flex flex-col gap-1 leading-none">
        <TextPressure text="Your whole uni day," {...line} />
        <TextPressure text="on one board." {...line} />
      </div>
    </>
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

/**
 * The page header, pinned to the top. It sits bare over the hero and gains a
 * frosted backing and a hairline once the page scrolls, so the links stay
 * readable over everything below.
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-hairline/80 bg-canvas/80 backdrop-blur-md" : "border-transparent",
      )}
    >
      {children}
    </header>
  );
}

/**
 * Fades a block up the first time it scrolls into view. Without JavaScript
 * the page's <noscript> rule shows it as it is.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={cn("reveal", className)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.55, ease: EASE_SOFT, delay }}
    >
      {children}
    </motion.div>
  );
}
