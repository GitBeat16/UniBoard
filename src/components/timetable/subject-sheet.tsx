"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IconClose } from "@/components/ui/icons";
import { PillButton } from "@/components/ui/pill-button";
import { TimeZoneField } from "@/components/ui/time-zone-field";
import { cn } from "@/lib/cn";
import { tellFlora } from "@/lib/flora/bus";
import { EASE_SOFT, SOFT_SPRING } from "@/lib/motion";
import { TONES, toneBg, type Tone } from "@/lib/tones";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  deleteSubject,
  mergeSubject,
  updateSubject,
  type ActionState,
} from "@/app/(app)/timetable/actions";

/** A subject as it is stored — what the form starts from. */
export type SubjectRow = {
  id: string;
  name: string;
  code: string | null;
  tone: Tone;
  /** Its own threshold, or null when it follows the university's. */
  threshold: number | null;
  defaultThreshold: number;
  official: { attended: number; held: number; asOf: string } | null;
  /** How many classes it has — what a delete would take with it. */
  classes: number;
};

const field =
  "h-12 w-full rounded-full bg-canvas px-5 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

/**
 * Everything about one subject that a photo could have got wrong.
 *
 * Its name and code, its colour, its threshold, and the college's attendance
 * figure for it — each correctable by hand. When the photo split one subject
 * into two ("DM" and "D.M"), merge folds the duplicate into the real one,
 * classes and marks included. Delete is for a subject that should not exist,
 * and asks twice, because it takes the subject's classes with it.
 */
export function SubjectSheet({
  subject,
  others,
  today,
  onClose,
}: {
  subject: SubjectRow;
  others: SubjectRow[];
  /** The viewer's date, yyyy-mm-dd — the latest a college figure can be up to. */
  today: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const wide = useMediaQuery("(min-width: 768px)");
  const enter = wide ? { opacity: 0, y: 24, scale: 0.97 } : { y: "100%" };

  const [saveState, save, saving] = useActionState<ActionState, FormData>(updateSubject, null);
  const [mergeState, merge, merging] = useActionState<ActionState, FormData>(mergeSubject, null);
  const [dropState, drop, dropping] = useActionState<ActionState, FormData>(deleteSubject, null);
  const busy = saving || merging || dropping;

  const [tone, setTone] = useState<Tone>(subject.tone);
  const [official, setOfficial] = useState({
    attended: subject.official ? String(subject.official.attended) : "",
    held: subject.official ? String(subject.official.held) : "",
    asOf: subject.official?.asOf ?? "",
  });
  const [into, setInto] = useState(others[0]?.id ?? "");
  const [confirm, setConfirm] = useState<"merge" | "delete" | null>(null);

  // The most recent answer, whichever action gave it.
  const state = [saveState, mergeState, dropState].filter(Boolean).at(-1) ?? null;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!state?.ok) return;
    tellFlora(state === dropState ? "class-removed" : "class-changed");
    onClose();
  }, [state, dropState, onClose]);

  const target = others.find((o) => o.id === into);
  const percent =
    official.attended && official.held && Number(official.held) > 0
      ? Math.round((Number(official.attended) / Number(official.held)) * 100)
      : null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center md:p-6">
      <motion.button
        type="button"
        aria-label="Close"
        data-feedback="none"
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
        aria-labelledby="subject-sheet-title"
        className={cn(
          "relative max-h-[90dvh] w-full max-w-md overflow-y-auto",
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
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-caption font-semibold uppercase text-muted">
              <span className={cn("size-2.5 rounded-full", toneBg[tone])} aria-hidden="true" />
              Subject · {subject.classes} {subject.classes === 1 ? "class" : "classes"}
            </p>
            <h2 id="subject-sheet-title" className="mt-1 truncate text-h2 font-bold">
              {subject.name}
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

        {/* ------------------------------------------------ the subject itself */}
        <form action={save} className="mt-5 flex flex-col gap-3">
          <TimeZoneField />
          <input type="hidden" name="id" value={subject.id} />
          <input type="hidden" name="tone" value={tone} />

          <div className="flex gap-3">
            <label className="flex-[2] text-label text-muted">
              Name
              <input name="name" required defaultValue={subject.name} className={cn(field, "mt-1")} />
            </label>
            <label className="flex-1 text-label text-muted">
              Code
              <input name="code" defaultValue={subject.code ?? ""} placeholder="—" className={cn(field, "mt-1 uppercase")} />
            </label>
          </div>

          <fieldset>
            <legend className="text-label text-muted">Colour</legend>
            <div className="mt-2 flex gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  aria-pressed={tone === t}
                  aria-label={t}
                  className={cn(
                    "size-9 rounded-full ring-offset-2 ring-offset-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    toneBg[t],
                    tone === t && "ring-2 ring-ink",
                  )}
                />
              ))}
            </div>
          </fieldset>

          <label className="text-label text-muted">
            Attendance needed
            <div className="relative mt-1">
              <input
                name="threshold"
                inputMode="numeric"
                defaultValue={subject.threshold ?? ""}
                placeholder={`${subject.defaultThreshold} — your university's`}
                className={cn(field, "pr-10")}
              />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-body text-muted">%</span>
            </div>
          </label>

          {/* The college's figure: the one the maths starts from. */}
          <fieldset className="rounded-tile bg-canvas p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-label font-semibold text-ink">Your college&rsquo;s count</legend>
              {(official.attended || official.held || official.asOf) && (
                <button
                  type="button"
                  onClick={() => setOfficial({ attended: "", held: "", asOf: "" })}
                  className="text-caption font-semibold text-muted underline underline-offset-4 hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-1 text-caption text-muted">
              What your portal says. Classes you mark after the date are added to it.
            </p>
            <div className="mt-3 flex items-end gap-2">
              <label className="flex-1 text-caption text-muted">
                Attended
                <input
                  name="attended"
                  inputMode="numeric"
                  value={official.attended}
                  onChange={(e) => setOfficial((o) => ({ ...o, attended: e.target.value }))}
                  className={cn(field, "mt-1 bg-paper")}
                />
              </label>
              <span className="pb-3 text-body text-muted">of</span>
              <label className="flex-1 text-caption text-muted">
                Held
                <input
                  name="held"
                  inputMode="numeric"
                  value={official.held}
                  onChange={(e) => setOfficial((o) => ({ ...o, held: e.target.value }))}
                  className={cn(field, "mt-1 bg-paper")}
                />
              </label>
            </div>
            <label className="mt-2 block text-caption text-muted">
              Up to
              <input
                name="asOf"
                type="date"
                max={today}
                value={official.asOf}
                onChange={(e) => setOfficial((o) => ({ ...o, asOf: e.target.value }))}
                className={cn(field, "mt-1 bg-paper")}
              />
            </label>
            {percent !== null && (
              <p className="mt-2 text-caption font-semibold text-ink tnum">That is {percent}%.</p>
            )}
          </fieldset>

          <PillButton type="submit" size="md" disabled={busy}>
            {saving ? "Saving…" : "Save"}
          </PillButton>
        </form>

        {/* ---------------------------------------------------------- merge */}
        {others.length > 0 && (
          <section className="mt-6 border-t border-hairline pt-5">
            <h3 className="text-label font-semibold">Is this a duplicate?</h3>
            <p className="mt-0.5 text-caption text-muted">
              Fold it into the real subject. Its classes, marks and hand-ins move across.
            </p>
            <form action={merge} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="id" value={subject.id} />
              <input type="hidden" name="into" value={into} />
              <select
                value={into}
                onChange={(e) => {
                  setInto(e.target.value);
                  setConfirm(null);
                }}
                className={cn(field, "appearance-none")}
                aria-label="Merge into"
              >
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {confirm === "merge" ? (
                <div className="flex gap-2">
                  <PillButton type="submit" size="md" disabled={busy} className="flex-1">
                    {merging ? "Merging…" : `Merge into ${target?.name ?? "it"}`}
                  </PillButton>
                  <PillButton type="button" variant="soft" size="md" onClick={() => setConfirm(null)}>
                    Cancel
                  </PillButton>
                </div>
              ) : (
                <PillButton type="button" variant="outline" size="md" onClick={() => setConfirm("merge")}>
                  Merge…
                </PillButton>
              )}
            </form>
          </section>
        )}

        {/* --------------------------------------------------------- delete */}
        <section className="mt-6 border-t border-hairline pt-5">
          <form action={drop}>
            <input type="hidden" name="id" value={subject.id} />
            {confirm === "delete" ? (
              <div className="rounded-tile bg-coral-soft p-4">
                <p className="text-label text-ink">
                  Delete {subject.name}
                  {subject.classes > 0 &&
                    ` and its ${subject.classes} ${subject.classes === 1 ? "class" : "classes"}`}
                  ? Their marks go too. Hand-ins and exams stay, just unlinked.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-full bg-coral px-5 py-3 text-label font-semibold text-paper disabled:opacity-50"
                  >
                    {dropping ? "Deleting…" : "Delete it"}
                  </button>
                  <PillButton type="button" variant="soft" size="md" onClick={() => setConfirm(null)}>
                    Keep it
                  </PillButton>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                className="w-full rounded-full px-5 py-3 text-label font-semibold text-coral hover:bg-coral/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
              >
                Delete this subject…
              </button>
            )}
          </form>
        </section>

        {state && !state.ok && (
          <p role="status" className="mt-3 px-1 text-label text-coral">
            {state.message}
          </p>
        )}
      </motion.section>
    </div>
  );
}
