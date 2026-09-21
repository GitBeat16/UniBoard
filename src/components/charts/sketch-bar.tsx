"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { EASE_SOFT } from "@/lib/motion";
import { sketchBar } from "@/lib/sketch/rough";

/**
 * A hand-drawn horizontal bar that fills its container's width.
 *
 * The geometry needs real pixels (stretching a sketch with viewBox scaling
 * flattens the hatching angle), so it measures itself and draws once it knows
 * its width. Until then it holds its height, so nothing jumps.
 */
export function SketchBar({
  value,
  seedKey,
  tone,
  height = 18,
  className,
}: {
  value: number;
  seedKey: string;
  tone: string;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      // Whole pixels: sub-pixel resizes would otherwise redraw the wobble.
      setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sketch = useMemo(
    () => (width > 0 ? sketchBar({ width, height, value, seedKey }) : null),
    [width, height, value, seedKey],
  );

  return (
    <div ref={ref} className={className} style={{ height }}>
      {sketch && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="block"
        >
          <g stroke="var(--color-ink)" strokeOpacity={0.8}>
            {sketch.track.map((p, i) => (
              <path key={i} d={p.d} strokeWidth={p.strokeWidth} />
            ))}
          </g>
          <g key={value} stroke={tone}>
            {sketch.fill.map((p, i) => (
              <motion.path
                key={i}
                d={p.d}
                strokeWidth={p.strokeWidth}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: EASE_SOFT }}
              />
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
