"use client";

/**
 * The launch film: one 1920×1080 frame, drawn from the frame number alone.
 * Each scene is keyed, so the app components inside it (Flora, pins, the
 * logo) mount fresh when their scene starts and play their own entrances.
 */
import { sceneAt, type SceneId, HEIGHT, WIDTH } from "@/lib/launch/film";
import { Wipe } from "./kit";
import { ChaosScene, NightScene, NothingScene, WhatIfScene } from "./scenes-night";
import { IntroScene, SnapScene, StatementScene } from "./scenes-intro";
import { AdvisorBeat, AttendanceBeat, BoardBeat, FloraBeat, MoneyBeat } from "./scenes-features";
import { EndScene, ScaleScene, TrustScene } from "./scenes-close";

const RENDER: Record<SceneId, (p: { f: number }) => React.ReactNode> = {
  night: NightScene,
  nothing: NothingScene,
  chaos: ChaosScene,
  whatif: WhatIfScene,
  intro: IntroScene,
  statement: StatementScene,
  snap: SnapScene,
  f1: AttendanceBeat,
  f2: AdvisorBeat,
  f3: BoardBeat,
  f4: MoneyBeat,
  f5: FloraBeat,
  scale: ScaleScene,
  trust: TrustScene,
  end: EndScene,
};

export function Film({ frame }: { frame: number }) {
  const s = sceneAt(frame);
  const Scene = RENDER[s.id];
  return (
    <div
      data-film
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        overflow: "hidden",
        fontFamily: "var(--font-poppins), sans-serif",
        color: "#111",
      }}
    >
      <style>{`.film-coral{color:#f2846b}`}</style>
      <Scene key={s.id} f={s.local} />
      {s.wipe && <Wipe frame={s.local} />}
    </div>
  );
}
