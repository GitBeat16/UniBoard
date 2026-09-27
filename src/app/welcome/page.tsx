import type { Metadata } from "next";
import { Roboto_Flex } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ShapeFrame } from "@/components/board/card-shape";
import { Pin } from "@/components/board/pin";
import { TourGallery } from "@/components/landing/tour-gallery";
import {
  ClosingHeadline,
  Eyebrow,
  FeatureBand,
  HeroHeadline,
  MagneticLink,
  Numbers,
  Reveal,
  RotatingLine,
  StickyHeader,
} from "@/components/landing/landing-bits";
import { FloraSolo } from "@/components/flora/flora-says";
import ClickSpark from "@/components/reactbits/ClickSpark";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
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

/**
 * The headline's font. TextPressure moves weight, width and slant per letter,
 * so it needs a variable font with those axes. Self-hosted by next/font (the
 * component would otherwise fetch it from Google on every visit), and only
 * this page loads it.
 */
const pressureFont = Roboto_Flex({
  subsets: ["latin"],
  axes: ["wdth", "slnt"],
  display: "swap",
});

/** True things, counted: nothing here is a claim about anybody else. */
const NUMBERS = [
  { to: 3, label: "ways to bring your timetable in" },
  { to: 2, label: "taps to log a spend" },
  { to: 1, label: "board for everything with a date" },
  { to: 0, label: "trackers, and no ads" },
];

export default function WelcomePage() {
  return (
    // Sparks on every click — the page's one bit of pure play.
    <ClickSpark sparkColor="#f2846b" sparkSize={9} sparkRadius={18} sparkCount={8} duration={420}>
      <div className="relative min-h-dvh overflow-x-clip">
        <BlobBackground variant="calm" />

        {/* Without JavaScript the headline would stay blurred out: show it plain. */}
        <noscript>
          <style>{`.blur-text span,.reveal{opacity:1!important;filter:none!important;transform:none!important}`}</style>
        </noscript>

        {/* ---------------------------------------------------------- header */}
        <StickyHeader>
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8 lg:px-10">
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
          </div>
        </StickyHeader>

        <main>
          {/* ------------------------------------------------------------ hero */}
          <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-12 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16 lg:px-10 lg:pb-24 lg:pt-20">
            <div className="max-w-2xl">
              <Eyebrow>For students · free</Eyebrow>
              <HeroHeadline fontFamily={pressureFont.style.fontFamily} />
              <RotatingLine />
              <p className="mt-5 max-w-xl text-body text-ink/80 sm:text-[1.1rem] sm:leading-relaxed">
                UniBoard reads your timetable, keeps count of your attendance, gives you an honest
                go-or-skip call, pins everything with a date to a soft board, and turns one budget
                into what today can take.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <MagneticLink href="/sign-in">Get started — it&rsquo;s free</MagneticLink>
                <MagneticLink href="#tour" variant="soft">
                  Take the tour
                </MagneticLink>
              </div>
              <p className="mt-4 text-label text-ink/70">
                No email needed to look around — start as a guest and keep everything later.
              </p>
            </div>

            {/* The board, on every screen: it is the product in one picture. */}
            <HeroBoard className="mx-auto w-full max-w-[27rem] lg:mx-0" />
          </section>

          {/* ---------------------------------------------------- the band */}
          <FeatureBand />

          {/* ------------------------------------------------------------ tour */}
          <section id="tour" className="scroll-mt-8 py-20 lg:py-28">
            <div className="mx-auto max-w-2xl px-5 text-center md:px-8">
              <p className="text-caption font-semibold uppercase text-muted">The tour · five screens</p>
              <h2 className="mt-3 text-h1 sm:text-[2.4rem] sm:leading-tight">
                <span className="font-normal">Everything, </span>
                <span className="font-bold">on one turn.</span>
              </h2>
              <p className="mt-3 text-body text-muted">
                The real app, with sample data. Drag it round, or let it drift.
              </p>
            </div>
            <TourGallery className="mt-2 lg:mt-4" />
          </section>

          {/* --------------------------------------------------------- numbers */}
          <section className="border-y border-hairline/80 bg-paper/70 py-16 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-5xl px-5 md:px-8 lg:px-10">
              <Numbers items={NUMBERS} />
            </div>
          </section>

          {/* -------------------------------------------------------- features */}
          <section className="py-20 lg:py-28">
            <div className="mx-auto w-full max-w-6xl px-5 md:px-8 lg:px-10">
              <h2 className="text-h1 sm:text-[2.4rem] sm:leading-tight">
                <span className="block font-normal">What&rsquo;s on</span>
                <span className="block font-bold">the board.</span>
              </h2>
              <p className="mt-3 max-w-lg text-body text-muted">
                Eight things, one app. Swipe through on a phone.
              </p>
            </div>
            {/* A swipeable row on a phone — eight cards stacked would be a long
                scroll of sameness — and a grid once there is room. */}
            <ul className="mx-auto mt-10 flex w-full max-w-6xl snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-4 [scrollbar-width:none] md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:px-8 lg:grid-cols-4 lg:px-10 [&::-webkit-scrollbar]:hidden">
              {FEATURES.map(({ icon: Icon, tone, title, text }, i) => (
                <li key={title} className="w-[16.5rem] shrink-0 snap-start md:w-auto">
                  <Reveal className="h-full" delay={(i % 4) * 0.07}>
                    <SpotlightCard
                      spotlightColor="rgba(242, 132, 107, 0.16)"
                      className="h-full rounded-card border border-hairline bg-paper p-6 shadow-soft transition-shadow hover:shadow-lift"
                    >
                      <span className={cn("relative grid size-12 place-items-center rounded-full", toneSoft[tone])}>
                        <Icon className="size-7" />
                      </span>
                      <h3 className="relative mt-4 text-body font-bold">{title}</h3>
                      <p className="relative mt-1.5 text-label leading-relaxed text-muted">{text}</p>
                    </SpotlightCard>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>

          {/* -------------------------------------------------------- privacy */}
          <section className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8 lg:px-10 lg:pb-28">
            <Reveal>
              <SpotlightCard
                spotlightColor="rgba(255, 255, 255, 0.08)"
                className="grid gap-8 rounded-card bg-ink p-8 text-paper sm:p-10 lg:grid-cols-3"
              >
                <div className="relative">
                  <h2 className="text-h1">
                    <span className="block font-normal">Yours,</span>
                    <span className="block font-bold">and only yours.</span>
                  </h2>
                </div>
                <ul className="relative grid gap-5 text-label leading-relaxed text-paper/80 sm:grid-cols-2 lg:col-span-2">
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
              </SpotlightCard>
            </Reveal>
          </section>

          {/* -------------------------------------------------------------- cta */}
          <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-24 text-center md:px-8 lg:px-10">
            <FloraSolo mood="cheer" action="wave" size="lg" />
            <ClosingHeadline />
            <p className="mt-3 max-w-md text-body text-ink/80">
              Import your timetable in under a minute. Start as a guest if you&rsquo;d rather not sign up yet.
            </p>
            <div className="mt-8">
              <MagneticLink href="/sign-in">Get started</MagneticLink>
            </div>
          </section>
        </main>

        <footer className="border-t border-hairline/80">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-label text-muted md:px-8 lg:px-10">
            <Logo size={28} animated={false} wordmarkClassName="text-body" />
            <span>Built for students. Map data © OpenStreetMap contributors. Animations from React Bits.</span>
          </div>
        </footer>
      </div>
    </ClickSpark>
  );
}

/** A still piece of the real board for the hero — fluid, so it fits a phone. */
function HeroBoard({ className }: { className?: string }) {
  const cards = [
    { shape: "index", tone: "sky", tilt: -3, kicker: "Hand-in", title: "DBMS assignment 3", when: "Tomorrow, 11:59 PM" },
    { shape: "polaroid", tone: "iris", tilt: 2.5, kicker: "Event", title: "Hackathon kickoff", when: "Wed, 5:00 PM" },
    { shape: "tag", tone: "coral", tilt: 1.5, kicker: "Exam", title: "OS mid-sem", when: "Mon, 10:00 AM" },
    { shape: "sticky", tone: "sun", tilt: -2, kicker: "Errand", title: "Buy lab journal", when: "Today" },
  ] as const;

  return (
    <div className={cn("board-frame rotate-1", className)} aria-hidden="true">
      <div className="felt grid grid-cols-2 gap-x-3 gap-y-6 px-4 pb-7 pt-9 sm:gap-x-5 sm:gap-y-7 sm:px-6 sm:pb-8 sm:pt-10">
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
