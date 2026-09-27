/**
 * Building blocks shared by the launch film's scenes. Every value here is a
 * function of the frame — no timers, no state — so a frame renders the same
 * wherever it is drawn.
 */
import { cn } from "@/lib/cn";
import { caretOn, interp, easeOutCubic } from "@/lib/launch/film";

export const CORAL = "#f2846b";
export const CORAL_DEEP = "#e8674a";
export const INK = "#111111";

/** The mono and display families, set as CSS variables by the film page. */
export const MONO = "var(--font-film-mono), ui-monospace, monospace";
export const DISPLAY = "var(--font-film-display), var(--font-poppins), sans-serif";

/** Full-frame layer. */
export function Layer({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("absolute inset-0", className)} style={style}>
      {children}
    </div>
  );
}

/** Near-black with a slow warm glow in the middle — the night scenes. */
export function DarkStage({ frame, glow = 1, children }: { frame: number; glow?: number; children?: React.ReactNode }) {
  const breathe = 0.75 + 0.25 * Math.sin(frame / 22);
  return (
    <Layer style={{ background: "#050505" }}>
      <Layer
        style={{
          background: `radial-gradient(38% 46% at 50% 50%, rgba(242,132,107,${0.13 * glow * breathe}) 0%, rgba(120,40,20,${0.05 * glow}) 45%, transparent 75%)`,
        }}
      />
      {/* faint concentric rings, as in a lens flare */}
      <Layer
        style={{
          background: `repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,${0.012 * glow}) 0 2px, transparent 2px 90px)`,
        }}
      />
      <Layer style={{ background: "radial-gradient(75% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.7) 100%)" }} />
      {children}
    </Layer>
  );
}

/** Soft white with a faint dot grid — the product scenes. */
export function LightStage({ children, dots = true }: { children?: React.ReactNode; dots?: boolean }) {
  return (
    <Layer style={{ background: "radial-gradient(70% 70% at 50% 45%, #ffffff 0%, #f4f4f3 60%, #e9eae9 100%)" }}>
      {dots && (
        <Layer
          style={{
            backgroundImage: "radial-gradient(rgba(17,17,17,0.07) 1px, transparent 1.2px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(80% 80% at 50% 50%, black 30%, transparent 100%)",
          }}
        />
      )}
      {children}
    </Layer>
  );
}

/** The coral block caret the typewriter lines end in. */
export function Caret({ frame, typing = false, height = "1.05em" }: { frame: number; typing?: boolean; height?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "0.55em",
        height,
        marginLeft: "0.08em",
        verticalAlign: "-0.15em",
        background: CORAL,
        opacity: caretOn(frame, typing) ? 1 : 0,
      }}
    />
  );
}

/**
 * The coral flash that opens a section: a solid frame, then the panel
 * sweeps off to the left to reveal the scene underneath.
 */
export function Wipe({ frame }: { frame: number }) {
  if (frame > 14) return null;
  const x = interp(frame, 4, 14, 0, -105, easeOutCubic);
  return (
    <div
      className="absolute inset-0 z-50"
      style={{
        background: `linear-gradient(100deg, ${CORAL_DEEP}, ${CORAL})`,
        transform: `translateX(${x}%)`,
      }}
    />
  );
}

/**
 * Words rising out of a mask, one after another — the film's main way of
 * setting a line.
 */
export function RiseWords({
  text,
  frame,
  start = 0,
  stagger = 3,
  duration = 14,
  className,
  style,
  wordClass,
}: {
  text: string;
  frame: number;
  start?: number;
  stagger?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  wordClass?: (word: string, i: number) => string | undefined;
}) {
  const words = text.split(" ");
  return (
    <span className={className} style={style}>
      {words.map((w, i) => {
        const s = start + i * stagger;
        const y = interp(frame, s, s + duration, 105, 0, easeOutCubic);
        const o = interp(frame, s, s + duration * 0.6, 0, 1);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.08em" }}>
            <span
              className={wordClass?.(w, i)}
              style={{ display: "inline-block", transform: `translateY(${y}%)`, opacity: o }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** A dark mono label with a status dot — the chaos chips and the badges' cousins. */
export function Chip({
  children,
  tone = "neutral",
  style,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "alarm" | "coral";
  style?: React.CSSProperties;
}) {
  const dot = tone === "alarm" ? "#ff5a4f" : tone === "coral" ? CORAL : "#8a8f94";
  return (
    <div
      className="absolute whitespace-nowrap"
      style={{
        fontFamily: MONO,
        fontSize: 19,
        letterSpacing: "0.01em",
        color: tone === "alarm" ? "#ffb4ae" : "#c9cdd1",
        background: tone === "alarm" ? "rgba(70,12,10,0.85)" : "rgba(22,22,22,0.9)",
        border: `1px solid ${tone === "alarm" ? "rgba(255,90,79,0.45)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 6,
        padding: "7px 13px 7px 11px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        ...style,
      }}
    >
      <span
        style={{ display: "inline-block", width: 7, height: 7, borderRadius: 9, background: dot, marginRight: 10, verticalAlign: "2px" }}
      />
      {children}
    </div>
  );
}
