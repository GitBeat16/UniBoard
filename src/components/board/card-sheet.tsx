"use client";

import { useEffect, useRef, useTransition } from "react";
import { motion } from "motion/react";
import { IconClose, IconLocation, IconUsers } from "@/components/ui/icons";
import { LocalTime } from "@/components/ui/local-time";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/cn";
import { EASE_SOFT, SOFT_SPRING } from "@/lib/motion";
import type { BoardCard, CardShape } from "@/lib/board/items";
import { URGENCY_COPY } from "@/lib/work/urgency";
import {
  markEvent,
  removeEvent,
  removeWork,
  setAssignmentStatus,
  setCardShape,
  setEventShared,
} from "@/app/(app)/board/actions";
import { ShapePicker } from "./shape-picker";

/**
 * Everything about one card, and what can be done with it. What is offered
 * depends on whose it is: your own work and events can be changed or removed;
 * a classmate's shared event can only be unpinned from your board or hidden.
 */
export function CardSheet({
  card,
  hasUniversity,
  onClose,
}: {
  card: BoardCard;
  hasUniversity: boolean;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = (fn: () => Promise<void>, close = false) =>
    start(async () => {
      await fn();
      if (close) onClose();
    });

  const ev = card.event;
  const w = card.work;
  const mine = card.kind !== "event" || ev?.mine;
  const tone = `var(--color-${card.tone})`;
  const urgency = URGENCY_COPY[card.urgency];

  return (
    <div className="fixed inset-0 z-40">
      <motion.button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/35"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-sheet-title"
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto",
          "rounded-t-[2rem] bg-paper px-6 pb-10 pt-4 shadow-lift",
          pending && "opacity-80",
        )}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%", transition: { duration: 0.25, ease: EASE_SOFT } }}
        transition={SOFT_SPRING}
        style={{ ["--tone" as string]: tone }}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-hairline" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-caption font-semibold uppercase text-muted">
              <span className="size-2.5 rounded-full" style={{ background: tone }} aria-hidden="true" />
              {card.kind === "assignment" ? "Hand-in" : card.kind === "exam" ? "Exam" : "Event"}
              <span className={cn("rounded-chip px-2 py-0.5", urgency.chip)}>
                {card.kind === "event" && card.urgency === "done" ? "Ended" : urgency.label}
              </span>
            </p>
            <h2 id="card-sheet-title" className="mt-2 text-h2 font-bold">
              {card.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-canvas hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <IconClose className="size-5" />
          </button>
        </div>

        <dl className="mt-4 flex flex-col gap-2 text-body">
          <div>
            <dt className="sr-only">When</dt>
            <dd className="tnum">
              <LocalTime iso={card.at} mode="dayLong" />, <LocalTime iso={card.at} mode="time" />
              {ev?.endsAt && (
                <>
                  {" – "}
                  <LocalTime iso={ev.endsAt} mode="time" />
                </>
              )}
            </dd>
          </div>
          {w?.moduleName && (
            <div className="text-label text-muted">
              <dt className="sr-only">Module</dt>
              <dd>{w.moduleName}</dd>
            </div>
          )}
          {(w?.weight || w?.estimatedHours) && (
            <div className="text-label text-muted tnum">
              <dt className="sr-only">Size</dt>
              <dd>
                {w.weight ? `${w.weight}% of the module` : ""}
                {w.weight && w.estimatedHours ? " · " : ""}
                {w.estimatedHours ? `~${w.estimatedHours}h of work` : ""}
              </dd>
            </div>
          )}
          {ev?.location && (
            <div className="flex items-center gap-1.5 text-label text-muted">
              <dt className="sr-only">Where</dt>
              <IconLocation className="size-4" />
              <dd>{ev.location}</dd>
            </div>
          )}
          {ev?.details && (
            <div className="whitespace-pre-line text-label text-ink/80">
              <dt className="sr-only">Details</dt>
              <dd>{ev.details}</dd>
            </div>
          )}
          {card.tags.length > 0 && (
            <div>
              <dt className="sr-only">Tags</dt>
              <dd className="flex flex-wrap gap-1.5">
                {card.tags.map((t) => (
                  <span key={t} className="rounded-full bg-canvas px-2.5 py-1 text-caption font-semibold">
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {ev?.visibility === "university" && (
            <div className="flex items-center gap-1.5 text-label text-muted">
              <dt className="sr-only">Sharing</dt>
              <IconUsers className="size-4 shrink-0" />
              <dd>
                {ev.mine
                  ? "Shared with your university. Classmates can pin it to their boards."
                  : "Shared by a classmate. It is on your board because you pinned it."}
              </dd>
            </div>
          )}
        </dl>

        {/* ---------------------------------------------------------- actions */}
        {w && w.kind === "assignment" && (
          <div className="mt-6 flex gap-2">
            <PillButton
              size="md"
              variant={w.status === "in_progress" ? "primary" : "soft"}
              className="flex-1"
              aria-pressed={w.status === "in_progress"}
              onClick={() =>
                run(() =>
                  setAssignmentStatus(w.id, w.status === "in_progress" ? "not_started" : "in_progress"),
                )
              }
            >
              Started
            </PillButton>
            <PillButton
              size="md"
              variant={card.urgency === "done" ? "primary" : "soft"}
              className="flex-1"
              aria-pressed={card.urgency === "done"}
              // Submitting takes it off the live board, so close and let it fall.
              onClick={() =>
                run(
                  () => setAssignmentStatus(w.id, card.urgency === "done" ? "in_progress" : "submitted"),
                  card.urgency !== "done",
                )
              }
            >
              Submitted
            </PillButton>
          </div>
        )}

        {mine && (
          <div className="mt-6">
            <p className="mb-2 text-caption font-semibold uppercase text-muted">Card</p>
            <ShapePicker
              value={card.shape}
              tone={tone}
              onChange={(s: CardShape) => run(() => setCardShape(card.kind, card.id, s))}
            />
          </div>
        )}

        {ev?.mine && (
          <label
            className={cn(
              "mt-4 flex items-start gap-3 rounded-tile bg-canvas p-4",
              !hasUniversity && "opacity-60",
            )}
          >
            <input
              type="checkbox"
              checked={ev.visibility === "university"}
              disabled={!hasUniversity || pending}
              onChange={(e) => run(() => setEventShared(ev.id, e.target.checked))}
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-ink)]"
            />
            <span className="text-label">
              Share with my university
              <span className="mt-1 block text-caption text-muted">
                {hasUniversity
                  ? "Classmates see it in On campus and can pin it. You stay anonymous."
                  : "Pick your university on Me first."}
              </span>
            </span>
          </label>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {w && (
            <PillButton
              variant="ghost"
              size="md"
              onClick={() => run(() => removeWork(w.kind, w.id), true)}
              className="text-coral"
            >
              Remove from board
            </PillButton>
          )}
          {ev?.mine && (
            <PillButton variant="ghost" size="md" onClick={() => run(() => removeEvent(ev.id), true)} className="text-coral">
              Delete event
            </PillButton>
          )}
          {ev && !ev.mine && (
            <>
              <PillButton variant="soft" size="md" onClick={() => run(() => markEvent(ev.id, null), true)}>
                Unpin
              </PillButton>
              <PillButton variant="ghost" size="md" onClick={() => run(() => markEvent(ev.id, "hide"), true)}>
                Hide it
              </PillButton>
            </>
          )}
        </div>
      </motion.section>
    </div>
  );
}
