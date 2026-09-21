"use client";

import { Card } from "@/components/ui/card";
import { SketchRing } from "@/components/charts/sketch-ring";
import { AnimatedNumber, Rise, Stagger } from "@/components/ui/motion-primitives";
import { cn } from "@/lib/cn";
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

export function AttendanceSummary({ modules }: { modules: ModuleAttendance[] }) {
  if (modules.length === 0) return null;

  return (
    <section>
      <h2 className="text-caption font-semibold uppercase text-muted">Attendance</h2>

      <Stagger className="mt-4 flex flex-col gap-3">
        {modules.map((m) => {
          const s = STATUS[m.status];

          return (
            <Rise key={m.moduleId}>
              <Card className="flex items-center gap-4 p-4">
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
