"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IconClose } from "@/components/ui/icons";
import { PillButton } from "@/components/ui/pill-button";
import { TimeZoneField } from "@/components/ui/time-zone-field";
import { cn } from "@/lib/cn";
import { EASE_SOFT, SOFT_SPRING } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { SESSION_TYPE_LABEL, type SessionVM } from "@/lib/view-models";
import {
  addManualClass,
  deleteClass,
  updateClass,
  type ActionState,
} from "@/app/(app)/timetable/actions";

export type ModuleChoice = { moduleId: string; name: string };

const field =
  "h-12 w-full rounded-full bg-canvas px-5 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

const TYPES = ["lecture", "lab", "seminar", "tutorial", "workshop", "other"] as const;

/**
 * Correcting the timetable.
 *
 * A photographed grid is read well but not perfectly, and a university moves
 * a class now and then — so every class has to be changeable, and a day has to
 * accept one that was never on the page. The same sheet does both: adding
 * differs only in having no class to start from.
 *
 * "Every week" is offered on an edit rather than assumed, because a one-off
 * room change and a permanent move look identical until she says which it is.
 */
export function ClassSheet({
  session,
  dayKey,
  modules,
  onClose,
}: {
  /** The class being changed, or undefined when one is being added. */
  session?: SessionVM;
  /** The day it is being added to, YYYY-MM-DD. */
  dayKey: string;
  modules: ModuleChoice[];
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const wide = useMediaQuery("(min-width: 768px)");
  const enter = wide ? { opacity: 0, y: 24, scale: 0.97 } : { y: "100%" };
  const editing = Boolean(session);

  const [scope, setScope] = useState<"one" | "series">("one");
  const [saveState, save, saving] = useActionState<ActionState, FormData>(
    editing ? updateClass : addManualClass,
    null,
  );
  const [dropState, drop, dropping] = useActionState<ActionState, FormData>(deleteClass, null);
  const state = dropState ?? saveState;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close once the change has landed; the list behind re-renders with it.
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const busy = saving || dropping;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center md:p-6">
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
        aria-labelledby="class-sheet-title"
        className={cn(
          "relative max-h-[88dvh] w-full max-w-md overflow-y-auto",
          "rounded-t-[2rem] bg-paper px-6 pb-10 pt-4 shadow-lift md:rounded-[2rem] md:px-8 md:pb-8 md:pt-7",
          busy && "opacity-80",
        )}
        initial={enter}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ ...enter, transition: { duration: 0.22, ease: EASE_SOFT } }}
        transition={SOFT_SPRING}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-hairline md:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-caption font-semibold uppercase text-muted">
              {new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h2 id="class-sheet-title" className="mt-1 text-h2 font-bold">
              {editing ? "Change this class" : "Add a class"}
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

        <form action={save} className="mt-5 flex flex-col gap-3">
          <TimeZoneField />
          {editing ? (
            <>
              <input type="hidden" name="id" value={session!.id} />
              <input type="hidden" name="scope" value={scope} />
              <label className="text-label text-muted">
                Module
                <select
                  name="moduleId"
                  defaultValue={session!.moduleId}
                  className={cn(field, "mt-1 appearance-none")}
                >
                  {modules.map((m) => (
                    <option key={m.moduleId} value={m.moduleId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <input type="hidden" name="date" value={dayKey} />
              <label className="text-label text-muted">
                Module
                <input
                  name="name"
                  required
                  list="module-names"
                  placeholder="Module name"
                  className={cn(field, "mt-1")}
                />
                <datalist id="module-names">
                  {modules.map((m) => (
                    <option key={m.moduleId} value={m.name} />
                  ))}
                </datalist>
              </label>
            </>
          )}

          <div className="flex gap-3">
            <label className="flex-1 text-label text-muted">
              Kind
              <select
                name="type"
                defaultValue={session?.type ?? "lecture"}
                className={cn(field, "mt-1 appearance-none")}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SESSION_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-label text-muted">
              Room
              <input
                name="room"
                defaultValue={session?.room ?? ""}
                placeholder="A1-213"
                className={cn(field, "mt-1")}
              />
            </label>
          </div>

          <div className="flex gap-3">
            <label className="flex-1 text-label text-muted">
              From
              <input
                name="start"
                type="time"
                required
                defaultValue={clockOf(session?.startsAt) ?? "09:00"}
                className={cn(field, "mt-1")}
              />
            </label>
            <label className="flex-1 text-label text-muted">
              To
              <input
                name="end"
                type="time"
                required
                defaultValue={clockOf(session?.endsAt) ?? "10:00"}
                className={cn(field, "mt-1")}
              />
            </label>
          </div>

          {editing ? (
            <fieldset className="mt-1">
              <legend className="px-1 text-label text-muted">This applies to</legend>
              <div className="mt-2 flex gap-1 rounded-full bg-canvas p-1">
                {(
                  [
                    ["one", "Just this class"],
                    ["series", "Every week"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScope(value)}
                    aria-pressed={scope === value}
                    className={cn(
                      "flex-1 rounded-full px-3 py-2 text-label font-semibold",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                      scope === value ? "bg-ink text-paper" : "text-muted hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 px-1 text-caption text-muted">
                Weeks already gone are left alone — your attendance hangs off them.
              </p>
            </fieldset>
          ) : (
            <label className="text-label text-muted">
              Repeat weekly for
              <input
                name="weeks"
                type="number"
                min={1}
                max={30}
                defaultValue={1}
                className={cn(field, "mt-1")}
              />
              weeks
            </label>
          )}

          <PillButton type="submit" size="md" disabled={busy}>
            {saving ? "Saving…" : editing ? "Save" : "Add class"}
          </PillButton>
        </form>

        {editing && (
          <form action={drop} className="mt-3">
            <input type="hidden" name="id" value={session!.id} />
            <input type="hidden" name="scope" value={scope} />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full px-5 py-3 text-label font-semibold text-coral hover:bg-coral/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:opacity-50"
            >
              {dropping
                ? "Removing…"
                : scope === "series"
                  ? "Remove this and every later week"
                  : "Remove this class"}
            </button>
          </form>
        )}

        {state && !state.ok && (
          <p role="status" className="mt-3 px-1 text-label text-coral">
            {state.message}
          </p>
        )}
      </motion.section>
    </div>
  );
}

/** "09:00" from an ISO instant, on the viewer's clock, for a time input. */
function clockOf(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
