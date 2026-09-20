"use client";

import { MotionConfig } from "motion/react";
import { EASE_SOFT } from "@/lib/motion";

/**
 * reducedMotion="user" makes every motion component respect the OS
 * "reduce motion" setting automatically: transforms and opacity fades are
 * skipped, layout animations become instant. Vestibular disorders are common
 * enough that an app this animated has no business ignoring the preference.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.42, ease: EASE_SOFT }}
    >
      {children}
    </MotionConfig>
  );
}
