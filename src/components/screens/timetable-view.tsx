"use client";

import { Illustration } from "@/components/ui/illustration";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { FloraSays } from "@/components/flora/flora-says";
import { Rise, Stagger } from "@/components/ui/motion-primitives";
import { SectionHeading } from "@/components/ui/section-heading";
import { AttendanceSummary } from "@/components/timetable/attendance-summary";
import { ImportPanel } from "@/components/timetable/import-panel";
import { SessionCard } from "@/components/timetable/session-card";
import { ClassSheet } from "@/components/timetable/class-sheet";
import { WeekStrip, dayKey } from "@/components/timetable/week-strip";
import { EASE_SOFT } from "@/lib/motion";
import { useNow } from "@/lib/use-now";
import type { ModuleAttendance } from "@/lib/attendance/stats";
import type { SessionVM } from "@/lib/view-models";

/**
 * How old the freshest college figure is, in days.
 *
 * The newest one, because that is the one she last refreshed — an old figure
 * on a module she has since dropped should not make the rest look stale.
 */
function officialAgeDays(modules: ModuleAttendance[], now: number) {
  const dates = modules.map((m) => m.officialAsOf).filter((d): d is Date => d !== null);
  if (dates.length === 0 || now === 0) return null;
  const newest = Math.max(...dates.map((d) => d.getTime()));
  return Math.max(0, Math.floor((now - newest) / 86_400_000));
}

/** How many days the open day is from today: negative behind, positive ahead. */
function daysFromToday(key: string) {
  const open = new Date(`${key}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((open.getTime() - today.getTime()) / 86_400_000);
}

/** Today on the viewer's calendar, as YYYY-MM-DD. */
function todayKey() {
  return dayKey(new Date());
}

function startOfWeek(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  // Monday-first: universities do not run Sunday-first weeks.
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export function TimetableView({
  sessions,
  modules,
}: {
  sessions: SessionVM[];
  modules: ModuleAttendance[];
}) {
  /**
   * Dates are grouped and formatted in the viewer's timezone. Doing that during
   * SSR would render the server's timezone and then mismatch on hydration, so
   * the day-dependent part waits one tick for mount. Everything fades in
   * anyway, so there is nothing to see in the gap.
   */
  const now = useNow();
  const mounted = now > 0;
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  // Which class the sheet is changing, or "new" when one is being added.
  const [editing, setEditing] = useState<SessionVM | "new" | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, SessionVM[]>();
    for (const s of sessions) {
      const key = dayKey(new Date(s.startsAt));
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }
    return map;
  }, [sessions]);

  const days = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const selectedKey = selected ?? dayKey(new Date());
  const inThisWeek = days.some((d) => dayKey(d) === selectedKey);
  const activeKey = inThisWeek ? selectedKey : dayKey(days[0]);
  const todays = byDay.get(activeKey) ?? [];

  const weekLabel = useMemo(() => {
    const first = days[0];
    const last = days[6];
    const sameMonth = first.getMonth() === last.getMonth();
    const fmt = (d: Date, withMonth: boolean) =>
      d.toLocaleDateString(undefined, {
        day: "numeric",
        ...(withMonth ? { month: "short" } : {}),
      });
    return `${fmt(first, !sameMonth)} – ${fmt(last, true)}`;
  }, [days]);

  const empty = sessions.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading light="Your week," bold="at a glance" />

      {mounted && (
        <FloraSays
          context={{
            screen: "timetable",
            hasTimetable: sessions.length > 0,
            modulesBelow: modules.filter((m) => m.status === "below").length,
            modulesAtRisk: modules.filter((m) => m.status === "thin").length,
            unmarkedCount: modules.reduce((n, m) => n + m.unmarked, 0),
            hasOfficial: modules.some((m) => m.officialAsOf !== null),
            officialAgeDays: officialAgeDays(modules, now),
            nothingOnToday: sessions.length > 0 && todays.length === 0,
            // What she can see on the screen with you: which day is open,
            // how full it is, and what is still unanswered on it.
            dayOffset: daysFromToday(activeKey),
            dayCount: todays.length,
            dayUnmarked: todays.filter(
              (s) => !s.status && new Date(s.startsAt).getTime() <= now,
            ).length,
          }}
        />
      )}

      {empty ? (
        <Stagger className="mx-auto w-full max-w-xl">
          <Rise>
            <Illustration name="timetable" tone="sky" className="mx-auto -mb-2 w-56" />
          </Rise>
          <Rise>
            <ImportPanel />
          </Rise>
        </Stagger>
      ) : (
        <div className="flex flex-col gap-8 @2xl:grid @2xl:grid-cols-2 @2xl:items-start @4xl:grid-cols-[3fr_2fr]">
          {/* The week and the day's classes; attendance and "add more" beside
              them once there is room. */}
          <div className="flex min-w-0 flex-col gap-8">
          {mounted && (
            <Stagger>
              <Rise>
                <Card className="p-5">
                  <WeekStrip
                    days={days}
                    selected={activeKey}
                    onSelect={setSelected}
                    countFor={(k) => byDay.get(k)?.length ?? 0}
                    onShiftWeek={(delta) => setWeekOffset((w) => w + delta)}
                    weekLabel={weekLabel}
                  />
                </Card>
              </Rise>
            </Stagger>
          )}

          {mounted && (
            <section>
              <h2 className="text-caption font-semibold uppercase text-muted">
                {new Date(`${activeKey}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h2>

              {/* Swapping days animates the whole list out and the new one in,
                  so the change of context is legible rather than a flicker. */}
              <AnimatePresence mode="wait" initial={false}>
                <Stagger key={activeKey} className="mt-4 flex flex-col gap-3">
                  {todays.length === 0 ? (
                    <Rise>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, ease: EASE_SOFT }}
                      >
                        <Card className="p-6 text-center">
                          <p className="text-h2 font-semibold">Nothing on</p>
                          <p className="mt-1 text-label text-muted">
                            A clear day. Worth putting to use.
                          </p>
                        </Card>
                      </motion.div>
                    </Rise>
                  ) : (
                    todays.map((s) => (
                      <Rise key={s.id}>
                        <SessionCard session={s} now={now} onEdit={() => setEditing(s)} />
                      </Rise>
                    ))
                  )}

                  {/* A read timetable is never quite right, and a day gains a
                      guest lecture now and then. */}
                  <Rise>
                    <button
                      type="button"
                      onClick={() => setEditing("new")}
                      className="w-full rounded-tile border border-dashed border-hairline px-5 py-4 text-label font-semibold text-muted hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      Add a class to this day
                    </button>
                  </Rise>
                </Stagger>
              </AnimatePresence>
            </section>
          )}

          </div>

          <div className="flex min-w-0 flex-col gap-8">
          <AttendanceSummary modules={modules} today={todayKey()} />

          <section>
            <h2 className="text-caption font-semibold uppercase text-muted">
              Add more
            </h2>
            <div className="mt-4">
              <ImportPanel compact />
            </div>
          </section>
          </div>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <ClassSheet
            session={editing === "new" ? undefined : editing}
            dayKey={activeKey}
            modules={modules}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
