"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Illustration } from "@/components/ui/illustration";
import { FloraSays } from "@/components/flora/flora-says";
import { AnimatedNumber, Rise, Stagger } from "@/components/ui/motion-primitives";
import { PillButton } from "@/components/ui/pill-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkCard } from "@/components/board/work-card";
import { cn } from "@/lib/cn";
import { EASE_SOFT, LAYOUT_SPRING } from "@/lib/motion";
import { useNow } from "@/lib/use-now";
import {
  outstandingHours,
  sortByUrgency,
  urgencyOf,
  type WorkItem,
} from "@/lib/work/urgency";
import { addWork, type ActionState } from "@/app/(app)/board/actions";

const field =
  "h-12 w-full rounded-full bg-canvas px-5 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

type Filter = "live" | "all" | "done";

export function BoardView({
  items,
  modules,
}: {
  items: WorkItem[];
  modules: Array<{ id: string; name: string }>;
}) {
  const now = useNow();
  const mounted = now > 0;
  const [filter, setFilter] = useState<Filter>("live");
  const [adding, setAdding] = useState(false);
  const filterId = useId();

  const [state, action, pending] = useActionState<ActionState, FormData>(addWork, null);

  const nowDate = useMemo(() => new Date(now), [now]);

  const sorted = useMemo(() => sortByUrgency(items, nowDate), [items, nowDate]);

  const shown = useMemo(
    () =>
      sorted.filter((i) => {
        const u = urgencyOf(i, nowDate);
        if (filter === "done") return u === "done";
        if (filter === "live") return u !== "done";
        return true;
      }),
    [sorted, filter, nowDate],
  );

  const hours = useMemo(() => outstandingHours(items, nowDate), [items, nowDate]);
  const overdue = useMemo(
    () => items.filter((i) => urgencyOf(i, nowDate) === "overdue").length,
    [items, nowDate],
  );

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
              dueTodayCount: items.filter((i) => urgencyOf(i, nowDate) === "today").length,
            }}
          />
        </Rise>
      )}

      {mounted && items.length > 0 && (
        <Rise>
          <Card className="flex items-center justify-between gap-4">
            <div>
              <p className="text-caption font-semibold uppercase text-muted">
                Next seven days
              </p>
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
              <span className="relative">{f}</span>
            </button>
          ))}
        </div>
      </Rise>

      {mounted && (
        <section>
          <AnimatePresence mode="wait" initial={false}>
            <Stagger key={filter} className="flex flex-col gap-3">
              {shown.length === 0 ? (
                <Rise>
                  <Card className="p-6 text-center">
                    <Illustration name="board" tone="coral" className="mx-auto mb-2 w-44" />
                    <p className="text-h2 font-semibold">
                      {filter === "done" ? "Nothing finished yet" : "Nothing on the board"}
                    </p>
                    <p className="mt-1 text-label text-muted">
                      Add a hand-in or an exam and the Skip Advisor starts weighing it.
                    </p>
                  </Card>
                </Rise>
              ) : (
                shown.map((item) => (
                  <Rise key={item.id} layout>
                    <WorkCard item={item} now={now} />
                  </Rise>
                ))
              )}
            </Stagger>
          </AnimatePresence>
        </section>
      )}

      <Rise>
        <Card>
          <button
            type="button"
            onClick={() => setAdding((a) => !a)}
            aria-expanded={adding}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-caption font-semibold uppercase text-muted">
              Add a hand-in or exam
            </span>
            <motion.span
              animate={{ rotate: adding ? 45 : 0 }}
              transition={LAYOUT_SPRING}
              className="grid size-8 place-items-center rounded-full bg-ink text-h2 leading-none text-paper"
            >
              +
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {adding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: EASE_SOFT }}
                className="overflow-hidden"
              >
                <form action={action} className="mt-5 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <select name="kind" defaultValue="assignment" className={cn(field, "appearance-none")}>
                      <option value="assignment">Hand-in</option>
                      <option value="exam">Exam</option>
                    </select>
                    <select name="moduleId" defaultValue="" className={cn(field, "appearance-none")}>
                      <option value="">No module</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input name="title" required placeholder="Title" className={field} />
                  <input name="at" type="datetime-local" required className={field} />

                  <div className="flex gap-3">
                    <input
                      name="weight"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Weight %"
                      className={field}
                    />
                    <input
                      name="estimatedHours"
                      type="number"
                      min={0}
                      max={200}
                      step={0.5}
                      placeholder="Est. hours"
                      className={field}
                    />
                  </div>

                  <PillButton type="submit" size="md" disabled={pending}>
                    {pending ? "Adding…" : "Add to the board"}
                  </PillButton>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {state && (
              <motion.p
                key={state.message}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: EASE_SOFT }}
                role="status"
                className={cn("mt-4 text-label", state.ok ? "text-leaf" : "text-coral")}
              >
                {state.message}
              </motion.p>
            )}
          </AnimatePresence>
        </Card>
      </Rise>

      <Rise>
        <p className="text-caption text-muted">
          Society socials, careers fairs and guest lectures join this board in P6.
        </p>
      </Rise>
    </Stagger>
  );
}
