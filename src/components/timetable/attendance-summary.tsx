"use client";

import { Card } from "@/components/ui/card";
import { SketchRing } from "@/components/charts/sketch-ring";
import { AnimatedNumber, Rise, Stagger } from "@/components/ui/motion-primitives";
import { cn } from "@/lib/cn";
import { AttendanceImport } from "@/components/timetable/attendance-import";
import type { ModuleAttendance } from "@/lib/attendance/stats";

const STATUS: Record<
  ModuleAttendance["status"],
  { label: string; chip: string; ring: string }
> = {
  safe: { label: "Safe", chip: "bg-leaf-soft text-leaf", ring: "var(--color-leaf)" },
  thin: { label: "Getting thin", chip: "bg-sun-soft text-sun", ring: "var(--color-sun)" },
  below: { label: "Below threshold", chip: "bg-coral-soft text-coral", ring: "var(--color-coral)" },
  unknown: { label: "Nothing marked", chip: "bg-canvas text-muted", ring: "var(--color-muted)" },
};

export function AttendanceSummary({
  modules,
  today,
  onEdit,
}: {
  modules: ModuleAttendance[];
  /** Today on the student's calendar, for the "up to" date. */
  today: string;
  /** Opens the sheet that corrects a subject and its figures. */
  onEdit?: (moduleId: string) => void;
}) {
  if (modules.length === 0) return null;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-caption font-semibold uppercase text-muted">Attendance</h2>
        <AttendanceImport asOfDefault={today} />
      </div>

      <Stagger className="mt-4 flex flex-col gap-3">
        {modules.map((m) => {
          const s = STATUS[m.status];

          return (
            <Rise key={m.moduleId}>
              <Card
                className={cn(
                  "relative flex items-center gap-4 p-4",
                  onEdit && "transition-shadow hover:shadow-lift",
                )}
              >
                {/* The whole card is the way in; a pencil says so. */}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(m.moduleId)}
                    aria-label={`Edit ${m.name} and its attendance`}
                    className="absolute inset-0 z-10 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  />
                )}
                {onEdit && (
                  <span className="absolute right-3 top-3 text-muted" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20.2c-.2-1.1.2-2.6.6-3.6L15.1 6.1c.6-.6 1.5-.6 2.1 0l1.4 1.3c.6.6.7 1.6.1 2.2L8.1 20.2c-1 .4-2.5.7-3.6.6Z" />
                      <path d="m13.6 7.7 3.4 3.3" />
                    </svg>
                  </span>
                )}
                <SketchRing
                  value={m.percent ?? 0}
                  seedKey={m.moduleId}
                  size={72}
                  thickness={9}
                  tone={s.ring}
                >
                  <span className="text-label font-bold tnum">
                    {m.percent === null ? (
                      "—"
                    ) : (
                      <AnimatedNumber value={m.percent} suffix="%" />
                    )}
                  </span>
                </SketchRing>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-body font-semibold">{m.name}</h3>

                  {/* The number students actually plan around. */}
                  <p className="mt-0.5 text-label text-muted">
                    {m.held === 0 ? (
                      "No classes marked yet"
                    ) : m.canMissMore > 0 ? (
                      <>
                        You can miss{" "}
                        <span className="font-semibold text-ink">
                          <AnimatedNumber value={m.canMissMore} />
                        </span>{" "}
                        more
                      </>
                    ) : (
                      <span className="font-semibold text-coral">
                        No room left to miss any
                      </span>
                    )}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Status is a word, not only a colour. */}
                    <span
                      className={cn(
                        "rounded-chip px-2.5 py-1 text-caption font-semibold uppercase",
                        s.chip,
                      )}
                    >
                      {s.label}
                    </span>
                    {m.unmarked > 0 && (
                      <span className="text-caption text-muted">
                        {m.unmarked} unmarked
                      </span>
                    )}
                    {/* Where the number came from matters: one of these is the
                        college's own count, and she should be able to tell. */}
                    {m.officialAsOf && (
                      <span className="text-caption text-muted">
                        college&rsquo;s count to{" "}
                        {m.officialAsOf.toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Rise>
          );
        })}
      </Stagger>
    </section>
  );
}
