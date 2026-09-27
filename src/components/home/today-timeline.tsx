"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { nowPosition, todayTimeline, type ClassState, type DaySession } from "@/lib/home/day";
import { toneBg, type Tone } from "@/lib/tones";
import { SESSION_TYPE_LABEL } from "@/lib/view-models";
import type { Enums } from "@/lib/supabase/database.types";

export type TimelineSession = DaySession & {
  moduleName: string;
  tone: Tone;
  type: Enums<"session_type">;
  room: string | null;
};

const STATE: Record<ClassState, { label: string; chip: string } | null> = {
  attended: { label: "Went", chip: "bg-leaf-soft text-leaf" },
  missed: { label: "Missed", chip: "bg-coral-soft text-coral" },
  excused: { label: "Excused", chip: "bg-canvas text-muted" },
  unmarked: { label: "Mark it", chip: "bg-sun-soft text-ink" },
  now: { label: "On now", chip: "bg-leaf text-paper" },
  later: null,
};

const clock = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/**
 * The whole of today, left to right.
 *
 * The ticket below says what is next; this says what the day looks like —
 * what is done, what is on, where lunch falls, how much is left. It scrolls
 * sideways on a phone and opens on the class that matters now, so the
 * morning's classes are a swipe back rather than in the way.
 *
 * Above it, a rail with the day's first and last times and a dot for now,
 * gliding as the day goes.
 */
export function TodayTimeline({ sessions, now }: { sessions: TimelineSession[]; now: number }) {
  const still = Boolean(useReducedMotion());
  const date = useMemo(() => new Date(now), [now]);
  const items = useMemo(() => todayTimeline(sessions, date), [sessions, date]);
  const position = useMemo(() => nowPosition(sessions, date), [sessions, date]);

  const classes = items.filter((i) => i.kind === "class");
  const marked = classes.filter(
    (i) => i.kind === "class" && ["attended", "missed", "excused"].includes(i.state),
  ).length;
  const past = classes.filter((i) => i.kind === "class" && i.state !== "later").length;

  // Open on whatever is happening now, or next.
  const track = useRef<HTMLOListElement>(null);
  const focusIndex = items.findIndex(
    (i) =>
      (i.kind === "class" && (i.state === "now" || i.state === "later")) ||
      (i.kind === "gap" && i.from <= date && i.to > date),
  );
  useEffect(() => {
    const el = track.current?.children[focusIndex] as HTMLElement | undefined;
    if (!el || !track.current) return;
    track.current.scrollTo({
      left: Math.max(0, el.offsetLeft - 16),
      behavior: still ? "auto" : "smooth",
    });
  }, [focusIndex, still]);

  if (classes.length === 0) {
    return (
      <section className="rounded-card bg-paper px-5 py-4 shadow-soft">
        <h2 className="text-caption font-semibold uppercase text-muted">Today</h2>
        <p className="mt-1 text-body font-semibold">No classes today.</p>
        <p className="text-label text-muted">The week below shows what is coming.</p>
      </section>
    );
  }

  const first = classes[0].kind === "class" ? classes[0].session.startsAt : date;
  const lastItem = classes[classes.length - 1];
  const last = lastItem.kind === "class" ? lastItem.session.endsAt : date;

  return (
    <section className="rounded-card bg-paper py-4 shadow-soft">
      <div className="flex items-baseline justify-between gap-3 px-5">
        <h2 className="text-caption font-semibold uppercase text-muted">
          Today · {classes.length} {classes.length === 1 ? "class" : "classes"}
        </h2>
        {past > 0 && (
          <p className="text-caption font-semibold text-muted tnum">
            {marked} of {past} marked
          </p>
        )}
      </div>

      {/* The rail: first class to last, with now gliding along it. */}
      <div className="mt-3 flex items-center gap-2 px-5 text-caption text-muted tnum">
        <span>{clock(first)}</span>
        <div className="relative h-1.5 flex-1 rounded-full bg-canvas">
          {position !== null && (
            <>
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full bg-leaf/60"
                initial={false}
                animate={{ width: `${position * 100}%` }}
                transition={{ duration: still ? 0 : 0.8, ease: "easeOut" }}
              />
              <motion.span
                aria-label="Now"
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-leaf shadow"
                initial={false}
                animate={{ left: `${position * 100}%` }}
                transition={{ duration: still ? 0 : 0.8, ease: "easeOut" }}
              />
            </>
          )}
        </div>
        <span>{clock(last)}</span>
      </div>

      <ol
        ref={track}
        className="mt-3 flex snap-x gap-2.5 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) =>
          item.kind === "gap" ? (
            <li
              key={`gap-${i}`}
              className={cn(
                "flex w-20 shrink-0 snap-start flex-col items-center justify-center rounded-tile border-2 border-dashed px-2 text-center",
                item.from <= date && item.to > date ? "border-leaf text-ink" : "border-hairline text-muted",
              )}
            >
              <span className="text-caption font-semibold uppercase">{item.label}</span>
              <span className="text-caption tnum">
                {Math.round((item.to.getTime() - item.from.getTime()) / 60_000)}m
              </span>
            </li>
          ) : (
            // A fixed width to swipe through on a phone; on a laptop the day
            // shares the row, so it never scrolls when it all fits.
            <li key={item.session.id} className="w-40 shrink-0 snap-start @4xl:w-auto @4xl:min-w-36 @4xl:flex-1">
              <Link
                href={`/timetable/${item.session.id}`}
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-tile bg-canvas py-3 pl-4 pr-3",
                  "hover:bg-hairline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  item.state === "now" && "bg-leaf-soft ring-2 ring-leaf",
                  (item.state === "attended" || item.state === "excused") && "opacity-70",
                )}
              >
                <span className={cn("absolute inset-y-0 left-0 w-1.5", toneBg[item.session.tone])} aria-hidden="true" />
                <span className="text-caption font-semibold text-muted tnum">
                  {clock(item.session.startsAt)}
                </span>
                <span className="mt-0.5 line-clamp-2 text-label font-bold leading-snug">
                  {item.session.moduleName}
                </span>
                <span className="mt-0.5 truncate text-caption text-muted">
                  {SESSION_TYPE_LABEL[item.session.type]}
                  {item.session.room ? ` · ${item.session.room}` : ""}
                </span>
                {STATE[item.state] && (
                  <span
                    className={cn(
                      "mt-2 self-start rounded-chip px-2 py-0.5 text-[0.68rem] font-bold uppercase",
                      STATE[item.state]!.chip,
                    )}
                  >
                    {STATE[item.state]!.label}
                  </span>
                )}
              </Link>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
