"use client";

import { useTransition } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/ui/local-time";
import { cn } from "@/lib/cn";
import { SOFT_SPRING, press } from "@/lib/motion";
import { toneBg, toneSoft, toneText } from "@/lib/tones";
import { URGENCY_COPY, urgencyOf, type WorkItem } from "@/lib/work/urgency";
import { removeWork, setAssignmentStatus } from "@/app/(app)/board/actions";

/** `now` comes from useNow() in the parent, which only renders once mounted. */
export function WorkCard({ item, now }: { item: WorkItem; now: number }) {
  const [pending, startTransition] = useTransition();
  const urgency = urgencyOf(item, new Date(now));
  const copy = URGENCY_COPY[urgency];
  const isDone = urgency === "done";

  return (
    <Card className={cn("relative overflow-hidden p-5", pending && "opacity-60")}>
      <span
        className={cn("absolute inset-y-0 left-0 w-1.5", toneBg[item.tone])}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <h3
            className={cn(
              "text-body font-bold",
              isDone && "text-muted line-through decoration-2",
            )}
          >
            {item.title}
          </h3>
          <p className="mt-1 text-label text-muted tnum">
            <LocalTime iso={item.at} mode="when" />
            {item.moduleName ? ` · ${item.moduleName}` : ""}
          </p>
          {(item.weight || item.estimatedHours) && (
            <p className="mt-1 text-caption text-muted tnum">
              {item.weight ? `${item.weight}% of the module` : ""}
              {item.weight && item.estimatedHours ? " · " : ""}
              {item.estimatedHours ? `~${item.estimatedHours}h of work` : ""}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* Urgency is a word, not only a colour. */}
          <span
            className={cn(
              "rounded-chip px-2.5 py-1 text-caption font-semibold uppercase",
              copy.chip,
            )}
          >
            {copy.label}
          </span>
          <span
            className={cn(
              "rounded-chip px-2 py-0.5 text-caption font-semibold uppercase",
              toneSoft[item.tone],
              toneText[item.tone],
            )}
          >
            {item.kind === "exam" ? "Exam" : "Hand-in"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 pl-2">
        {item.kind === "assignment" && (
          <>
            <Chip
              active={item.status === "in_progress"}
              onClick={() =>
                startTransition(async () => {
                  await setAssignmentStatus(
                    item.id,
                    item.status === "in_progress" ? "not_started" : "in_progress",
                  );
                })
              }
            >
              Started
            </Chip>
            <Chip
              active={isDone}
              onClick={() =>
                startTransition(async () => {
                  await setAssignmentStatus(item.id, isDone ? "in_progress" : "submitted");
                })
              }
            >
              Submitted
            </Chip>
          </>
        )}

        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await removeWork(item.kind, item.id);
            })
          }
          className="ml-auto text-label text-muted underline underline-offset-4 hover:text-coral"
        >
          Remove
        </button>
      </div>
    </Card>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={press}
      transition={SOFT_SPRING}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-label font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        active ? "bg-ink text-paper" : "bg-canvas text-muted hover:text-ink",
      )}
    >
      {children}
    </motion.button>
  );
}
