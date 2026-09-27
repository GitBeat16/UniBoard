"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AdvisorView } from "@/components/advisor/advisor-view";
import { Logo } from "@/components/brand/logo";
import { PlacesList } from "@/components/money/places-list";
import { BoardView } from "@/components/screens/board-view";
import { MoneyView } from "@/components/screens/money-view";
import { TimetableView } from "@/components/screens/timetable-view";
import { AttendanceSummary } from "@/components/timetable/attendance-summary";
import { BlobBackground } from "@/components/ui/blob-background";
import { BottomNav } from "@/components/ui/bottom-nav";
import { SectionHeading } from "@/components/ui/section-heading";
import { EASE_SOFT } from "@/lib/motion";
import { TOUR_SCENES, TOUR_SECONDS, tourScriptChapters } from "@/lib/tour";
import {
  sampleAdvisorPayload,
  sampleBoardWork,
  sampleBudgets,
  sampleCampus,
  sampleEvents,
  sampleExpenses,
  sampleModules,
  samplePlaces,
  sampleStats,
} from "@/lib/sample-data";

/** The phone the recording is framed to. */
const STAGE = { width: 390, height: 844 };
/** Recorded at 2× so the video is crisp on a laptop. */
const SCALE = 2;

const SCENES: Record<
  (typeof TOUR_SCENES)[number]["id"],
  { tab: string; scroll: number; node: React.ReactNode }
> = {
  import: {
    tab: "/timetable",
    scroll: 0,
    node: <TimetableView sessions={[]} modules={[]} />,
  },
  attendance: {
    tab: "/timetable",
    scroll: 120,
    node: (
      <div className="flex flex-col gap-8">
        <SectionHeading light="Your week," bold="at a glance" />
        <AttendanceSummary modules={sampleStats} today="2026-09-24" />
      </div>
    ),
  },
  advisor: {
    tab: "/timetable",
    scroll: 260,
    node: <AdvisorView payload={sampleAdvisorPayload} />,
  },
  board: {
    tab: "/board",
    scroll: 320,
    node: (
      <BoardView
        work={sampleBoardWork}
        events={sampleEvents}
        modules={sampleModules}
        university={{ name: "Pune Institute of Computer Technology", shortName: "PICT" }}
      />
    ),
  },
  money: {
    tab: "/money",
    scroll: 300,
    node: (
      <MoneyView
        currency="INR"
        budgets={sampleBudgets}
        expenses={sampleExpenses}
        campus={sampleCampus}
        places={<PlacesList places={samplePlaces} />}
      />
    ),
  },
};

export function Tour() {
  const [index, setIndex] = useState(0);
  const scene = TOUR_SCENES[index];
  const shot = SCENES[scene.id];

  // Driven by the clock, not by a chain of timeouts: a timeout fires late
  // whenever a scene is expensive to render, and the drift accumulates until
  // the landing page's chapter marks no longer match the recording.
  useEffect(() => {
    const chapters = tourScriptChapters();
    const started = performance.now();
    let frame = 0;
    const tick = () => {
      const elapsed = ((performance.now() - started) / 1000) % TOUR_SECONDS;
      let next = 0;
      chapters.forEach((c, i) => {
        if (elapsed >= c.at) next = i;
      });
      setIndex((cur) => (cur === next ? cur : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="relative overflow-hidden bg-canvas"
      style={{ width: STAGE.width * SCALE, height: STAGE.height * SCALE }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${SCALE})` }}
      >
        <div className="relative h-full overflow-hidden bg-canvas" style={{ transform: "translateZ(0)" }}>
          <BlobBackground />

          {/* The screen, remounted per scene so its entrance plays, and
              drifting upward as if a thumb were scrolling it. */}
          <AnimatePresence initial={false}>
            <motion.div
              key={scene.id}
              className="@container absolute inset-x-0 top-0 px-5 pt-[6.5rem]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: [24, 0, 0, -shot.scroll] }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              transition={{
                // The screen arrives quickly, then drifts for the whole scene.
                opacity: { duration: 0.35, ease: EASE_SOFT },
                y: { duration: scene.seconds, times: [0, 0.12, 0.45, 1], ease: EASE_SOFT },
              }}
            >
              {shot.node}
            </motion.div>
          </AnimatePresence>

          {/* Caption: a solid bar the screen scrolls under, with the mark. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[6.5rem] items-start gap-3 border-b border-hairline/70 bg-paper px-5 pt-3.5 shadow-soft">
            <AnimatePresence initial={false}>
              <motion.div
                key={scene.id}
                className="absolute inset-x-5 top-3.5 min-w-0 flex-1 pr-10"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, ease: EASE_SOFT }}
              >
                <p className="text-h2 font-bold leading-tight">{scene.title}</p>
                <p className="mt-1 text-label leading-snug text-ink/80">{scene.text}</p>
              </motion.div>
            </AnimatePresence>
            {/* ml-auto: the title is positioned absolutely, so the mark is the bar's
                only flow item — without this it sat on the left, over the title. */}
            <Logo size={24} animated={false} wordmark={false} className="ml-auto mt-1 shrink-0" />
          </div>

          <BottomNav always activeHref={shot.tab} />

        </div>
      </div>
    </div>
  );
}
