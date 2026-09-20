"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { LAYOUT_SPRING, SOFT_SPRING, press } from "@/lib/motion";

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekStrip({
  days,
  selected,
  onSelect,
  countFor,
  onShiftWeek,
  weekLabel,
}: {
  days: Date[];
  selected: string; // yyyy-mm-dd
  onSelect: (key: string) => void;
  countFor: (key: string) => number;
  onShiftWeek: (delta: number) => void;
  weekLabel: string;
}) {
  const pillId = useId(); // see BottomNav: layoutId is page-global

  return (
    <div>
      <div className="flex items-center justify-between">
        <Arrow direction="prev" onClick={() => onShiftWeek(-1)} />
        <motion.p
          key={weekLabel}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-label font-semibold"
        >
          {weekLabel}
        </motion.p>
        <Arrow direction="next" onClick={() => onShiftWeek(1)} />
      </div>

      <div className="mt-3 flex justify-between gap-1">
        {days.map((day) => {
          const key = dayKey(day);
          const isSelected = key === selected;
          const count = countFor(key);

          return (
            <motion.button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              whileTap={press}
              transition={SOFT_SPRING}
              aria-pressed={isSelected}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-full px-1 py-2",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                isSelected ? "text-paper" : "text-ink",
              )}
            >
              {/* One pill that slides between days, rather than five that fade. */}
              {isSelected && (
                <motion.span
                  layoutId={`${pillId}-day-pill`}
                  transition={LAYOUT_SPRING}
                  className="absolute inset-0 rounded-full bg-ink"
                />
              )}

              <span className="relative text-caption font-semibold uppercase opacity-60">
                {DAY_INITIALS[day.getDay()]}
              </span>
              <span className="relative text-label font-bold tnum">
                {day.getDate()}
              </span>

              {/* Count is shown as a number, not only a dot — a dot alone tells
                  you nothing about a five-class day. */}
              <span
                className={cn(
                  "relative text-caption tnum",
                  count === 0 && "opacity-0",
                  isSelected ? "text-paper/80" : "text-muted",
                )}
              >
                {count || "0"}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function Arrow({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={press}
      whileHover={{ x: direction === "prev" ? -2 : 2 }}
      transition={SOFT_SPRING}
      aria-label={direction === "prev" ? "Previous week" : "Next week"}
      className="grid size-9 place-items-center rounded-full bg-paper text-ink shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <svg
        viewBox="0 0 24 24"
        className={cn("size-4", direction === "next" && "rotate-180")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14.5 5.2 7.8 12l6.7 6.8" />
      </svg>
    </motion.button>
  );
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
