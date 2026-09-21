"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { LAYOUT_SPRING } from "@/lib/motion";
import { SHAPE_LABEL, SHAPES, type CardShape } from "@/lib/board/items";

/**
 * Five tiny cards to choose from, each drawn in its real shape and tone, so
 * what you pick is what gets pinned.
 */
export function ShapePicker({
  value,
  onChange,
  tone = "var(--color-sky)",
  name,
}: {
  value: CardShape;
  onChange: (shape: CardShape) => void;
  tone?: string;
  /** When set, also submits the choice with the surrounding form. */
  name?: string;
}) {
  const id = useId();
  return (
    <div>
      {name && <input type="hidden" name={name} value={value} />}
      <div
        role="radiogroup"
        aria-label="Card shape"
        className="flex justify-between gap-2 rounded-tile bg-canvas p-2"
        style={{ ["--tone" as string]: tone }}
      >
        {SHAPES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            aria-label={SHAPE_LABEL[s]}
            title={SHAPE_LABEL[s]}
            onClick={() => onChange(s)}
            className="relative grid h-16 flex-1 place-items-center rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {value === s && (
              <motion.span
                layoutId={`${id}-shape`}
                transition={LAYOUT_SPRING}
                className="absolute inset-0 rounded-chip bg-paper shadow-soft"
              />
            )}
            <span className="card-hang relative block w-9 origin-top" style={{ transform: "rotate(-3deg)" }}>
              <span
                className={cn("card-shape block h-11", `card-${s}`)}
                // The real classes, shrunk: padding would swamp a 36px card.
                style={{ padding: 0 }}
              >
                {s === "sticky" && <span className="card-fold" style={{ width: 8, height: 8 }} />}
                {s === "tag" && <span className="card-hole" style={{ left: 6, width: 5, height: 5, marginTop: -2.5 }} />}
                {s === "polaroid" && (
                  <span className="card-photo absolute inset-x-[3px] top-[3px] block" style={{ aspectRatio: "1" }} />
                )}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
