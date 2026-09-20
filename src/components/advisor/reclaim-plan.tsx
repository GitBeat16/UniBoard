"use client";

import { useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/ui/local-time";
import { Rise, Stagger } from "@/components/ui/motion-primitives";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/cn";
import { EASE_SOFT } from "@/lib/motion";
import { planMinutes, type Slot, type SlotKind } from "@/lib/reclaim/plan";
import { saveReclaimPlan } from "@/app/(app)/timetable/[id]/actions";

const KIND: Record<SlotKind, { label: string; chip: string; rail: string }> = {
  work: { label: "Work", chip: "bg-coral-soft text-coral", rail: "bg-coral" },
  revision: { label: "Revision", chip: "bg-iris-soft text-iris", rail: "bg-iris" },
  goal: { label: "Goal", chip: "bg-sky-soft text-sky", rail: "bg-sky" },
  break: { label: "Break", chip: "bg-leaf-soft text-leaf", rail: "bg-leaf" },
};

export function ReclaimPlan({
  slots,
  sessionId,
  saved,
  onSaved,
}: {
  slots: Slot[];
  sessionId: string;
  saved: string | null;
  onSaved: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  const focusMinutes = slots
    .filter((s) => s.kind !== "break")
    .reduce(
      (n, s) => n + (new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60_000,
      0,
    );

  return (
    <Stagger className="flex flex-col gap-4">
      <Rise>
        <div>
          <h3 className="text-caption font-semibold uppercase text-muted">
            The freed hours
          </h3>
          <p className="mt-1 text-label text-muted tnum">
            {Math.round(planMinutes(slots))} minutes back
            {focusMinutes > 0 ? ` · ${Math.round(focusMinutes)} of focus` : ""}
          </p>
        </div>
      </Rise>

      {slots.map((slot) => {
        const kind = KIND[slot.kind];

        return (
          <Rise key={slot.id}>
            <Card className="relative overflow-hidden p-4">
              <span
                className={cn("absolute inset-y-0 left-0 w-1.5", kind.rail)}
                aria-hidden="true"
              />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div className="min-w-0">
                  <p className="text-caption font-semibold uppercase text-muted tnum">
                    <LocalTime iso={slot.startsAt} /> – <LocalTime iso={slot.endsAt} />
                  </p>
                  <h4 className="mt-1 truncate text-body font-semibold">{slot.title}</h4>
                  {/* Every slot explains itself, exactly like the verdict does. */}
                  <p className="mt-1 text-label text-muted">{slot.why}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-chip px-2.5 py-1 text-caption font-semibold uppercase",
                    kind.chip,
                  )}
                >
                  {kind.label}
                </span>
              </div>
            </Card>
          </Rise>
        );
      })}

      <Rise>
        <AnimatePresence mode="wait" initial={false}>
          {saved ? (
            <motion.p
              key="saved"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_SOFT }}
              role="status"
              className="text-label text-leaf"
            >
              {saved}
            </motion.p>
          ) : (
            <motion.div key="save" exit={{ opacity: 0 }}>
              <PillButton
                className="w-full"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await saveReclaimPlan(sessionId);
                    onSaved(result.message);
                  })
                }
              >
                {pending ? "Adding…" : "Put this in my day"}
              </PillButton>
            </motion.div>
          )}
        </AnimatePresence>
      </Rise>
    </Stagger>
  );
}
