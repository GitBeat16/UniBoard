import { notFound } from "next/navigation";
import { BlobBackground } from "@/components/ui/blob-background";
import { BottomNav } from "@/components/ui/bottom-nav";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";
import { HomeView } from "@/components/screens/home-view";
import { TimetableView } from "@/components/screens/timetable-view";
import { AdvisorView } from "@/components/advisor/advisor-view";
import { Flora, type FloraMood } from "@/components/flora/flora";
import { BoardView } from "@/components/screens/board-view";
import { MeView } from "@/components/screens/me-view";
import {
  sampleAdvisorPayload,
  sampleGoals,
  sampleModules,
  sampleNextSession,
  sampleProfile,
  sampleWork,
  sampleSessions,
  sampleStats,
} from "@/lib/sample-data";

/**
 * Design gallery. Renders the real screen components side by side with
 * hardcoded sample props so the visual system can be reviewed without waiting
 * on a magic-link email.
 *
 * It touches no database and reads no session — there is nothing here that a
 * signed-out visitor could learn. It is also 404'd outside development.
 */
// Not static: the fixtures are relative to "now", so the gallery should
// re-render rather than bake a week in at build time.
export const dynamic = "force-dynamic";

function Phone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="m-0 flex w-[375px] shrink-0 flex-col gap-3">
      <figcaption className="text-caption font-semibold uppercase text-muted">
        {label}
      </figcaption>
      {/* translateZ(0) makes this element the containing block for the
          position:fixed blobs and bottom nav, so each frame keeps its own. */}
      <div
        className="relative h-[812px] overflow-hidden rounded-[2.5rem] border border-hairline bg-canvas shadow-soft"
        style={{ transform: "translateZ(0)" }}
      >
        <BlobBackground />
        <div className="h-full overflow-y-auto px-5 pb-32 pt-10">{children}</div>
        <BottomNav />
      </div>
    </figure>
  );
}

export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-dvh bg-canvas px-8 py-10">
      <header className="mb-8">
        <p className="text-caption font-semibold uppercase text-coral">
          Design preview · no live data
        </p>
        <h1 className="mt-2 text-h1 font-bold">UniBoard screens — P0</h1>
        <p className="mt-2 max-w-2xl text-body text-muted">
          The real components with sample props. Everything here is built except
          Money, which stays an honest placeholder until P6.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-caption font-semibold uppercase text-muted">
          Flora — every mood
        </h2>
        <div className="mt-4 flex flex-wrap gap-6">
          {(
            ["happy", "cheer", "neutral", "thinking", "worried", "sleepy"] as FloraMood[]
          ).map((mood) => (
            <figure key={mood} className="m-0 flex flex-col items-center gap-2">
              <div className="grid size-36 place-items-center rounded-card bg-paper shadow-soft">
                <Flora mood={mood} size="md" />
              </div>
              <figcaption className="text-caption font-semibold uppercase text-muted">
                {mood}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <div className="flex gap-8 overflow-x-auto pb-6">
        <Phone label="Home — new account">
          <HomeView displayName="Srushti" todayIso={new Date().toISOString()} nextSession={null} />
        </Phone>

        <Phone label="Home — timetable imported">
          <HomeView
            displayName="Srushti"
            todayIso={new Date().toISOString()}
            nextSession={sampleNextSession}
            atRisk={1}
          />
        </Phone>

        <Phone label="Timetable — import">
          <TimetableView sessions={[]} modules={[]} />
        </Phone>

        <Phone label="Timetable — the week">
          <TimetableView sessions={sampleSessions} modules={sampleStats} />
        </Phone>

        <Phone label="Skip Advisor — the call">
          <AdvisorView payload={sampleAdvisorPayload} />
        </Phone>

        <Phone label="Skip Advisor — guardrail">
          <AdvisorView
            payload={{
              ...sampleAdvisorPayload,
              session: { ...sampleAdvisorPayload.session, hasSubmission: true },
            }}
          />
        </Phone>

        <Phone label="Board — work">
          <BoardView items={sampleWork} modules={sampleModules} />
        </Phone>

        <Phone label="Money — P6">
          <PhasePlaceholder
            light="Food and"
            bold="budget"
            phase="Coming in P6"
            what="Places ranked by walk-time from your next class, filtered to what is left in today's budget. Plus quick spend logging."
          />
        </Phone>

        <Phone label="Me — profile and goals">
          <MeView profile={sampleProfile} goals={sampleGoals} />
        </Phone>
      </div>
    </main>
  );
}
