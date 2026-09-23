import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ShapeFrame } from "@/components/board/card-shape";
import { Pin } from "@/components/board/pin";
import { TourVideo } from "@/components/landing/tour-video";
import { BlobBackground } from "@/components/ui/blob-background";
import {
  IconAdvisor,
  IconAttendance,
  IconBoard,
  IconLocation,
  IconMoney,
  IconSparkle,
  IconTimetable,
  IconUsers,
} from "@/components/ui/icons";
import { PillLink } from "@/components/ui/pill-button";
import { cn } from "@/lib/cn";
import { toneSoft, type Tone } from "@/lib/tones";
import { TOUR_VIDEO, tourChapters } from "@/lib/tour";

export const metadata: Metadata = {
  title: "UniBoard — your whole uni day, on one board",
  description:
    "Timetable, attendance, an honest go-or-skip call, a soft board for everything with a date, and a budget that adds up. Free, for students.",
};

const FEATURES: Array<{ icon: typeof IconTimetable; tone: Tone; title: string; text: string }> = [
  {
    icon: IconTimetable,
    tone: "sky",
    title: "Any timetable, three ways in",
    text: "A calendar link, an .ics file, or a photo or PDF of the printed grid — it reads the week for you.",
  },
  {
    icon: IconAttendance,
    tone: "leaf",
    title: "Attendance you can plan around",
    text: "Your threshold, your modules, and the number that matters: how many more you can miss.",
  },
  {
    icon: IconAdvisor,
    tone: "coral",
    title: "Go or skip, honestly",
    text: "A call that shows its working. Assessed labs and monitored attendance always mean go.",
  },
  {
    icon: IconSparkle,
    tone: "iris",
    title: "Skipped? Reclaim it",
    text: "The freed hours become a real plan — work in focused blocks, breaks included.",
  },
  {
    icon: IconBoard,
    tone: "coral",
    title: "A soft board for everything",
    text: "Hand-ins, exams and events pinned by urgency. Pick a card shape; watch it swing on its pin.",
  },
  {
    icon: IconUsers,
    tone: "sky",
    title: "Campus events, shared",
    text: "Share an event with your university; classmates pin it to their own boards. You stay anonymous.",
  },
  {
    icon: IconMoney,
    tone: "sun",
    title: "A budget that adds up",
    text: "One weekly number becomes what today can take. Log a spend in two taps, in rupees or anything else.",
  },
  {
    icon: IconLocation,
    tone: "leaf",
    title: "Food a short walk away",
    text: "Cafés and canteens from OpenStreetMap, ranked by the walk from campus. Veg filter included.",
  },
];

export default function WelcomePage() {
  const chapters = tourChapters();

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <BlobBackground variant="calm" />

      {/* ------------------------------------------------------------ header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-6 md:px-8 lg:px-10">
        <Link href="/welcome" className="rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
          <Logo size={40} />
        </Link>
        <nav className="flex items-center gap-2">
          <PillLink href="/sign-in" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </PillLink>
          <PillLink href="/sign-in" size="sm">
            Get started
          </PillLink>
        </nav>
      </header>

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-14 md:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-10 lg:pt-20">
          <div className="max-w-2xl">
            <p className="text-caption font-semibold uppercase text-ink/80">For students · free</p>
            <h1 className="mt-4 text-[2.6rem] leading-[1.02] tracking-tight sm:text-[3.4rem] lg:text-[4rem]">
              <span className="block font-normal">Your whole uni day,</span>
              <span className="block font-bold">on one board.</span>
            </h1>
            <p className="mt-6 max-w-xl text-body text-ink/80 sm:text-[1.125rem] sm:leading-relaxed">
              UniBoard reads your timetable, keeps count of your attendance, gives you an honest
              go-or-skip call, pins everything with a date to a soft board, and turns one budget
              into what today can take.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PillLink href="/sign-in">Get started</PillLink>
              <PillLink href="#tour" variant="soft">
                Watch the tour
              </PillLink>
            </div>
            <p className="mt-4 text-label text-ink/70">
              No email needed to look around — start as a guest and keep everything later.
            </p>
          </div>

          <HeroBoard className="hidden lg:block" />
        </section>

        {/* ------------------------------------------------------------ tour */}
        <section id="tour" className="scroll-mt-8 bg-paper/60 py-20 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8 lg:px-10">
            <p className="text-caption font-semibold uppercase text-muted">
              The tour · {Math.round(TOUR_VIDEO.seconds)} seconds
            </p>
            <h2 className="mt-3 text-h1 sm:text-[2.25rem] sm:leading-tight">
              <span className="font-normal">Everything, </span>
              <span className="font-bold">in one loop.</span>
            </h2>
            <TourVideo chapters={chapters} className="mt-12" />
          </div>
        </section>

        {/* -------------------------------------------------------- features */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8 lg:px-10">
          <h2 className="text-h1 sm:text-[2.25rem] sm:leading-tight">
            <span className="block font-normal">What&rsquo;s on</span>
            <span className="block font-bold">the board.</span>
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, tone, title, text }) => (
              <li key={title} className="rounded-card bg-paper p-6 shadow-soft">
                <span className={cn("grid size-12 place-items-center rounded-full", toneSoft[tone])}>
                  <Icon className="size-7" />
                </span>
                <h3 className="mt-4 text-body font-bold">{title}</h3>
                <p className="mt-1.5 text-label leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* -------------------------------------------------------- privacy */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8 lg:px-10">
          <div className="grid gap-8 rounded-card bg-ink p-8 text-paper sm:p-10 lg:grid-cols-3">
            <div>
              <h2 className="text-h1">
                <span className="block font-normal">Yours,</span>
                <span className="block font-bold">and only yours.</span>
              </h2>
            </div>
            <ul className="grid gap-5 text-label leading-relaxed text-paper/80 lg:col-span-2 sm:grid-cols-2">
              <li>
                <span className="block text-body font-semibold text-paper">Private by default</span>
                Every row is locked to your account in the database itself, not just hidden by the app.
              </li>
              <li>
                <span className="block text-body font-semibold text-paper">No tracking</span>
                Your campus pin is set once, by you. Location is never watched in the background.
              </li>
              <li>
                <span className="block text-body font-semibold text-paper">Anonymous sharing</span>
                Share a campus event and classmates see the event — never who posted it.
              </li>
              <li>
                <span className="block text-body font-semibold text-paper">Not a proxy</span>
                UniBoard never marks attendance anywhere official. It mirrors reality for your planning.
              </li>
            </ul>
          </div>
        </section>

        {/* -------------------------------------------------------------- cta */}
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-24 text-center md:px-8 lg:px-10">
          <Logo size={56} wordmark={false} />
          <h2 className="mt-6 text-h1 sm:text-[2.25rem] sm:leading-tight">
            <span className="font-normal">Pin your </span>
            <span className="font-bold">first week.</span>
          </h2>
          <p className="mt-3 max-w-md text-body text-ink/80">
            Import your timetable in under a minute. Start as a guest if you&rsquo;d rather not sign up yet.
          </p>
          <PillLink href="/sign-in" className="mt-8">
            Get started
          </PillLink>
        </section>
      </main>

      <footer className="border-t border-hairline/80">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-label text-muted md:px-8 lg:px-10">
          <Logo size={28} animated={false} wordmarkClassName="text-body" />
          <span>Built for students. Map data © OpenStreetMap contributors.</span>
        </div>
      </footer>
    </div>
  );
}

/** A still piece of the real board for the hero, on laptops. */
function HeroBoard({ className }: { className?: string }) {
  const cards = [
    { shape: "index", tone: "sky", tilt: -3, kicker: "Hand-in", title: "DBMS assignment 3", when: "Tomorrow, 11:59 PM" },
    { shape: "polaroid", tone: "iris", tilt: 2.5, kicker: "Event", title: "Hackathon kickoff", when: "Wed, 5:00 PM" },
    { shape: "tag", tone: "coral", tilt: 1.5, kicker: "Exam", title: "OS mid-sem", when: "Mon, 10:00 AM" },
    { shape: "sticky", tone: "sun", tilt: -2, kicker: "Errand", title: "Buy lab journal", when: "Today" },
  ] as const;

  return (
    <div className={cn("board-frame w-[27rem] rotate-1", className)} aria-hidden="true">
      <div className="felt grid grid-cols-2 gap-x-5 gap-y-7 px-6 pb-8 pt-10">
        {cards.map((c, i) => {
          const color = `var(--color-${c.tone})`;
          return (
            <div
              key={c.title}
              className={cn("card-hang relative", i % 2 === 1 && "mt-4")}
              style={{ transform: `rotate(${c.tilt}deg)`, transformOrigin: "50% 0", ["--tone" as string]: color }}
            >
              <ShapeFrame shape={c.shape}>
                {c.shape === "polaroid" && (
                  <div className="card-photo mb-2 grid place-items-center">
                    <span className="text-[1.4rem] font-bold leading-none tnum">24</span>
                    <span className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-ink/70">
                      Sep · Wed
                    </span>
                  </div>
                )}
                <p className="text-[0.6rem] font-bold uppercase tracking-wider text-ink/60">{c.kicker}</p>
                <p className="text-[0.85rem] font-bold leading-tight">{c.title}</p>
                <p className="mt-1 text-[0.7rem] text-ink/70">{c.when}</p>
              </ShapeFrame>
              <Pin
                tone={color}
                delay={0.3 + i * 0.12}
                style={c.shape === "tag" ? { left: 6, top: "calc(50% - 11px)" } : { left: "calc(50% - 11px)", top: -9 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
