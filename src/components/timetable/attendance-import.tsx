"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IconClose } from "@/components/ui/icons";
import { PillButton } from "@/components/ui/pill-button";
import { TimeZoneField } from "@/components/ui/time-zone-field";
import { cn } from "@/lib/cn";
import { EASE_SOFT, SOFT_SPRING } from "@/lib/motion";
import { MAX_FILE, shrinkImage } from "@/lib/upload/shrink-image";
import { useMediaQuery } from "@/lib/use-media-query";
import { importAttendance, type ActionState } from "@/app/(app)/timetable/actions";

const field =
  "h-12 w-full rounded-full bg-canvas px-5 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

/**
 * Taking the college's own attendance figure.
 *
 * The app counts from the day the timetable was imported; the college has been
 * counting since the term began, and its number is the one that decides
 * whether she sits the exam. Once it is in, the maths starts from it and adds
 * what has been marked since — so this is the difference between advice that
 * is nearly right and advice she can act on.
 */
export function AttendanceImport({ asOfDefault }: { asOfDefault: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Paper on canvas: the section it sits in is canvas, so a canvas
        // button would be invisible.
        className="rounded-full border border-hairline bg-paper px-4 py-2 text-label font-semibold text-ink hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        From my college
      </button>
      {open && <Sheet asOfDefault={asOfDefault} onClose={() => setOpen(false)} />}
    </>
  );
}

function Sheet({ asOfDefault, onClose }: { asOfDefault: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const wide = useMediaQuery("(min-width: 768px)");
  const enter = wide ? { opacity: 0, y: 24, scale: 0.97 } : { y: "100%" };
  const [state, run, busy] = useActionState<ActionState, FormData>(importAttendance, null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const original = input.files?.[0];
    setNote(null);
    if (!original) return;

    const file = await shrinkImage(original);
    if (file !== original) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    }
    if (file.size > MAX_FILE) {
      setNote("That file is over 4 MB. A screenshot of just the table is plenty.");
      input.value = "";
    }
  }

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
        aria-labelledby="attendance-import-title"
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
            <p className="text-caption font-semibold uppercase text-muted">Attendance</p>
            <h2 id="attendance-import-title" className="mt-1 text-h2 font-bold">
              Your college&rsquo;s count
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

        <p className="mt-3 text-label text-muted">
          If your college publishes attendance, bring its figure in. Everything
          you mark after that day is added to it, so the percentage here is the
          one that counts.
        </p>

        <form action={run} className="mt-5 flex flex-col gap-3">
          <TimeZoneField />

          <label className="text-label text-muted">
            A screenshot of the attendance page
            <input
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              onChange={onFileChange}
              className="mt-1 w-full rounded-tile bg-canvas p-4 text-label file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-label file:font-semibold file:text-paper"
            />
          </label>

          <p className="px-1 text-caption text-muted">
            It needs the counts — 32 of 40 — not just a percentage.
          </p>

          <label className="text-label text-muted">
            Or a link to it, if the page is public
            <input
              name="url"
              type="url"
              placeholder="https://portal.college.edu/attendance"
              className={cn(field, "mt-1")}
            />
          </label>

          <label className="text-label text-muted">
            Figures are up to
            <input
              name="asOf"
              type="date"
              defaultValue={asOfDefault}
              max={asOfDefault}
              className={cn(field, "mt-1")}
            />
          </label>

          <PillButton type="submit" size="md" disabled={busy}>
            {busy ? "Reading…" : "Import"}
          </PillButton>
        </form>

        {(note || state) && (
          <p
            role="status"
            className={cn(
              "mt-3 px-1 text-label",
              note ? "text-coral" : state?.ok ? "text-leaf" : "text-coral",
            )}
          >
            {note ?? state?.message}
          </p>
        )}
      </motion.section>
    </div>
  );
}
