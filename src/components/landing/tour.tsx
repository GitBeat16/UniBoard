"use client";

import { AdvisorView } from "@/components/advisor/advisor-view";
import { PlacesList } from "@/components/money/places-list";
import { BoardView } from "@/components/screens/board-view";
import { MoneyView } from "@/components/screens/money-view";
import { TimetableView } from "@/components/screens/timetable-view";
import { AttendanceSummary } from "@/components/timetable/attendance-summary";
import { BlobBackground } from "@/components/ui/blob-background";
import { BottomNav } from "@/components/ui/bottom-nav";
import { SectionHeading } from "@/components/ui/section-heading";
import { TOUR_STAGE, type TourSceneId } from "@/lib/tour";
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

const SCENES: Record<
  TourSceneId,
  { tab: string; scroll: number; node: React.ReactNode }
> = {
  import: {
    tab: "/timetable",
    scroll: 0,
    node: <TimetableView sessions={[]} modules={[]} />,
  },
  attendance: {
    tab: "/timetable",
    scroll: 0,
    node: (
      <div className="flex flex-col gap-8">
        <SectionHeading light="Your week," bold="at a glance" />
        <AttendanceSummary modules={sampleStats} today="2026-09-24" />
      </div>
    ),
  },
  advisor: {
    tab: "/timetable",
    scroll: 0,
    node: <AdvisorView payload={sampleAdvisorPayload} />,
  },
  board: {
    tab: "/board",
    scroll: 262,
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
    scroll: 0,
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

/**
 * One screen of the tour, still, framed to a phone: the real component with
 * sample data, scrolled to the part worth showing. tools/capture-tour.mjs
 * photographs each one for the landing page's gallery.
 */
export function TourStill({ scene }: { scene: TourSceneId }) {
  const shot = SCENES[scene];
  return (
    <div
      data-tour-still={scene}
      className="relative overflow-hidden bg-canvas"
      style={{ width: TOUR_STAGE.width, height: TOUR_STAGE.height, transform: "translateZ(0)" }}
    >
      <BlobBackground />
      <div
        className="@container absolute inset-x-0 top-0 px-5 pt-8"
        style={{ transform: `translateY(${-shot.scroll}px)` }}
      >
        {shot.node}
      </div>
      <BottomNav always activeHref={shot.tab} />
    </div>
  );
}

