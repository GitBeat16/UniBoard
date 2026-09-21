"use client";

import { Card } from "@/components/ui/card";
import { Illustration } from "@/components/ui/illustration";
import { FloraSays } from "@/components/flora/flora-says";
import { LocalTime } from "@/components/ui/local-time";
import {
  IconAssignment,
  IconAttendance,
  IconFood,
  IconGoal,
} from "@/components/ui/icons";
import { AnimatedNumber, Rise, Stagger } from "@/components/ui/motion-primitives";
import { ModuleTile } from "@/components/ui/module-tile";
import { PillLink } from "@/components/ui/pill-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/cn";
import { toneBg, toneSoft, toneText } from "@/lib/tones";
import { SESSION_TYPE_LABEL, type SessionVM } from "@/lib/view-models";

/**
 * Presentational Home. Kept free of data access so the real page and the
 * /preview gallery render the exact same component — a preview that is a
 * separate copy drifts within a week and stops being worth looking at.
 */
export function HomeView({
  displayName,
  todayIso,
  nextSession,
  nextSessionLive = false,
  atRisk = 0,
  modulesBelow = 0,
  overdueCount = 0,
  dueTodayCount = 0,
  minutesToNextClass = null,
}: {
  displayName: string;
  todayIso: string;
  nextSession: SessionVM | null;
  /** Started and not yet over. Decided by the page, which already has the clock. */
  nextSessionLive?: boolean;
  atRisk?: number;
  modulesBelow?: number;
  overdueCount?: number;
  dueTodayCount?: number;
  minutesToNextClass?: number | null;
}) {
  return (
    <Stagger className="flex flex-col gap-8">
      <Rise>
        <header>
          <LocalTime
            iso={todayIso}
            mode="dayLong"
            /* Sits over a background blob, where muted is still too light. */
            className="text-caption font-semibold uppercase text-ink/80"
          />
          <SectionHeading className="mt-2" light="Hello," bold={displayName} />
        </header>
      </Rise>

      <Rise>
        <FloraSays
          context={{
            screen: "home",
            hasTimetable: nextSession !== null,
            modulesBelow,
            modulesAtRisk: atRisk,
            overdueCount,
            dueTodayCount,
            minutesToNextClass,
          }}
        />
      </Rise>

      <Rise>
        <Card className="relative overflow-hidden">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase text-muted">
            {nextSessionLive && (
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-leaf" />
              </span>
            )}
            {nextSessionLive ? "On now" : "Next class"}
          </p>

          {nextSession ? (
            <>
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-1.5",
                  toneBg[nextSession.tone],
                )}
                aria-hidden="true"
              />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-h1 font-bold">
                    {nextSession.moduleName}
                  </h2>
                  <p className="mt-1 text-body text-muted tnum">
                    {nextSessionLive ? (
                      <>
                        until <LocalTime iso={nextSession.endsAt} mode="time" />
                      </>
                    ) : (
                      <LocalTime iso={nextSession.startsAt} mode="when" />
                    )}
                    {nextSession.room ? ` · ${nextSession.room}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-chip px-3 py-1 text-caption font-semibold uppercase",
                    toneSoft[nextSession.tone],
                    toneText[nextSession.tone],
                  )}
                >
                  {SESSION_TYPE_LABEL[nextSession.type]}
                </span>
              </div>

              {(nextSession.isAssessed || nextSession.hasSubmission) && (
                <p className="mt-3 inline-block rounded-chip bg-coral-soft px-2.5 py-1 text-caption font-semibold uppercase text-coral">
                  {nextSession.hasSubmission ? "Submission due" : "Assessed"}
                </p>
              )}

              <PillLink href="/timetable" variant="soft" size="md" className="mt-5 w-full">
                See the week
              </PillLink>
            </>
          ) : (
            <>
              <Illustration name="timetable" tone="sky" className="mx-auto mt-2 w-44" />
              <p className="mt-1 text-h2 font-semibold">Nothing here yet</p>
              <p className="mt-2 text-body text-muted">
                Import your timetable and UniBoard can start tracking attendance
                and calling go-or-skip.
              </p>
              <PillLink href="/timetable" className="mt-6 w-full">
                Import my timetable
              </PillLink>
            </>
          )}
        </Card>
      </Rise>

      {atRisk > 0 && (
        <Rise>
          <Card className="flex items-center gap-4 border-l-4 border-coral p-5">
            <div>
              <p className="text-h2 font-bold text-coral">
                <AnimatedNumber value={atRisk} />{" "}
                {atRisk === 1 ? "module needs" : "modules need"} attention
              </p>
              <p className="mt-1 text-label text-muted">
                Attendance is at or under the line. Check before you skip.
              </p>
            </div>
          </Card>
        </Rise>
      )}

      <Rise>
        <section>
          <h2 className="text-caption font-semibold uppercase text-muted">
            Jump to
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6">
            <ModuleTile
              label="Attendance"
              tone="leaf"
              href="/timetable"
              icon={IconAttendance}
            />
            <ModuleTile
              label="Assignments"
              tone="coral"
              href="/board"
              icon={IconAssignment}
            />
            <ModuleTile label="Goals" tone="iris" href="/me" icon={IconGoal} />
            <ModuleTile label="Food" tone="sun" href="/money" icon={IconFood} />
          </div>
        </section>
      </Rise>
    </Stagger>
  );
}

