"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AddToBoard } from "@/components/board/add-to-board";
import { CampusTray } from "@/components/board/campus-tray";
import { CardSheet } from "@/components/board/card-sheet";
import { PinnedCard } from "@/components/board/pinned-card";
import { Pin } from "@/components/board/pin";
import { ShapeFrame } from "@/components/board/card-shape";
import { FloraSays } from "@/components/flora/flora-says";
import { Card } from "@/components/ui/card";
import { AnimatedNumber, Rise, Stagger } from "@/components/ui/motion-primitives";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/cn";
import { LAYOUT_SPRING } from "@/lib/motion";
import { useNow } from "@/lib/use-now";
import {
  buildBoard,
  hasTag,
  topTags,
  twoColumns,
  type BoardCard,
  type BoardEvent,
  type CardShape,
} from "@/lib/board/items";
import { outstandingHours, urgencyOf, type WorkItem } from "@/lib/work/urgency";

type Filter = "live" | "done" | "all";

export type BoardWork = WorkItem & { shape: CardShape | null };

/**
 * The soft board. Presentational: the page fetches; this decides nothing
 * itself — buildBoard() in src/lib/board/items.ts does, and is tested.
 */
export function BoardView({
  work,
  events = [],
  modules,
  university = null,
}: {
  work: BoardWork[];
  events?: BoardEvent[];
  modules: Array<{ id: string; name: string }>;
  university?: { name: string; shortName: string | null } | null;
}) {
  const now = useNow();
  const mounted = now > 0;
  const nowDate = useMemo(() => new Date(now), [now]);
  const [filter, setFilter] = useState<Filter>("live");
  const [tag, setTag] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const filterId = useId();

  const { pinned, campus } = useMemo(
    () => (mounted ? buildBoard({ work, events, now: nowDate }) : { pinned: [], campus: [] }),
    [mounted, work, events, nowDate],
  );

  const shown = pinned.filter((c) => {
    if (filter === "live" && c.urgency === "done") return false;
    if (filter === "done" && c.urgency !== "done") return false;
    return tag ? hasTag(c, tag) : true;
  });
  const [left, right] = twoColumns(shown);
  const tags = useMemo(() => topTags(pinned.filter((c) => c.urgency !== "done")), [pinned]);

  const hours = useMemo(() => outstandingHours(work, nowDate), [work, nowDate]);
  const overdue = work.filter((i) => urgencyOf(i, nowDate) === "overdue").length;
  const open = pinned.find((c) => c.key === openKey) ?? null;
  const onOpen = useCallback((c: BoardCard) => setOpenKey(c.key), []);
  const onClose = useCallback(() => setOpenKey(null), []);

  return (
    <Stagger className="flex flex-col gap-8">
      <Rise>
        <SectionHeading light="The" bold="UniBoard" />
      </Rise>

      {mounted && (
        <Rise>
          <FloraSays
            context={{
              screen: "board",
              hasTimetable: true,
              overdueCount: overdue,
              dueTodayCount: work.filter((i) => urgencyOf(i, nowDate) === "today").length,
            }}
          />
        </Rise>
      )}

      {mounted && work.length > 0 && (
        <Rise>
          <Card className="flex items-center justify-between gap-4">
            <div>
              <p className="text-caption font-semibold uppercase text-muted">Next seven days</p>
              <p className="mt-1 text-h1 font-bold tnum">
                <AnimatedNumber value={hours} decimals={hours % 1 ? 1 : 0} />
                <span className="text-h2"> h</span>
              </p>
              <p className="mt-1 text-label text-muted">of work you have estimated</p>
            </div>
            {overdue > 0 && (
              <span className="rounded-chip bg-coral px-3 py-1.5 text-caption font-semibold uppercase text-paper">
                {overdue} overdue
              </span>
            )}
          </Card>
        </Rise>
      )}

      <Rise>
        <div className="flex flex-col gap-3">
          <div className="flex gap-1 rounded-full bg-paper p-1 shadow-soft">
            {(["live", "done", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "relative flex-1 rounded-full px-3 py-2 text-label font-semibold capitalize",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  filter === f ? "text-paper" : "text-muted hover:text-ink",
                )}
              >
                {filter === f && (
                  <motion.span
                    layoutId={`${filterId}-board-filter`}
                    transition={LAYOUT_SPRING}
                    className="absolute inset-0 rounded-full bg-ink"
                  />
                )}
                <span className="relative">{f === "live" ? "Pinned" : f}</span>
              </button>
            ))}
          </div>

          {tags.length > 1 && (
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filter by tag">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => setTag((cur) => (cur === t ? null : t))}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-label font-semibold transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    tag === t ? "bg-ink text-paper" : "bg-paper text-ink shadow-soft hover:bg-ink/5",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </Rise>

      {/* ------------------------------------------------------- the board */}
      <Rise>
        <div className="board-frame">
          <div className="felt min-h-[22rem] px-3.5 pb-6 pt-7">
            {!mounted ? null : shown.length === 0 ? (
              <EmptyBoard filter={filter} filtered={tag !== null} />
            ) : (
              <div className="flex gap-3.5">
                {[left, right].map((col, c) => (
                  <ul key={c} className={cn("flex min-w-0 flex-1 flex-col gap-6", c === 1 && "pt-4")}>
                    <AnimatePresence mode="popLayout">
                      {col.map((card, i) => (
                        <PinnedCard key={card.key} card={card} index={i * 2 + c} onOpen={onOpen} />
                      ))}
                    </AnimatePresence>
                  </ul>
                ))}
              </div>
            )}
          </div>
        </div>
      </Rise>

      {mounted && (
        <Rise>
          <CampusTray events={campus} university={university} />
        </Rise>
      )}

      <Rise>
        <AddToBoard modules={modules} hasUniversity={university !== null} />
      </Rise>

      <AnimatePresence>
        {open && (
          <CardSheet key={open.key} card={open} hasUniversity={university !== null} onClose={onClose} />
        )}
      </AnimatePresence>
    </Stagger>
  );
}

/** An empty board is still a board: felt, and one note pinned to it. */
function EmptyBoard({ filter, filtered }: { filter: Filter; filtered: boolean }) {
  const text = filtered
    ? ["Nothing with that tag", "Tap the tag again to see everything."]
    : filter === "done"
      ? ["Nothing finished yet", "Submitted hand-ins and past events land here."]
      : ["Board's clear", "Pin a hand-in, an exam or an event below."];

  return (
    <div className="grid min-h-[18rem] place-items-center">
      <motion.div
        className="card-hang relative w-52"
        style={{ transformOrigin: "50% 0%", ["--tone" as string]: "var(--color-sun)" }}
        initial={{ opacity: 0, y: -30, rotate: -10 }}
        animate={{ opacity: 1, y: 0, rotate: [-10, 1.5, -2.5, -2] }}
        transition={{ duration: 0.9, times: [0, 0.45, 0.75, 1] }}
      >
        <ShapeFrame shape="sticky">
          <p className="text-body font-bold">{text[0]}</p>
          <p className="mt-1 text-label text-ink/75">{text[1]}</p>
        </ShapeFrame>
        <Pin tone="var(--color-coral)" style={{ left: "calc(50% - 11px)", top: -9 }} />
      </motion.div>
    </div>
  );
}
