"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { FloraSays } from "@/components/flora/flora-says";
import { LocalTime } from "@/components/ui/local-time";
import { Rise, Stagger } from "@/components/ui/motion-primitives";
import { PillButton, PillLink } from "@/components/ui/pill-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { VerdictGauge } from "@/components/advisor/verdict-gauge";
import { advise, VERDICT_COPY, type SelfState, type Verdict } from "@/lib/advisor/engine";
import { ReclaimPlan } from "@/components/advisor/reclaim-plan";
import { buildReclaimPlan, type ReclaimGoal } from "@/lib/reclaim/plan";
import type { WorkItem } from "@/lib/work/urgency";
import { cn } from "@/lib/cn";
import { EASE_SOFT, LAYOUT_SPRING, SOFT_SPRING, press } from "@/lib/motion";
import type { ModuleAttendance } from "@/lib/attendance/stats";
import { SESSION_TYPE_LABEL, type SessionVM } from "@/lib/view-models";
import { recordDecision } from "@/app/(app)/timetable/[id]/actions";

/** Serializable twin of AdvisorInput — dates cross the boundary as ISO strings. */
export type AdvisorPayload = {
  session: SessionVM & { isRecorded: boolean };
  attendance: ModuleAttendance;
  deadlines: Array<{ title: string; dueAt: string; moduleId: string | null }>;
  exams: Array<{ title: string; startsAt: string; moduleId: string | null }>;
  travelMinutes: number | null;
  attendanceMonitored: boolean;
  nowIso: string;
  /** Everything Reclaim needs to fill the freed hours, if they skip. */
  work: WorkItem[];
  goals: ReclaimGoal[];
};

const VERDICT_TONE: Record<Verdict, { hex: string; chip: string; ink: string }> = {
  go_matters: { hex: "var(--color-coral)", chip: "bg-coral-soft", ink: "text-coral" },
  go_if_you_can: { hex: "var(--color-sun)", chip: "bg-sun-soft", ink: "text-sun" },
  your_call: { hex: "var(--color-iris)", chip: "bg-iris-soft", ink: "text-iris" },
  skip_fine: { hex: "var(--color-leaf)", chip: "bg-leaf-soft", ink: "text-leaf" },
};

const STATES: Array<{ id: SelfState; label: string }> = [
  { id: "fine", label: "Fine" },
  { id: "tired", label: "Running low" },
  { id: "ill", label: "Ill" },
];

export function AdvisorView({ payload }: { payload: AdvisorPayload }) {
  const [state, setState] = useState<SelfState>("fine");
  const [decided, setDecided] = useState<boolean | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Re-run on every change of self-reported state. The engine is pure and
  // cheap, so the student can see the call move as they answer honestly —
  // which is the whole argument for showing the reasoning at all.
  const result = useMemo(
    () =>
      advise({
        session: {
          moduleName: payload.session.moduleName,
          startsAt: new Date(payload.session.startsAt),
          endsAt: new Date(payload.session.endsAt),
          type: payload.session.type,
          isAssessed: payload.session.isAssessed,
          hasSubmission: payload.session.hasSubmission,
          isRecorded: payload.session.isRecorded,
        },
        attendance: payload.attendance,
        deadlines: payload.deadlines.map((d) => ({ ...d, dueAt: new Date(d.dueAt) })),
        exams: payload.exams.map((e) => ({ ...e, startsAt: new Date(e.startsAt) })),
        travelMinutes: payload.travelMinutes,
        attendanceMonitored: payload.attendanceMonitored,
        state,
        now: new Date(payload.nowIso),
      }),
    [payload, state],
  );

  // Built with the same pure planner the save action runs server-side, from
  // the same inputs — so the preview and what lands in the calendar agree.
  const plan = useMemo(
    () =>
      buildReclaimPlan({
        from: new Date(payload.session.startsAt),
        to: new Date(payload.session.endsAt),
        work: payload.work,
        goals: payload.goals,
        now: new Date(payload.nowIso),
      }),
    [payload],
  );

  const copy = VERDICT_COPY[result.verdict];
  const tone = VERDICT_TONE[result.verdict];

  function decide(choseToSkip: boolean) {
    setDecided(choseToSkip);
    startTransition(async () => {
      await recordDecision({
        sessionId: payload.session.id,
        verdict: result.verdict,
        score: result.score,
        reasons: result.reasons,
        choseToSkip,
      });
    });
  }

  return (
    <Stagger className="flex flex-col gap-6">
      <Rise>
        <div>
          <PillLink href="/timetable" variant="ghost" size="sm" className="-ml-3 mb-3">
            ← Back to the week
          </PillLink>
          <SectionHeading
            size="h1"
            light={payload.session.moduleName}
            bold={SESSION_TYPE_LABEL[payload.session.type]}
          />
          {/* Over a background blob — see home-view. */}
          <p className="mt-2 text-label text-ink/80 tnum">
            <LocalTime iso={payload.session.startsAt} mode="when" />
            {payload.session.room ? ` · ${payload.session.room}` : ""}
          </p>
        </div>
      </Rise>

      <Rise>
        <Card>
          <p className="text-caption font-semibold uppercase text-muted">The call</p>

          {/* The headline swaps with the verdict, so it must animate as a
              change of answer rather than a silent text replacement. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={result.verdict}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: EASE_SOFT }}
              className={cn("mt-2 text-h1 font-bold", tone.ink)}
            >
              {copy.headline}
            </motion.h2>
          </AnimatePresence>

          <p className="mt-1 text-body text-muted">{copy.sub}</p>

          <div className="mt-6">
            <VerdictGauge score={result.score} tone={tone.hex} />
          </div>

          {result.guardrail && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE_SOFT, delay: 0.15 }}
              className="mt-6 rounded-tile bg-coral-soft p-4"
            >
              <p className="text-caption font-semibold uppercase text-coral">
                This one is not up for debate
              </p>
              <p className="mt-1 text-label text-ink">{result.guardrail}</p>
            </motion.div>
          )}
        </Card>
      </Rise>

      <Rise>
        {/* Flora mirrors the verdict — she is never allowed to contradict the
            engine, only to soften how it lands. */}
        <FloraSays context={{ screen: "advisor", verdict: result.verdict }} />
      </Rise>

      <Rise>
        <section>
          <h3 className="text-caption font-semibold uppercase text-muted">Why</h3>
          <Stagger className="mt-3 flex flex-col gap-2" delay={0.1}>
            <AnimatePresence initial={false}>
              {result.reasons.map((reason) => (
                <motion.div
                  key={reason.text}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={LAYOUT_SPRING}
                >
                  <Card className="flex items-start gap-3 p-4">
                    <span
                      className={cn(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-caption font-bold",
                        reason.side === "go" && "bg-coral-soft text-coral",
                        reason.side === "skip" && "bg-leaf-soft text-leaf",
                        reason.side === "context" && "bg-canvas text-muted",
                      )}
                      aria-hidden="true"
                    >
                      {reason.side === "go" ? "→" : reason.side === "skip" ? "←" : "?"}
                    </span>
                    <p className="text-label text-ink">{reason.text}</p>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </Stagger>
        </section>
      </Rise>

      <Rise>
        <Card>
          <h3 className="text-caption font-semibold uppercase text-muted">
            How are you, honestly?
          </h3>
          <div className="mt-3 flex gap-1 rounded-full bg-canvas p-1">
            {STATES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setState(s.id)}
                aria-pressed={state === s.id}
                className={cn(
                  "relative flex-1 rounded-full px-3 py-2 text-label font-semibold",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  state === s.id ? "text-paper" : "text-muted hover:text-ink",
                )}
              >
                {state === s.id && (
                  <motion.span
                    layoutId="state-pill"
                    transition={LAYOUT_SPRING}
                    className="absolute inset-0 rounded-full bg-ink"
                  />
                )}
                <span className="relative">{s.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-caption text-muted">
            Being ill is a reason to rest, not a loophole — it never overrides the
            rules above.
          </p>
        </Card>
      </Rise>

      <Rise>
        <AnimatePresence mode="wait" initial={false}>
          {decided === null ? (
            <motion.div
              key="choose"
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: EASE_SOFT }}
              className="flex gap-3"
            >
              <PillButton
                onClick={() => decide(false)}
                disabled={pending}
                className="flex-1"
              >
                I&rsquo;m going
              </PillButton>
              <motion.button
                type="button"
                onClick={() => decide(true)}
                disabled={pending}
                whileTap={press}
                transition={SOFT_SPRING}
                className="flex-1 rounded-full bg-paper px-5 text-label font-semibold text-ink shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                I&rsquo;m skipping
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="decided"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_SOFT }}
            >
              <div className="flex flex-col gap-6">
                <Card className="text-center">
                  <p className="text-h2 font-bold">
                    {decided ? "Noted — skipping" : "Noted — going"}
                  </p>
                  <p className="mt-2 text-label text-muted">
                    {decided
                      ? "Logged, so the advisor can learn your pattern. Here is what to do with the time."
                      : "Mark yourself present from the week view once you are there."}
                  </p>
                  {!decided && (
                    <PillLink href="/timetable" variant="soft" size="md" className="mt-5 w-full">
                      Back to the week
                    </PillLink>
                  )}
                </Card>

                {decided && plan.length > 0 && (
                  <ReclaimPlan
                    slots={plan}
                    sessionId={payload.session.id}
                    saved={savedMessage}
                    onSaved={setSavedMessage}
                  />
                )}

                {decided && (
                  <PillLink href="/timetable" variant="ghost" size="md" className="w-full">
                    Back to the week
                  </PillLink>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Rise>
    </Stagger>
  );
}
