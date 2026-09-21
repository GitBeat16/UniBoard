"use client";

import { useActionState, useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/cn";
import { EASE_SOFT, LAYOUT_SPRING } from "@/lib/motion";
import { MAX_FILE, shrinkImage } from "@/lib/upload/shrink-image";
import { TimeZoneField } from "@/components/ui/time-zone-field";
import {
  addManualClass,
  importTimetable,
  type ActionState,
} from "@/app/(app)/timetable/actions";

const TABS = [
  { id: "link", label: "Link" },
  { id: "file", label: "Upload" },
  { id: "manual", label: "By hand" },
] as const;

/** .ics is parsed locally; images and PDFs go to the vision model to be read. */
const UPLOAD_ACCEPT =
  ".ics,text/calendar,image/png,image/jpeg,image/webp,image/gif,application/pdf";

type TabId = (typeof TABS)[number]["id"];

const field =
  "h-12 w-full rounded-full bg-canvas px-5 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

export function ImportPanel({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState<TabId>("link");
  const tabId = useId(); // see BottomNav: layoutId is page-global
  const [importState, importAction, importing] = useActionState<ActionState, FormData>(
    importTimetable,
    null,
  );
  const [manualState, manualAction, adding] = useActionState<ActionState, FormData>(
    addManualClass,
    null,
  );

  const state = tab === "manual" ? manualState : importState;

  // Set while a photo is being shrunk, and afterwards to say what happened.
  const [fileNote, setFileNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [preparing, setPreparing] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const original = input.files?.[0];
    setFileNote(null);
    if (!original) return;

    setPreparing(true);
    const file = await shrinkImage(original);
    setPreparing(false);

    if (file !== original) {
      // Swap the shrunk copy into the input so the form submits it.
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    }

    if (file.size > MAX_FILE) {
      setFileNote({
        ok: false,
        text: `That file is ${mb(file.size)} — the limit is 4 MB. For a PDF, screenshot the timetable page instead.`,
      });
      input.value = "";
      return;
    }
    if (file !== original) {
      setFileNote({ ok: true, text: `Resized from ${mb(original.size)} to ${mb(file.size)} for upload.` });
    }
  }

  return (
    <Card className={cn("overflow-hidden", compact && "p-5")}>
      {!compact && (
        <>
          <p className="text-caption font-semibold uppercase text-muted">
            Import your timetable
          </p>
          <h2 className="mt-2 text-h2 font-bold">Three ways in</h2>
          <p className="mt-2 text-body text-muted">
            Most university portals publish an iCal or ICS feed — look for
            “Subscribe”, “Export calendar” or “iCal feed”.
          </p>
        </>
      )}

      <div className="mt-5 flex gap-1 rounded-full bg-canvas p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              "relative flex-1 rounded-full px-3 py-2 text-label font-semibold",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              tab === t.id ? "text-paper" : "text-muted hover:text-ink",
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId={`${tabId}-import-tab`}
                transition={LAYOUT_SPRING}
                className="absolute inset-0 rounded-full bg-ink"
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      {/* mode="wait" so panels of different heights do not overlap mid-swap. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.26, ease: EASE_SOFT }}
          className="mt-5"
        >
          {tab === "link" && (
            <form action={importAction} className="flex flex-col gap-3">
              <TimeZoneField />
              <input
                name="url"
                type="url"
                required
                placeholder="https://portal.uni.ac.uk/…/timetable.ics"
                className={field}
              />
              <PillButton type="submit" size="md" disabled={importing}>
                {importing ? "Importing…" : "Import"}
              </PillButton>
            </form>
          )}

          {tab === "file" && (
            <form action={importAction} className="flex flex-col gap-3">
              <TimeZoneField />
              <input
                name="file"
                type="file"
                accept={UPLOAD_ACCEPT}
                required
                onChange={onFileChange}
                className="w-full rounded-tile bg-canvas p-4 text-label file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-label file:font-semibold file:text-paper"
              />
              {fileNote && (
                <p
                  role="status"
                  className={cn("px-1 text-label", fileNote.ok ? "text-ink/80" : "text-coral")}
                >
                  {fileNote.text}
                </p>
              )}
              <p className="px-1 text-caption text-muted">
                An .ics file, or a photo or PDF of your timetable — those get read
                for you. A straight-on, uncropped shot works best. A scanned PDF
                has no text to read, so screenshot it instead.
              </p>

              {/* A photographed grid is a repeating week with no end date, so
                  how long the term runs has to come from the student. */}
              <label className="text-label text-muted">
                If it is a photo or PDF, repeat the week for
                <input
                  name="weeks"
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={12}
                  className={cn(field, "mt-1")}
                />
                weeks
              </label>

              <PillButton type="submit" size="md" disabled={importing || preparing}>
                {preparing ? "Preparing…" : importing ? "Reading…" : "Import file"}
              </PillButton>
            </form>
          )}

          {tab === "manual" && (
            <form action={manualAction} className="flex flex-col gap-3">
              <TimeZoneField />
              <input name="name" required placeholder="Module name" className={field} />

              <div className="flex gap-3">
                <select name="type" className={cn(field, "appearance-none")} defaultValue="lecture">
                  <option value="lecture">Lecture</option>
                  <option value="lab">Lab</option>
                  <option value="seminar">Seminar</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="workshop">Workshop</option>
                </select>
                <input name="room" placeholder="Room" className={field} />
              </div>

              <select name="weekday" className={cn(field, "appearance-none")} defaultValue="1">
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                  (d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ),
                )}
              </select>

              <div className="flex gap-3">
                <input name="start" type="time" required defaultValue="09:00" className={field} />
                <input name="end" type="time" required defaultValue="10:00" className={field} />
              </div>

              <label className="text-label text-muted">
                Repeat for
                <input
                  name="weeks"
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={12}
                  className={cn(field, "mt-1")}
                />
                weeks
              </label>

              <PillButton type="submit" size="md" disabled={adding}>
                {adding ? "Adding…" : "Add class"}
              </PillButton>
            </form>
          )}
        </motion.div>
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
            className={cn(
              "mt-4 text-label",
              state.ok ? "text-leaf" : "text-coral",
            )}
          >
            {state.message}
          </motion.p>
        )}
      </AnimatePresence>
    </Card>
  );
}

function mb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
