"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import { SketchRing } from "@/components/charts/sketch-ring";
import { IconAttendance, IconBoard, IconMoney } from "@/components/ui/icons";
import { AnimatedNumber } from "@/components/ui/motion-primitives";
import { cn } from "@/lib/cn";
import { markStreak, weekStrip, type DaySession } from "@/lib/home/day";
import {
  currentBudget,
  formatMoney,
  summarize,
  type Budget,
  type Expense,
} from "@/lib/money/budget";
import { SOFT_SPRING } from "@/lib/motion";

/**
 * Four numbers worth a glance, each a door to the screen that owns it.
 *
 * Every figure is worked out by the same code its own screen uses — the money
 * tile runs the Money screen's summarize(), attendance comes from the same
 * counts as the Timetable's rings — so Home can never disagree with the page
 * behind it.
 */
export function GlanceTiles({
  now,
  sessions,
  overall,
  dueThisWeek,
  budgets,
  expenses,
  currency,
}: {
  now: number;
  sessions: DaySession[];
  overall: { attended: number; held: number };
  dueThisWeek: number;
  budgets: Budget[];
  expenses: Expense[];
  currency: string;
}) {
  const date = useMemo(() => new Date(now), [now]);
  const percent = overall.held > 0 ? (overall.attended / overall.held) * 100 : null;

  const money = useMemo(() => {
    const budget = currentBudget(budgets, date);
    return budget ? summarize(budget, expenses, date) : null;
  }, [budgets, expenses, date]);

  const streak = useMemo(() => markStreak(sessions, date), [sessions, date]);

  return (
    <ul className="grid grid-cols-2 gap-3">
      <Tile href="/timetable" label="Attendance" hint={percent === null ? "Mark a class to start" : "Overall so far"}>
        <div className="flex items-center gap-3">
          <SketchRing
            value={percent ?? 0}
            seedKey="home-overall"
            size={48}
            thickness={7}
            tone={percent !== null && percent < 75 ? "var(--color-coral)" : "var(--color-leaf)"}
          >
            <IconAttendance className="size-4" />
          </SketchRing>
          <span className="text-h2 font-bold tnum">
            {percent === null ? "—" : <AnimatedNumber value={percent} suffix="%" />}
          </span>
        </div>
      </Tile>

      <Tile
        href="/money"
        label="Money"
        hint={
          !money
            ? "Set a budget"
            : money.leftToday < 0
              ? "Over today's share"
              : "Left for today"
        }
        tone={money && money.leftToday < 0 ? "coral" : undefined}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-sun-soft">
            <IconMoney className="size-6" />
          </span>
          <span className="truncate text-h2 font-bold tnum">
            {money ? formatMoney(Math.abs(money.leftToday), currency, { round: true }) : "—"}
          </span>
        </div>
      </Tile>

      <Tile href="/board" label="Board" hint={dueThisWeek === 0 ? "Nothing due this week" : "Due this week"}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-coral-soft">
            <IconBoard className="size-6" />
          </span>
          <span className="text-h2 font-bold tnum">
            <AnimatedNumber value={dueThisWeek} />
          </span>
        </div>
      </Tile>

      <Tile
        href="/timetable"
        label="Streak"
        hint={streak === 0 ? "Mark today's classes to start" : streak === 1 ? "Day with everything marked" : "Days with everything marked"}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-leaf-soft">
            <Sprout grown={Math.min(1, streak / 7)} />
          </span>
          <span className="text-h2 font-bold tnum">
            <AnimatedNumber value={streak} />
            {streak >= 30 && "+"}
          </span>
        </div>
      </Tile>
    </ul>
  );
}

function Tile({
  href,
  label,
  hint,
  tone,
  children,
}: {
  href: string;
  label: string;
  hint: string;
  tone?: "coral";
  children: React.ReactNode;
}) {
  return (
    <li>
      <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} transition={SOFT_SPRING} className="h-full">
        <Link
          href={href}
          className="flex h-full flex-col rounded-tile bg-paper p-4 shadow-soft hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="text-caption font-semibold uppercase text-muted">{label}</span>
          <div className="mt-2">{children}</div>
          <span className={cn("mt-2 text-caption leading-snug", tone === "coral" ? "text-coral" : "text-muted")}>
            {hint}
          </span>
        </Link>
      </motion.div>
    </li>
  );
}

/** A sprout that grows with the streak — a week of marking is a full plant. */
function Sprout({ grown }: { grown: number }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="var(--color-ink)" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M12 21 V11" />
      <path d="M12 14 C 8 14, 6 11, 6 8 C 9 8, 12 10, 12 14 Z" fill="var(--color-leaf)" />
      <path
        d="M12 12 C 16 12, 18 9, 18 6 C 15 6, 12 8, 12 12 Z"
        fill="var(--color-leaf)"
        style={{ opacity: 0.35 + grown * 0.65, transform: `scale(${0.6 + grown * 0.4})`, transformOrigin: "12px 12px" }}
      />
    </svg>
  );
}

// ------------------------------------------------------------------- week

/**
 * This week as seven squares: shaded by how full each day is, a leaf on each
 * day that was fully marked, and today outlined.
 */
export function WeekAtAGlance({ now, sessions }: { now: number; sessions: DaySession[] }) {
  const days = useMemo(() => weekStrip(sessions, new Date(now)), [sessions, now]);
  const total = days.reduce((n, d) => n + d.count, 0);

  return (
    <section className="rounded-tile bg-paper p-4 shadow-soft">
      <div className="flex items-baseline justify-between">
        <h2 className="text-caption font-semibold uppercase text-muted">This week</h2>
        <span className="text-caption text-muted tnum">
          {total} {total === 1 ? "class" : "classes"}
        </span>
      </div>
      <ol className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <li key={d.key} className="flex flex-col items-center gap-1">
            <span className={cn("text-[0.68rem] font-bold", d.isToday ? "text-ink" : "text-muted")}>{d.letter}</span>
            <span
              title={`${d.count} ${d.count === 1 ? "class" : "classes"}${d.complete ? ", all marked" : ""}`}
              className={cn(
                "relative grid aspect-square w-full max-w-10 place-items-center rounded-lg text-caption font-semibold tnum",
                shade(d.count),
                d.isToday && "ring-2 ring-ink ring-offset-1 ring-offset-paper",
              )}
            >
              {d.date.getDate()}
              {d.complete && (
                <span className="absolute -right-1 -top-1" aria-label="All marked">
                  <svg viewBox="0 0 12 12" className="size-3.5" aria-hidden="true">
                    <path d="M6 11 C 2 11, 1 7, 1 4 C 5 4, 7 6, 6 11 Z M6 11 C 7 7, 9 5, 11 4 C 11 8, 9 11, 6 11 Z" fill="var(--color-leaf)" stroke="var(--color-ink)" strokeWidth={0.8} />
                  </svg>
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** How full a day is, as a wash of sky. */
function shade(count: number) {
  if (count === 0) return "bg-canvas text-muted";
  if (count <= 2) return "bg-sky-soft text-ink";
  if (count <= 4) return "bg-sky/45 text-ink";
  return "bg-sky/75 text-ink";
}
