"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { EASE_SOFT } from "@/lib/motion";
import { sketchRing } from "@/lib/sketch/rough";
import { useMounted } from "@/lib/use-mounted";

/**
 * A hand-drawn donut: pencil track in ink, the value hatched in its tone, the
 * hatching drawn in stroke by stroke. Replaces the flat ProgressRing.
 *
 * Colour is never the only signal here either — callers put the number in the
 * middle and a status word beside it.
 *
 * The sketch is drawn after hydration, not in the server HTML. The geometry is
 * seeded and identical in Node, but the client bundle's rough.js was observed
 * to diverge from the server's for the same seed, which is a hydration
 * mismatch React will not repair. The hatching animates in on mount anyway,
 * and the box is sized from the first paint, so nothing shifts.
 */
export function SketchRing({
  value,
  seedKey,
  tone = "var(--color-leaf)",
  size = 72,
  thickness = 9,
  children,
}: {
  /** 0–100. */
  value: number;
  /** Stable per thing drawn (a module id, "budget"), so its wobble never changes. */
  seedKey: string;
  tone?: string;
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const mounted = useMounted();
  const sketch = useMemo(
    () => (mounted ? sketchRing({ size, thickness, value, seedKey }) : null),
    [mounted, size, thickness, value, seedKey],
  );

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {sketch && (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <g stroke="var(--color-ink)" strokeOpacity={0.8}>
            {sketch.track.map((p, i) => (
              <path key={i} d={p.d} strokeWidth={p.strokeWidth} />
            ))}
          </g>
          {/* Keyed on the value so a change redraws the hatching, like a pen. */}
          <g key={value} stroke={tone}>
            {sketch.fill.map((p, i) => (
              <motion.path
                key={i}
                d={p.d}
                strokeWidth={p.strokeWidth}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: EASE_SOFT }}
              />
            ))}
          </g>
          <g stroke="var(--color-ink)">
            {sketch.edge.map((p, i) => (
              <path key={i} d={p.d} strokeWidth={p.strokeWidth} />
            ))}
          </g>
        </svg>
      )}
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
