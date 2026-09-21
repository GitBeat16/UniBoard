"use client";

import { motion } from "motion/react";
import { LocalTime } from "@/components/ui/local-time";
import { IconUsers } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { hangOf, type BoardCard } from "@/lib/board/items";
import { URGENCY_COPY } from "@/lib/work/urgency";
import { Pin } from "./pin";
import { ShapeFrame } from "./card-shape";

const KIND_LABEL = { assignment: "Hand-in", exam: "Exam", event: "Event" } as const;

/**
 * One card on the board. It drops in, swings on its pin and settles at its
 * own tilt; tapping it opens the detail sheet. Marked done (or unpinned) it
 * falls off the board — the exit animation lives here too.
 */
export function PinnedCard({
  card,
  index,
  onOpen,
}: {
  card: BoardCard;
  index: number;
  onOpen: (card: BoardCard) => void;
}) {
  const { tilt, pinX } = hangOf(card.key);
  const tone = `var(--color-${card.tone})`;
  const delay = Math.min(index, 10) * 0.07;
  const done = card.urgency === "done";
  const urgency =
    card.kind === "event" && done ? { label: "Ended", chip: "" } : URGENCY_COPY[card.urgency];
  const shared = card.event?.visibility === "university";
  const sub = card.work?.moduleName ?? card.event?.location ?? null;

  const pinStyle: React.CSSProperties =
    card.shape === "tag"
      ? { left: 6, top: "calc(50% - 11px)" }
      : { left: `calc(50% - 11px + ${pinX}px)`, top: -9 };

  return (
    <motion.li
      layout
      className="card-hang relative list-none"
      style={{ transformOrigin: card.shape === "tag" ? "8% 50%" : "50% 0%", ["--tone" as string]: tone }}
      initial={{ opacity: 0, y: -48, rotate: tilt - 9, scale: 1.04 }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: [tilt - 9, tilt + 3.5, tilt - 1.2, tilt],
        scale: 1,
      }}
      exit={{
        opacity: 0,
        y: 160,
        rotate: tilt + 24,
        transition: { duration: 0.5, ease: [0.55, 0, 1, 0.45] },
      }}
      transition={{
        y: { type: "spring", stiffness: 260, damping: 20, delay },
        opacity: { duration: 0.2, delay },
        scale: { duration: 0.3, delay },
        rotate: { duration: 1, times: [0, 0.45, 0.75, 1], ease: "easeOut", delay },
        layout: { type: "spring", stiffness: 300, damping: 30 },
      }}
    >
      <motion.button
        type="button"
        onClick={() => onOpen(card)}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.97 }}
        className="block w-full rounded-[4px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper"
        aria-label={`${KIND_LABEL[card.kind]}: ${card.title}. ${urgency.label}. Open details.`}
      >
        <ShapeFrame shape={card.shape} className={cn(done && "opacity-70")}>
          {card.shape === "polaroid" ? (
            <>
              <div className="card-photo">
                <DateBlock iso={card.at} />
              </div>
              <div className="px-0.5 pt-2">
                <Body card={card} kind={KIND_LABEL[card.kind]} urgency={urgency.label} sub={sub} shared={shared} done={done} />
              </div>
            </>
          ) : (
            <Body card={card} kind={KIND_LABEL[card.kind]} urgency={urgency.label} sub={sub} shared={shared} done={done} />
          )}
        </ShapeFrame>
      </motion.button>
      <Pin tone={tone} delay={delay} style={pinStyle} />
    </motion.li>
  );
}

function Body({
  card,
  kind,
  urgency,
  sub,
  shared,
  done,
}: {
  card: BoardCard;
  kind: string;
  urgency: string;
  sub: string | null;
  shared: boolean;
  done: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-ink/60">
        {kind}
        {shared && (
          <span className="inline-flex items-center gap-0.5" title="Shared with your university">
            <IconUsers className="size-3" />
            {card.event?.mine ? "Shared" : "Campus"}
          </span>
        )}
      </p>
      <p
        className={cn(
          "mt-0.5 line-clamp-3 text-[0.84rem] font-bold leading-tight",
          done && "line-through decoration-2",
        )}
      >
        {card.title}
      </p>
      <p className="mt-1 text-[0.7rem] leading-snug text-ink/70 tnum">
        <LocalTime iso={card.at} mode="when" />
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="rounded-full bg-ink/[0.07] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-ink/75">
          {urgency}
        </span>
        {sub && <span className="truncate text-[0.65rem] text-ink/60">{sub}</span>}
      </div>
    </div>
  );
}

function DateBlock({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <div>
      <p className="text-[1.9rem] font-bold leading-none tnum">{d.getDate()}</p>
      <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-widest text-ink/70">
        {d.toLocaleDateString(undefined, { month: "short" })} ·{" "}
        {d.toLocaleDateString(undefined, { weekday: "short" })}
      </p>
    </div>
  );
}
