import { notFound } from "next/navigation";
import { AdvisorView } from "@/components/advisor/advisor-view";
import { PlacesList } from "@/components/money/places-list";
import { BoardView } from "@/components/screens/board-view";
import { HomeView } from "@/components/screens/home-view";
import { MeView } from "@/components/screens/me-view";
import { MoneyView } from "@/components/screens/money-view";
import { TimetableView } from "@/components/screens/timetable-view";
import { BlobBackground } from "@/components/ui/blob-background";
import { BottomNav } from "@/components/ui/bottom-nav";
import { SideNav } from "@/components/ui/side-nav";
import {
  sampleAdvisorPayload,
  sampleBoardWork,
  sampleBudgets,
  sampleCampus,
  sampleEvents,
  sampleExpenses,
  sampleGoals,
  sampleModules,
  sampleNextSession,
  samplePlaces,
  sampleProfile,
  sampleSessions,
  sampleStats,
} from "@/lib/sample-data";

/**
 * The same screens as /preview, at tablet and laptop widths, inside the real
 * shell. Screens lay themselves out by container width, so these frames show
 * exactly what an iPad or a laptop gets. Dev only, sample data only.
 */
export const dynamic = "force-dynamic";

const DEVICES = {
  tablet: { width: 820, height: 1180 },
  laptop: { width: 1280, height: 800 },
} as const;

function Device({
  kind,
  label,
  children,
}: {
  kind: keyof typeof DEVICES;
  label: string;
  children: React.ReactNode;
}) {
  const { width, height } = DEVICES[kind];
  return (
    <figure className="m-0 flex shrink-0 flex-col gap-3" style={{ width }}>
      <figcaption className="text-caption font-semibold uppercase text-muted">
        {label} · {kind} {width}px
      </figcaption>
      <div
        data-device={kind}
        className="relative overflow-hidden rounded-[1.5rem] border border-hairline bg-canvas shadow-soft"
        style={{ height, transform: "translateZ(0)" }}
      >
        <BlobBackground />
        {kind === "laptop" ? (
          <div className="h-full overflow-y-auto pl-60" data-scroll>
            <SideNav className="flex" />
            <div className="@container mx-auto w-full max-w-6xl px-10 pb-16 pt-12">{children}</div>
          </div>
        ) : (
          <>
            <div className="h-full overflow-y-auto" data-scroll>
              <div className="@container mx-auto w-full max-w-3xl px-8 pb-32 pt-10">{children}</div>
            </div>
            <BottomNav always />
          </>
        )}
      </div>
    </figure>
  );
}

const screens: Array<[string, React.ReactNode]> = [
  [
    "Home",
    <HomeView
      key="home"
      displayName="Srushti"
      todayIso={new Date().toISOString()}
      nextSession={sampleNextSession}
      atRisk={1}
    />,
  ],
  ["Timetable", <TimetableView key="tt" sessions={sampleSessions} modules={sampleStats} />],
  ["Advisor", <AdvisorView key="adv" payload={sampleAdvisorPayload} />],
  [
    "Board",
    <BoardView
      key="board"
      work={sampleBoardWork}
      events={sampleEvents}
      modules={sampleModules}
      university={{ name: "Pune Institute of Computer Technology", shortName: "PICT" }}
    />,
  ],
  [
    "Money",
    <MoneyView
      key="money"
      currency="INR"
      budgets={sampleBudgets}
      expenses={sampleExpenses}
      campus={sampleCampus}
      places={<PlacesList places={samplePlaces} />}
    />,
  ],
  ["Me", <MeView key="me" profile={sampleProfile} goals={sampleGoals} />],
];

export default function WidePreview() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-dvh bg-canvas px-8 py-10">
      <h1 className="text-h1 font-bold">UniBoard at tablet and laptop widths</h1>
      <div className="mt-8 flex flex-col gap-14">
        {screens.map(([label, node]) => (
          <div key={label} className="flex items-start gap-10">
            <Device kind="tablet" label={label}>
              {node}
            </Device>
            <Device kind="laptop" label={label}>
              {node}
            </Device>
          </div>
        ))}
      </div>
    </main>
  );
}
