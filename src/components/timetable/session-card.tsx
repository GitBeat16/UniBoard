"use client";

import { useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/ui/local-time";
import { PillLink } from "@/components/ui/pill-button";
import { cn } from "@/lib/cn";
import { EASE_SOFT, SOFT_SPRING, press } from "@/lib/motion";
import { toneBg, toneSoft, toneText } from "@/lib/tones";
import { SESSION_TYPE_LABEL, type SessionVM } from "@/lib/view-models";
import { markAttendance } from "@/app/(app)/timetable/actions";
import type { Enums } from "@/lib/supabase/database.types";

const STATUS_LABEL: Partial<Record<Enums<"attendance_status">, string>> = {
  present: "Present",
  late: "Late",
  absent: "Missed",
  excused: "Excused",
};

export function SessionCard({
  session,
  now,
}: {
  session: SessionVM;
  now: number;
}) {
  const [pending, startTransition] = useTransition();
  const started = new Date(session.startsAt).getTime() <= now;

  function mark(status: Enums<"attendance_status">) {
    startTransition(async () => {
      await markAttendance(session.id, status);
    });
  }

  return (
    <Card className={cn("relative overflow-hidden p-5", pending && "opacity-60")}>
      {/* Module colour as a spine down the left edge — identifies the module
          without spending a whole coloured card on it. */}
      <span
        className={cn("absolute inset-y-0 left-0 w-1.5", toneBg[session.tone])}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase text-muted tnum">
            <LocalTime iso={session.startsAt} /> – <LocalTime iso={session.endsAt} />
          </p>
          <h3 className="mt-1 truncate text-h2 font-bold">{session.moduleName}</h3>
          <p className="mt-1 text-label text-muted">
            {SESSION_TYPE_LABEL[session.type]}
            {session.room ? ` · ${session.room}` : ""}
          </p>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-chip px-3 py-1 text-caption font-semibold uppercase",
            toneSoft[session.tone],
            toneText[session.tone],
          )}
        >
          {session.code ?? SESSION_TYPE_LABEL[session.type]}
        </span>
      </div>

      {(session.isAssessed || session.hasSubmission) && (
        <div className="mt-3 flex flex-wrap gap-2 pl-2">
          {session.isAssessed && <Flag tone="coral">Assessed</Flag>}
          {session.hasSubmission && <Flag tone="coral">Submission due</Flag>}
        </div>
      )}

      <div className="mt-4 pl-2">
        <AnimatePresence mode="wait" initial={false}>
          {session.status ? (
            <motion.div
              key="marked"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: EASE_SOFT }}
              className="flex items-center gap-3"
            >
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-chip px-3 py-1.5 text-label font-semibold",
                  session.status === "absent"
                    ? "bg-coral-soft text-coral"
                    : "bg-leaf-soft text-leaf",
                )}
              >
                <Tick /> {STATUS_LABEL[session.status]}
              </span>
              <button
                type="button"
                onClick={() => mark(session.status === "absent" ? "present" : "absent")}
                className="text-label text-muted underline underline-offset-4 hover:text-ink"
              >
                Change
              </button>
            </motion.div>
          ) : started ? (
            <motion.div
              key="ask"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: EASE_SOFT }}
              className="flex gap-2"
            >
              <MarkButton onClick={() => mark("present")} tone="leaf">
                I went
              </MarkButton>
              <MarkButton onClick={() => mark("absent")} tone="coral">
                I missed it
              </MarkButton>
            </motion.div>
          ) : (
            <motion.div
              key="upcoming"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: EASE_SOFT }}
              className="flex items-center gap-3"
            >
              <span className="text-label text-muted">Upcoming</span>
              {/* The Advisor is reached from a class, never from a tab — the
                  question only makes sense about a specific session. */}
              <PillLink
                href={`/timetable/${session.id}`}
                variant="outline"
                size="sm"
              >
                Go or skip?
              </PillLink>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function Flag({ tone, children }: { tone: "coral"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-chip px-2.5 py-1 text-caption font-semibold uppercase",
        tone === "coral" && "bg-coral-soft text-coral",
      )}
    >
      {children}
    </span>
  );
}

function MarkButton({
  onClick,
  tone,
  children,
}: {
  onClick: () => void;
  tone: "leaf" | "coral";
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={press}
      whileHover={{ y: -1 }}
      transition={SOFT_SPRING}
      className={cn(
        "rounded-full px-4 py-2 text-label font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        tone === "leaf"
          ? "bg-leaf-soft text-leaf hover:bg-leaf hover:text-paper"
          : "bg-coral-soft text-coral hover:bg-coral hover:text-paper",
      )}
    >
      {children}
    </motion.button>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.6 4.4 4.3L19 6.9" />
    </svg>
  );
}
