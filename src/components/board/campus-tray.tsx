"use client";

import { useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconBookmark, IconClose, IconLocation, IconUsers } from "@/components/ui/icons";
import { LocalTime } from "@/components/ui/local-time";
import { PillLink } from "@/components/ui/pill-button";
import { EASE_SOFT } from "@/lib/motion";
import type { BoardEvent } from "@/lib/board/items";
import { markEvent } from "@/app/(app)/board/actions";

/**
 * What classmates have shared that you have not decided about yet. Pin one
 * and it drops onto your board (and into your calendar feed); hide one and it
 * is gone for good. Authors stay anonymous.
 */
export function CampusTray({
  events,
  university,
}: {
  events: BoardEvent[];
  university: { name: string; shortName: string | null } | null;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-caption font-semibold uppercase text-muted">
          <IconUsers className="size-4" />
          On campus
        </h2>
        {university && (
          <span className="truncate text-caption font-semibold uppercase text-ink/70">
            {university.shortName ?? university.name}
          </span>
        )}
      </div>

      {!university ? (
        <div className="mt-3 rounded-tile bg-paper p-5 shadow-soft">
          <p className="text-body font-semibold">See what classmates are pinning</p>
          <p className="mt-1 text-label text-muted">
            Pick your university on Me. Events classmates share with it show up here.
          </p>
          <PillLink href="/me" variant="soft" size="sm" className="mt-3">
            Choose my university
          </PillLink>
        </div>
      ) : events.length === 0 ? (
        <p className="mt-3 text-label text-ink/80">
          Nothing shared at {university.shortName ?? university.name} right now. Add an event
          below and tick &ldquo;share&rdquo; to be the first.
        </p>
      ) : (
        <ul className="-mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <CampusCard key={e.id} event={e} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function CampusCard({ event }: { event: BoardEvent }) {
  const [pending, start] = useTransition();
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: pending ? 0.6 : 1, scale: 1 }}
      // Pinning sends it up onto the board; hiding just fades it.
      exit={{ opacity: 0, y: -40, scale: 0.9, transition: { duration: 0.3, ease: EASE_SOFT } }}
      className="flex w-60 shrink-0 snap-start flex-col rounded-tile bg-paper p-4 shadow-soft"
    >
      <p className="line-clamp-2 text-body font-bold leading-snug">{event.title}</p>
      <p className="mt-1 text-label text-ink/80 tnum">
        <LocalTime iso={event.startsAt} mode="when" />
      </p>
      {event.location && (
        <p className="mt-0.5 flex items-center gap-1 truncate text-label text-muted">
          <IconLocation className="size-4 shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>
      )}
      {event.tags.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1">
          {event.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-canvas px-2 py-0.5 text-caption font-semibold">
              {t}
            </span>
          ))}
        </p>
      )}
      <div className="mt-auto flex gap-2 pt-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => markEvent(event.id, "save"))}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink text-label font-semibold text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <IconBookmark className="size-4" />
          Pin to my board
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => markEvent(event.id, "hide"))}
          aria-label={`Hide ${event.title}`}
          className="grid size-10 place-items-center rounded-full bg-canvas text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <IconClose className="size-4" />
        </button>
      </div>
    </motion.li>
  );
}
