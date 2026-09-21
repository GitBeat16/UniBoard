"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { TimeZoneField } from "@/components/ui/time-zone-field";
import { cn } from "@/lib/cn";
import { EASE_SOFT, LAYOUT_SPRING } from "@/lib/motion";
import { DEFAULT_SHAPE, type BoardKind, type CardShape } from "@/lib/board/items";
import { addEvent, addWork, type ActionState } from "@/app/(app)/board/actions";
import { ShapePicker } from "./shape-picker";

const field =
  "h-12 w-full rounded-full bg-canvas px-5 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

const KINDS: Array<{ id: BoardKind; label: string }> = [
  { id: "assignment", label: "Hand-in" },
  { id: "exam", label: "Exam" },
  { id: "event", label: "Event" },
];

const TONE: Record<BoardKind, string> = {
  assignment: "var(--color-sky)",
  exam: "var(--color-coral)",
  event: "var(--color-iris)",
};

export function AddToBoard({
  modules,
  hasUniversity,
}: {
  modules: Array<{ id: string; name: string }>;
  hasUniversity: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<BoardKind>("assignment");
  // null = "the default for this kind", so switching kind updates the preview.
  const [chosen, setChosen] = useState<CardShape | null>(null);
  const shape = chosen ?? DEFAULT_SHAPE[kind];
  const tabId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [workState, workAction, addingWork] = useActionState<ActionState, FormData>(addWork, null);
  const [eventState, eventAction, addingEvent] = useActionState<ActionState, FormData>(addEvent, null);
  const state = kind === "event" ? eventState : workState;
  const pending = addingWork || addingEvent;

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-caption font-semibold uppercase text-muted">Pin something new</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={LAYOUT_SPRING}
          className="grid size-8 place-items-center rounded-full bg-ink text-h2 leading-none text-paper"
        >
          +
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE_SOFT }}
            className="overflow-hidden"
          >
            <div className="mt-5 flex gap-1 rounded-full bg-canvas p-1" role="tablist">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="tab"
                  aria-selected={kind === k.id}
                  onClick={() => setKind(k.id)}
                  className={cn(
                    "relative flex-1 rounded-full px-3 py-2 text-label font-semibold",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    kind === k.id ? "text-paper" : "text-muted hover:text-ink",
                  )}
                >
                  {kind === k.id && (
                    <motion.span
                      layoutId={`${tabId}-kind`}
                      transition={LAYOUT_SPRING}
                      className="absolute inset-0 rounded-full bg-ink"
                    />
                  )}
                  <span className="relative">{k.label}</span>
                </button>
              ))}
            </div>

            <form
              key={kind}
              ref={formRef}
              action={kind === "event" ? eventAction : workAction}
              className="mt-4 flex flex-col gap-3"
            >
              <TimeZoneField />
              {kind !== "event" && <input type="hidden" name="kind" value={kind} />}

              <input
                name="title"
                required
                maxLength={120}
                placeholder={kind === "event" ? "What's on?" : kind === "exam" ? "Which exam?" : "What's due?"}
                className={field}
              />

              {kind !== "event" ? (
                <>
                  <select name="moduleId" defaultValue="" className={cn(field, "appearance-none")}>
                    <option value="">No module</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <label className="text-label text-muted">
                    {kind === "exam" ? "Starts" : "Due"}
                    <input name="at" type="datetime-local" required className={cn(field, "mt-1")} />
                  </label>
                  {kind === "assignment" && (
                    <div className="flex gap-3">
                      <input name="weight" type="number" min={0} max={100} placeholder="Weight %" className={field} />
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
                  )}
                </>
              ) : (
                <>
                  <label className="text-label text-muted">
                    Starts
                    <input name="startsAt" type="datetime-local" required className={cn(field, "mt-1")} />
                  </label>
                  <label className="text-label text-muted">
                    Ends <span className="text-caption">(optional)</span>
                    <input name="endsAt" type="datetime-local" className={cn(field, "mt-1")} />
                  </label>
                  <input name="location" maxLength={120} placeholder="Where? (optional)" className={field} />
                  <input
                    name="tags"
                    placeholder="Tags, comma separated — Hackathon, Free food"
                    className={field}
                  />
                  <textarea
                    name="details"
                    maxLength={500}
                    rows={3}
                    placeholder="Details (optional)"
                    className="w-full rounded-tile bg-canvas px-5 py-3 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink"
                  />
                  <label className={cn("flex items-start gap-3 rounded-tile bg-canvas p-4", !hasUniversity && "opacity-60")}>
                    <input
                      name="share"
                      type="checkbox"
                      disabled={!hasUniversity}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--color-ink)]"
                    />
                    <span className="text-label">
                      Share with my university
                      <span className="mt-1 block text-caption text-muted">
                        {hasUniversity
                          ? "Classmates can pin it to their own boards. Your name isn't shown."
                          : "Pick your university on Me to share events with classmates."}
                      </span>
                    </span>
                  </label>
                </>
              )}

              <div>
                <p className="mb-2 text-caption font-semibold uppercase text-muted">Pin it as</p>
                <ShapePicker name="shape" value={shape} onChange={setChosen} tone={TONE[kind]} />
              </div>

              <PillButton type="submit" size="md" disabled={pending}>
                {pending ? "Pinning…" : "Pin to the board"}
              </PillButton>
            </form>

            <AnimatePresence>
              {state && (
                <motion.p
                  key={state.message}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: EASE_SOFT }}
                  role="status"
                  className={cn("mt-4 text-label", state.ok ? "text-ink/80" : "text-coral")}
                >
                  {state.message}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
