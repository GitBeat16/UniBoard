"use client";

import { motion } from "motion/react";
import { EASE_SOFT, SOFT_SPRING } from "@/lib/motion";

/**
 * Where this call sits between "skip freely" and "definitely go".
 *
 * The gauge exists so the verdict never reads as an oracle: a marker sitting
 * near the middle is visibly a close call, which is exactly the honest answer
 * for a "your call" verdict.
 */
export function VerdictGauge({ score, tone }: { score: number; tone: string }) {
  const pct = ((Math.max(-1, Math.min(1, score)) + 1) / 2) * 100;

  return (
    <div>
      <div className="relative h-3 overflow-hidden rounded-full bg-canvas">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: tone }}
          initial={{ width: "50%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: EASE_SOFT }}
        />
        {/* Dead centre: the line between leaning go and leaning skip. */}
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink/15" />
      </div>

      <motion.div
        className="relative h-0"
        initial={{ x: "50%" }}
        animate={{ x: `${pct}%` }}
        transition={SOFT_SPRING}
      >
        <span
          className="absolute -top-[1.375rem] size-4 -translate-x-1/2 rounded-full border-2 border-paper shadow-soft"
          style={{ backgroundColor: tone }}
        />
      </motion.div>

      <div className="mt-3 flex justify-between text-caption font-semibold uppercase text-muted">
        <span>Skip is fine</span>
        <span>Go</span>
      </div>
    </div>
  );
}
