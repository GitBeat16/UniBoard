/**
 * Scenes 5–7: the reveal, the promise, and the first thing it does.
 */
import { LogoMark } from "@/components/brand/logo";
import { easeInOutCubic, easeOutBack, easeOutCubic, easeOutExpo, easeSoft, interp, spring, typed } from "@/lib/launch/film";
import { CORAL, Layer, LightStage, MONO, RiseWords } from "./kit";
import { CELL_COUNT, CleanWeek, PrintedTimetable } from "./timetable-art";

/** 5 · Introducing UniBoard. */
export function IntroScene({ f }: { f: number }) {
  const ring = interp(f, 0, 34, 0.45, 1, easeOutExpo);
  const ringO = interp(f, 0, 10, 0, 0.9) * interp(f, 48, 70, 1, 0);
  const ring2 = interp(f, 8, 60, 0.6, 1.5, easeOutCubic);
  const ring2O = interp(f, 8, 20, 0, 0.35) * interp(f, 40, 60, 1, 0);

  // The mark lands big in the middle, then steps aside for the name.
  const land = spring(f, 0, { stiffness: 0.2, damping: 0.2 });
  const move = interp(f, 44, 68, 0, 1, easeInOutCubic);
  const size = 250 - 120 * move;
  const x = -400 * move;

  const wordReveal = interp(f, 52, 78, 100, 0, easeOutCubic);
  const eyebrow = interp(f, 50, 66, 0, 1, easeOutCubic);

  return (
    <LightStage>
      <Layer className="flex items-center justify-center">
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            border: `2px solid ${CORAL}`,
            transform: `scale(${ring})`,
            opacity: ringO,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            border: `1px solid ${CORAL}`,
            transform: `scale(${ring2})`,
            opacity: ring2O,
          }}
        />
      </Layer>

      <Layer className="flex items-center justify-center">
        <div style={{ transform: `translateX(${x}px) scale(${0.4 + 0.6 * land}) rotate(${(1 - land) * -14}deg)`, opacity: interp(f, 0, 6, 0, 1) }}>
          <LogoMark size={size} />
        </div>
      </Layer>

      <Layer className="flex items-center justify-center">
        <div style={{ position: "absolute", left: 960 - 400 + 100, top: 540 - 118 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "0.42em",
              color: "#5f666d",
              opacity: eyebrow,
              transform: `translateY(${(1 - eyebrow) * 10}px)`,
            }}
          >
            INTRODUCING
          </div>
          <div
            style={{
              fontSize: 140,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "#111",
              clipPath: `inset(-10% ${wordReveal}% -20% 0)`,
              transform: `translateX(${wordReveal * -0.6}px)`,
            }}
          >
            <span style={{ fontWeight: 400 }}>Uni</span>
            <span style={{ fontWeight: 700 }}>Board</span>
          </div>
          <div style={{ fontSize: 34, color: "#3d4247", marginTop: 8, height: 48 }}>
            <RiseWords text="Your whole uni day, on one board." frame={f} start={80} stagger={3} />
          </div>
        </div>
      </Layer>
    </LightStage>
  );
}

/** 6 · What it is, in one sentence, with the promise underlined. */
export function StatementScene({ f }: { f: number }) {
  const line = { fontSize: 88, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.12, color: "#111" } as const;
  const under = interp(f, 46, 62, 0, 1, easeOutCubic);
  const lastO = interp(f, 28, 36, 0, 1);
  const lastY = interp(f, 28, 42, 100, 0, easeOutCubic);
  const zoom = interp(f, 0, 105, 1, 1.035);
  return (
    <LightStage>
      <Layer className="flex flex-col items-center justify-center text-center" style={{ transform: `scale(${zoom})` }}>
        <div style={line}>
          <RiseWords text="Timetable, attendance," frame={f} start={10} />
        </div>
        <div style={line}>
          <RiseWords text="deadlines and money —" frame={f} start={19} />
        </div>
        <div style={{ ...line, overflow: "hidden", paddingBottom: 18 }}>
          <span style={{ display: "inline-block", transform: `translateY(${lastY}%)`, opacity: lastO }}>
            on{" "}
            <span style={{ position: "relative", display: "inline-block" }}>
              one board.
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: "0.3em",
                  bottom: -6,
                  height: 9,
                  borderRadius: 9,
                  background: CORAL,
                  transform: `scaleX(${under})`,
                  transformOrigin: "left",
                }}
              />
            </span>
          </span>
        </div>
      </Layer>
    </LightStage>
  );
}

/** 7 · Just snap it: a photo of the printout becomes a clean week. */
export function SnapScene({ f }: { f: number }) {
  // Title: big in the middle, then up to the top.
  const up = interp(f, 22, 40, 0, 1, easeInOutCubic);
  const titleSize = 124 - 62 * up;
  const titleY = -380 * up;

  const drop = interp(f, 30, 56, 0, 1, easeOutExpo);
  const scan = interp(f, 60, 104, 0, 1, easeSoft);
  const straighten = interp(f, 104, 124, 0, 1, easeInOutCubic);
  const photoO = interp(f, 104, 122, 1, 0);
  const cleanO = interp(f, 108, 122, 0, 1);

  const readLine = typed(`Reading ${CELL_COUNT} classes…`, f, 62, 0.8);
  const tags = ["Batch E3 found", `${CELL_COUNT} classes · 6 days`, "Timetable in ✓"];

  return (
    <LightStage>
      <Layer className="flex items-center justify-center">
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#111",
            transform: `translateY(${titleY}px)`,
          }}
        >
          <RiseWords text="Just snap it." frame={f} start={2} stagger={4} />
        </div>
      </Layer>

      <Layer className="flex items-center justify-center" style={{ perspective: 1800, top: 70 }}>
        <div
          style={{
            position: "absolute",
            opacity: drop * photoO,
            transform: `translateY(${(1 - drop) * 260}px) rotateX(${10 * (1 - straighten)}deg) rotateZ(${(-5 + (1 - drop) * -5) * (1 - straighten)}deg)`,
          }}
        >
          <div style={{ position: "relative" }}>
            <PrintedTimetable width={900} detectedRow={scan} frame={f} />
            {f >= 60 && f <= 106 && (
              <div
                style={{
                  position: "absolute",
                  left: -20,
                  right: -20,
                  top: `${scan * 100}%`,
                  height: 4,
                  background: CORAL,
                  boxShadow: `0 0 24px 8px rgba(242,132,107,0.55), 0 0 80px 30px rgba(242,132,107,0.25)`,
                  borderRadius: 4,
                }}
              />
            )}
          </div>
        </div>
        <div style={{ position: "absolute", opacity: cleanO, transform: `scale(${0.96 + 0.04 * cleanO})` }}>
          <CleanWeek width={900} frame={f - 110} />
        </div>
      </Layer>

      <Layer className="flex items-end justify-center" style={{ paddingBottom: 70 }}>
        {f < 110 ? (
          <div style={{ fontFamily: MONO, fontSize: 24, color: "#5f666d", opacity: interp(f, 60, 66, 0, 1) }}>{readLine}</div>
        ) : (
          <div style={{ display: "flex", gap: 14 }}>
            {tags.map((t, i) => {
              const p = interp(f, 124 + i * 7, 136 + i * 7, 0, 1, easeOutBack);
              return (
                <div
                  key={t}
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    padding: "10px 20px",
                    borderRadius: 999,
                    background: i === 2 ? "#111" : "#fff",
                    color: i === 2 ? "#fff" : "#111",
                    boxShadow: "0 8px 24px rgba(17,17,17,0.1)",
                    opacity: Math.min(1, p),
                    transform: `translateY(${(1 - p) * 20}px) scale(${0.9 + 0.1 * p})`,
                  }}
                >
                  {t}
                </div>
              );
            })}
          </div>
        )}
      </Layer>
    </LightStage>
  );
}
