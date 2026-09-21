"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { EASE_SOFT, rise, stagger } from "@/lib/motion";

/** Pours its children in one after another. */
export function Stagger({
  className,
  delay = 0.04,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger(delay)}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

/** One item inside a <Stagger>. */
export function Rise({
  className,
  children,
  ...rest
}: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div className={className} variants={rise} {...rest}>
      {children}
    </motion.div>
  );
}

/** Rises when it scrolls into view, once. */
export function RiseInView({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={rise}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts up to `value`. Attendance percentages and "miss N more" are the
 * numbers people actually come to this app for — worth drawing the eye to.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(reduced ? value : 0);
  const text = useTransform(mv, (v) => v.toFixed(decimals) + suffix);
  const [display, setDisplay] = useState(
    (reduced ? value : 0).toFixed(decimals) + suffix,
  );

  useEffect(() => {
    const unsub = text.on("change", setDisplay);
    if (reduced) {
      mv.set(value);
    } else {
      const controls = animate(mv, value, {
        duration: 0.9,
        ease: EASE_SOFT,
      });
      return () => {
        controls.stop();
        unsub();
      };
    }
    return unsub;
  }, [value, mv, text, reduced]);

  return <span className={cn("tnum", className)}>{display}</span>;
}
