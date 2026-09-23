"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { SketchBar } from "@/components/charts/sketch-bar";
import { ShapeFrame } from "@/components/board/card-shape";
import { Pin } from "@/components/board/pin";
import { FloraSays } from "@/components/flora/flora-says";
import {
  IconAttendance,
  IconBoard,
  IconGoal,
  IconMoney,
} from "@/components/ui/icons";
import { Illustration } from "@/components/ui/illustration";
import { LocalTime } from "@/components/ui/local-time";
import { Rise, Stagger } from "@/components/ui/motion-primitives";
import { PillLink } from "@/components/ui/pill-button";
import { cn } from "@/lib/cn";
import { hangOf } from "@/lib/board/items";
import { classTiming, formatCountdown, greetingFor } from "@/lib/home/countdown";
import { SOFT_SPRING } from "@/lib/motion";
import { toneBg, toneSoft, type Tone } from "@/lib/tones";
import { useNow } from "@/lib/use-now";
import { SESSION_TYPE_LABEL, type SessionVM } from "@/lib/view-models";

/**
 * Presentational Home. Kept free of data access so the real page and the
 * /preview gallery render the exact same component — a preview that is a
 * separate copy drifts within a week and stops being worth looking at.
 *
 * Three things, in the order a student needs them: the next class (as a
 * ticket), what needs them (pinned notes, the Board's own), and where to go.
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
  const now = useNow();
  const mounted = now > 0;
  const greeting = mounted ? greetingFor(new Date(now).getHours()) : "Hello,";

  return (
    <Stagger className="flex flex-col gap-8">
      {/* ------------------------------------------------------ greeting */}
      <div className="flex flex-col gap-6 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] @4xl:items-end @4xl:gap-10">
        <Rise>
          <header>
            {/* The animated mark greets you on phones and tablets; on a laptop
                it lives in the sidebar instead, so it is shown once. */}
            <Logo size={44} className="mb-6 flex w-fit lg:hidden" />
            <LocalTime
              iso={todayIso}
              mode="dayLong"
              /* Sits over a background blob, where muted is still too light. */
              className="text-caption font-semibold uppercase text-ink/80"
            />
            <h1 className="mt-2 text-display @2xl:text-[2.75rem] @2xl:leading-[1.05]">
              <span className="block font-normal">{greeting}</span>
              <span className="block font-bold">{displayName}</span>
            </h1>
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
      </div>

      <div className="flex flex-col gap-8 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] @4xl:items-start @4xl:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          {/* ---------------------------------------------------- the ticket */}
          <Rise>
            {nextSession ? (
              <ClassTicket session={nextSession} live={nextSessionLive} now={now} />
            ) : (
              <EmptyTicket />
            )}
          </Rise>

          {/* ---------------------------------------------- what needs you */}
          <Rise>
            <NeedsYou
              modulesBelow={modulesBelow}
              modulesThin={Math.max(0, atRisk - modulesBelow)}
              overdue={overdueCount}
              dueToday={dueTodayCount}
              hasTimetable={nextSession !== null}
            />
          </Rise>
        </div>

        {/* ------------------------------------------------------ shortcuts */}
        <Rise>
          <Shortcuts />
        </Rise>
      </div>
    </Stagger>
  );
}

// ------------------------------------------------------------------ ticket

function timeParts(iso: string) {
  const parts = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).formatToParts(
    new Date(iso),
  );
  const clock = parts
    .filter((p) => p.type !== "dayPeriod")
    .map((p) => p.value)
    .join("")
    .trim();
  const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  return { clock, period };
}

function dayLabel(iso: string, now: number) {
  const d = new Date(iso);
  const today = new Date(now);
  const diff = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function ClassTicket({ session, live, now }: { session: SessionVM; live: boolean; now: number }) {
  const mounted = now > 0;
  const timing = mounted ? classTiming(session.startsAt, session.endsAt, new Date(now)) : null;
  const isLive = timing ? timing.state === "live" : live;
  const start = mounted ? timeParts(session.startsAt) : null;
  const countdown =
    timing?.state === "upcoming" ? formatCountdown(timing.minutesUntil) : null;

  return (
    <div className="ticket-hang">
      <article
        className="ticket flex min-h-44 overflow-hidden rounded-card bg-paper"
        aria-label={`${isLive ? "On now" : "Next class"}: ${session.moduleName}`}
      >
        {/* The stub: when, in big type. */}
        <div
          className={cn(
            "flex w-[var(--stub)] shrink-0 flex-col items-center justify-center gap-1 px-3 py-6 text-center",
            toneSoft[session.tone],
          )}
        >
          {isLive ? (
            <>
              <span className="relative flex size-3" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-3 rounded-full bg-leaf" />
              </span>
              <span className="text-h1 font-bold tracking-tight">Now</span>
              <span className="text-caption font-semibold uppercase text-ink/70">
                until <LocalTime iso={session.endsAt} mode="time" />
              </span>
            </>
          ) : (
            <>
              <span className="text-caption font-semibold uppercase text-ink/70">
                {mounted ? dayLabel(session.startsAt, now) : " "}
              </span>
              <span className="text-[2rem] font-bold leading-none tracking-tight tnum @2xl:text-[2.4rem]">
                {start?.clock ?? " "}
              </span>
              {start?.period && (
                <span className="text-caption font-bold uppercase text-ink/70">{start.period}</span>
              )}
            </>
          )}
        </div>

        {/* The perforation, then the ticket proper. */}
        <div className="flex min-w-0 flex-1 flex-col border-l-2 border-dashed border-hairline p-5 @2xl:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption font-semibold uppercase text-muted">
              {isLive ? "On now" : "Next class"}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-chip px-2.5 py-1 text-caption font-semibold uppercase text-ink/80",
                toneSoft[session.tone],
              )}
            >
              {SESSION_TYPE_LABEL[session.type]}
            </span>
          </div>

          <h2 className="mt-2 line-clamp-2 break-words text-h1 font-bold">{session.moduleName}</h2>
          <p className="mt-1 text-label text-muted tnum">
            <LocalTime iso={session.startsAt} mode="time" /> – <LocalTime iso={session.endsAt} mode="time" />
            {session.room ? ` · ${session.room}` : ""}
            {session.code ? ` · ${session.code}` : ""}
          </p>

          {timing?.state === "live" ? (
            <div className="mt-3">
              <SketchBar
                value={timing.progress}
                seedKey={`ticket-${session.id}`}
                tone={`var(--color-${session.tone})`}
                height={16}
              />
              <p className="mt-1 text-caption font-semibold uppercase text-ink/70 tnum">
                {formatCountdown(timing.minutesLeft) ?? ""} left
              </p>
            </div>
          ) : countdown ? (
            <p className="mt-3 text-label font-semibold tnum">Starts in {countdown}</p>
          ) : null}

          {(session.isAssessed || session.hasSubmission) && (
            <p className="mt-3 inline-block self-start rounded-chip bg-coral-soft px-2.5 py-1 text-caption font-semibold uppercase text-coral">
              {session.hasSubmission ? "Submission due" : "Assessed"}
            </p>
          )}

          {/* Stacked full-width on a phone, side by side once there is room. */}
          <div className="mt-auto flex flex-col gap-2 pt-5 @md:flex-row">
            <PillLink href={`/timetable/${session.id}`} size="md" className="whitespace-nowrap">
              Go or skip?
            </PillLink>
            <PillLink href="/timetable" variant="soft" size="md" className="whitespace-nowrap">
              See the week
            </PillLink>
          </div>
        </div>
      </article>
    </div>
  );
}

function EmptyTicket() {
  return (
    <div className="ticket-hang">
      <article className="ticket flex min-h-44 overflow-hidden rounded-card bg-paper">
        <div className="flex w-[var(--stub)] shrink-0 items-center justify-center bg-sky-soft p-2">
          <Illustration name="timetable" tone="sky" className="w-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col border-l-2 border-dashed border-hairline p-5 @2xl:p-6">
          <p className="text-caption font-semibold uppercase text-muted">Next class</p>
          <h2 className="mt-2 text-h2 font-bold">Nothing here yet</h2>
          <p className="mt-1 text-label text-muted">
            Import your timetable and UniBoard starts tracking attendance and calling go-or-skip.
          </p>
          <div className="mt-auto pt-5">
            <PillLink href="/timetable" size="md" className="w-full whitespace-nowrap @md:w-auto">
              Import my timetable
            </PillLink>
          </div>
        </div>
      </article>
    </div>
  );
}

// ------------------------------------------------------------- needs you

type Note = { key: string; title: string; text: string; tone: Tone; href: string };

function NeedsYou({
  modulesBelow,
  modulesThin,
  overdue,
  dueToday,
  hasTimetable,
}: {
  modulesBelow: number;
  modulesThin: number;
  overdue: number;
  dueToday: number;
  hasTimetable: boolean;
}) {
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const notes: Note[] = [
    modulesBelow > 0 && {
      key: "below",
      title: `${modulesBelow} ${plural(modulesBelow, "module", "modules")} below the line`,
      text: "Check attendance before you skip anything.",
      tone: "coral" as const,
      href: "/timetable",
    },
    overdue > 0 && {
      key: "overdue",
      title: `${overdue} overdue`,
      text: plural(overdue, "Something on the board is past its date.", "Things on the board are past their date."),
      tone: "coral" as const,
      href: "/board",
    },
    dueToday > 0 && {
      key: "today",
      title: `${dueToday} due today`,
      text: "On the board, most urgent first.",
      tone: "sky" as const,
      href: "/board",
    },
    modulesThin > 0 && {
      key: "thin",
      title: `${modulesThin} getting thin`,
      text: plural(modulesThin, "One module is close to its threshold.", "A few modules are close to their thresholds."),
      tone: "sun" as const,
      href: "/timetable",
    },
  ].filter(Boolean) as Note[];

  if (notes.length === 0) {
    notes.push({
      key: "clear",
      title: "All clear",
      text: hasTimetable ? "Nothing pressing today." : "Nothing to worry about yet.",
      tone: "leaf",
      href: "/board",
    });
  }

  return (
    <section>
      <h2 className="text-caption font-semibold uppercase text-ink/80">Needs you</h2>
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-6">
        {notes.map((n, i) => {
          const { tilt } = hangOf(`home:${n.key}`);
          return (
            <motion.li
              key={n.key}
              className="card-hang relative w-[calc(50%-0.5rem)] list-none @2xl:w-44"
              style={{ transformOrigin: "50% 0%", ["--tone" as string]: `var(--color-${n.tone})` }}
              initial={{ opacity: 0, y: -24, rotate: tilt - 8 }}
              animate={{ opacity: 1, y: 0, rotate: [tilt - 8, tilt + 3, tilt] }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.8, times: [0, 0.55, 1] }}
            >
              <Link
                href={n.href}
                className="block rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                <motion.div whileHover={{ y: -3 }} transition={SOFT_SPRING}>
                  <ShapeFrame shape="sticky" className="min-h-28">
                    <p className="text-body font-bold leading-tight">{n.title}</p>
                    <p className="mt-1 text-[0.72rem] leading-snug text-ink/75">{n.text}</p>
                  </ShapeFrame>
                </motion.div>
              </Link>
              <Pin
                tone={n.tone === "coral" ? "var(--color-ink)" : "var(--color-coral)"}
                delay={0.15 + i * 0.08}
                style={{ left: "calc(50% - 11px)", top: -9 }}
              />
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

// -------------------------------------------------------------- shortcuts

const SHORTCUTS = [
  { href: "/timetable", label: "Attendance", hint: "Rings, and how many you can miss", icon: IconAttendance, tone: "leaf" },
  { href: "/board", label: "Board", hint: "Hand-ins, exams and events", icon: IconBoard, tone: "coral" },
  { href: "/money", label: "Money", hint: "What today can take", icon: IconMoney, tone: "sun" },
  { href: "/me", label: "Goals", hint: "What you are working towards", icon: IconGoal, tone: "iris" },
] as const;

function Shortcuts() {
  return (
    <section>
      <h2 className="text-caption font-semibold uppercase text-ink/80">Jump to</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 @2xl:grid-cols-4 @4xl:grid-cols-2">
        {SHORTCUTS.map(({ href, label, hint, icon: Icon, tone }) => (
          <li key={href + label}>
            <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} transition={SOFT_SPRING} className="h-full">
              <Link
                href={href}
                className="group flex h-full flex-col rounded-tile bg-paper p-4 shadow-soft hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span className={cn("grid size-12 place-items-center rounded-full", toneSoft[tone])}>
                  <Icon className="size-7" />
                </span>
                <span className="mt-3 flex items-center justify-between gap-2 text-body font-bold">
                  {label}
                  <span
                    className={cn(
                      "size-2 rounded-full opacity-0 transition-opacity group-hover:opacity-100",
                      toneBg[tone],
                    )}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-0.5 text-label leading-snug text-muted">{hint}</span>
              </Link>
            </motion.div>
          </li>
        ))}
      </ul>
    </section>
  );
}
