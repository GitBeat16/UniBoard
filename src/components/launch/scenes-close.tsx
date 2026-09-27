/**
 * Scenes 9–11: the scale of it, what it's built on, and the sign-off.
 */
import { Logo } from "@/components/brand/logo";
import { Flora } from "@/components/flora/flora";
import {
  IconAttendance,
  IconBoard,
  IconCheck,
  IconFood,
  IconMe,
  IconSparkle,
  IconTimetable,
  IconUsers,
  IconMoney,
} from "@/components/ui/icons";
import { easeInOutCubic, easeOutBack, easeOutExpo, interp, rand } from "@/lib/launch/film";
import { tourStill, TOUR_SCENES } from "@/lib/tour";
import { CORAL, DarkStage, Layer, LightStage, RiseWords } from "./kit";

const STILLS = TOUR_SCENES.map((s) => tourStill(s.id));

/** 9 · A wall of screens pulling back, then the same screens floating in the dark. */
export function ScaleScene({ f }: { f: number }) {
  const zoom = interp(f, 0, 52, 3.1, 0.92, easeInOutCubic);
  const flash = interp(f, 52, 58, 0, 1) * interp(f, 58, 66, 1, 0);
  const dark = f >= 58;

  if (!dark) {
    const cols = 16;
    const rows = 7;
    return (
      <LightStage dots={false}>
        <Layer style={{ transform: `scale(${zoom})`, transformOrigin: "50% 50%" }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 118px)`,
              gap: 14,
            }}
          >
            {Array.from({ length: cols * rows }, (_, i) => {
              const img = STILLS[(i * 7 + Math.floor(i / cols)) % STILLS.length];
              return (
                /* eslint-disable-next-line @next/next/no-img-element -- a film frame, not a page */
                <img
                  key={i}
                  src={img}
                  alt=""
                  width={118}
                  height={212}
                  style={{ width: 118, height: 212, objectFit: "cover", borderRadius: 12, boxShadow: "0 6px 16px rgba(0,0,0,0.12)" }}
                />
              );
            })}
          </div>
        </Layer>
        <Layer className="flex items-end" style={{ padding: "0 0 110px 150px" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#111",
              background: "rgba(255,255,255,0.92)",
              padding: "10px 30px 16px",
              borderRadius: 24,
              opacity: interp(f, 14, 24, 0, 1),
            }}
          >
            <RiseWords text="Every class. Every deadline." frame={f} start={14} stagger={3} />
          </div>
        </Layer>
        <Layer style={{ background: "radial-gradient(circle at 50% 50%, #fff 20%, rgba(255,255,255,0.8) 60%)", opacity: flash }} />
      </LightStage>
    );
  }

  const g = f - 58;
  return (
    <DarkStage frame={f} glow={0.6}>
      <Layer style={{ perspective: 1400 }}>
        {Array.from({ length: 22 }, (_, i) => {
          const x = rand(i + 1) * 1920 - 160;
          const y = rand(i + 50) * 1080 - 200;
          const z = -900 + rand(i + 90) * 900 + g * 9;
          const rot = (rand(i + 7) - 0.5) * 40;
          return (
            /* eslint-disable-next-line @next/next/no-img-element -- a film frame, not a page */
            <img
              key={i}
              src={STILLS[i % STILLS.length]}
              alt=""
              width={230}
              height={413}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 230,
                height: 413,
                objectFit: "cover",
                borderRadius: 18,
                opacity: 0.55 + 0.35 * rand(i + 30),
                transform: `translateZ(${z}px) rotateY(${rot}deg) rotateX(${rot * 0.5}deg)`,
                boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
              }}
            />
          );
        })}
      </Layer>
      <Layer style={{ background: "radial-gradient(50% 45% at 50% 50%, rgba(0,0,0,0.75), transparent 80%)" }} />
      <Layer className="flex items-center justify-center">
        <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: "-0.03em", color: "#f5f5f5", textShadow: "0 10px 40px rgba(0,0,0,0.8)" }}>
          <RiseWords
            text="Planned, not panicked."
            frame={g}
            start={4}
            stagger={5}
            wordClass={(_, i) => (i > 0 ? "film-coral" : undefined)}
          />
        </div>
      </Layer>
      <Layer style={{ background: "#fff", opacity: flash }} />
    </DarkStage>
  );
}

const BADGES: Array<{ icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactNode; title: string; sub: string }> = [
  { icon: IconSparkle, title: "Free", sub: "No card, no trial" },
  { icon: IconCheck, title: "No ads", sub: "Nothing sold, ever" },
  { icon: IconMe, title: "Guest mode", sub: "Look around, no email" },
  { icon: IconUsers, title: "Google sign-in", sub: "One tap to keep it" },
  { icon: IconAttendance, title: "Private by default", sub: "Locked to your account" },
  { icon: IconBoard, title: "Anonymous sharing", sub: "Campus events, no names" },
  { icon: IconTimetable, title: "Calendar feed", sub: "Classes in any calendar" },
  { icon: IconFood, title: "Food nearby", sub: "OpenStreetMap, by walk" },
  { icon: IconMoney, title: "Any currency", sub: "Rupees by default" },
];

/** 10 · Built for students: what's true about it, one badge at a time. */
export function TrustScene({ f }: { f: number }) {
  const up = interp(f, 16, 34, 0, 1, easeInOutCubic);
  return (
    <DarkStage frame={f} glow={0.9}>
      <Layer className="flex items-center justify-center">
        <div
          style={{
            fontSize: 96 - 30 * up,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#f5f5f5",
            transform: `translateY(${-330 * up}px)`,
          }}
        >
          <RiseWords text="Built for students." frame={f} start={0} stagger={3} />
        </div>
      </Layer>
      <div
        style={{
          position: "absolute",
          left: 960 - 3 * 190 - 20,
          top: 330,
          display: "grid",
          gridTemplateColumns: "repeat(3, 380px)",
          gap: 20,
        }}
      >
        {BADGES.map((b, i) => {
          const s = 34 + i * 9;
          const p = interp(f, s, s + 12, 0, 1, easeOutBack);
          const newest = f >= s && f < s + 14;
          const Icon = b.icon;
          return (
            <div
              key={b.title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "20px 22px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.035)",
                border: `1.5px solid ${newest ? CORAL : "rgba(255,255,255,0.09)"}`,
                boxShadow: newest ? "0 0 30px rgba(242,132,107,0.3)" : "none",
                opacity: Math.min(1, p),
                transform: `translateY(${(1 - Math.min(1, p)) * 16}px) scale(${0.92 + 0.08 * p})`,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "rgba(242,132,107,0.14)",
                  color: CORAL,
                  flexShrink: 0,
                }}
              >
                <Icon width={28} height={28} />
              </span>
              <span>
                <span style={{ display: "block", fontSize: 26, fontWeight: 600, color: "#f2f2f2" }}>{b.title}</span>
                <span style={{ display: "block", fontSize: 18, color: "#8d9398", marginTop: 2 }}>{b.sub}</span>
              </span>
            </div>
          );
        })}
      </div>
    </DarkStage>
  );
}

/** 11 · Flora waves; the name, the line and where to find it. */
export function EndScene({ f }: { f: number }) {
  const url = interp(f, 40, 54, 0, 1, easeOutExpo);
  const floraIn = interp(f, 0, 16, 0, 1, easeOutBack);
  const logoIn = interp(f, 8, 22, 0, 1, easeOutExpo);
  return (
    <LightStage>
      <Layer className="flex flex-col items-center justify-center">
        <div style={{ transform: `scale(${1.5 * floraIn}) translateY(${(1 - floraIn) * 40}px)`, marginBottom: 46, opacity: Math.min(1, floraIn) }}>
          <Flora mood="cheer" size="lg" action="wave" enter="none" />
        </div>
        <div style={{ transform: `scale(${2.4 * (0.8 + 0.2 * logoIn)})`, marginTop: 20, opacity: logoIn }}>
          <Logo size={44} animated={false} />
        </div>
        <div style={{ fontSize: 40, color: "#3d4247", marginTop: 64 }}>
          <RiseWords text="Your whole uni day, on one board." frame={f} start={24} stagger={3} />
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 14,
            alignItems: "center",
            opacity: url,
            transform: `translateY(${(1 - url) * 16}px)`,
          }}
        >
          <span style={{ fontSize: 26, fontWeight: 600, padding: "14px 30px", borderRadius: 999, background: "#111", color: "#fff" }}>
            uni-board-flax.vercel.app
          </span>
          <span style={{ fontSize: 24, fontWeight: 600, color: CORAL }}>Free for students</span>
        </div>
      </Layer>
      <Layer style={{ background: "#fff", opacity: interp(f, 100, 112, 0, 1) }} />
    </LightStage>
  );
}

