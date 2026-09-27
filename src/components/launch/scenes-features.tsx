/**
 * Scene 8: five numbered beats, each opened by a coral flash. Words on the
 * left, the thing itself moving on the right.
 */
import { Flora } from "@/components/flora/flora";
import { ShapeFrame } from "@/components/board/card-shape";
import { Pin } from "@/components/board/pin";
import type { CardShape } from "@/lib/board/items";
import { countUp, easeOutBack, easeOutCubic, easeOutExpo, interp, spring } from "@/lib/launch/film";
import { CORAL, LightStage, MONO, RiseWords } from "./kit";

function Beat({
  f,
  n,
  title,
  sub,
  children,
}: {
  f: number;
  n: number;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  const subO = interp(f, 22, 34, 0, 1, easeOutCubic);
  const cardIn = interp(f, 8, 30, 0, 1, easeOutExpo);
  return (
    <LightStage>
      <div style={{ position: "absolute", left: 170, top: 0, bottom: 0, width: 640, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 22, color: CORAL, opacity: interp(f, 8, 16, 0, 1) }}>
          0{n} <span style={{ color: "#9aa0a6" }}>/ 05</span>
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.04, color: "#111", marginTop: 18 }}>
          <RiseWords text={title} frame={f} start={10} stagger={3} />
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#5f666d",
            marginTop: 22,
            lineHeight: 1.35,
            opacity: subO,
            transform: `translateY(${(1 - subO) * 12}px)`,
          }}
        >
          {sub}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 150,
          top: 540 - 300,
          width: 820,
          height: 600,
          opacity: cardIn,
          transform: `translateX(${(1 - cardIn) * 80}px) scale(${0.96 + 0.04 * cardIn})`,
        }}
      >
        {children}
      </div>
    </LightStage>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#fff",
        borderRadius: 32,
        boxShadow: "0 40px 90px rgba(17,17,17,0.14), 0 0 0 1px rgba(17,17,17,0.04)",
        padding: 44,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Ring({ value, tone, size = 120, children }: { value: number; tone: string; size?: number; children?: React.ReactNode }) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#ecedec" strokeWidth={12} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
    </div>
  );
}

/** 01 · Attendance rings counting up, with the number that matters. */
export function AttendanceBeat({ f }: { f: number }) {
  const rows = [
    { name: "Machine Learning", pct: 63, tone: "var(--color-coral)", say: "No room left to miss any", warn: true },
    { name: "Databases", pct: 82, tone: "var(--color-sun)", say: "You can miss 2 more" },
    { name: "Operating Systems", pct: 92, tone: "var(--color-leaf)", say: "You can miss 5 more" },
  ];
  return (
    <Beat f={f} n={1} title="Attendance that adds up." sub="Every module, and how many classes you can still miss.">
      <Card style={{ display: "flex", flexDirection: "column", gap: 26, justifyContent: "center" }}>
        {rows.map((r, i) => {
          const s = 16 + i * 8;
          const v = countUp(f, s, 34, r.pct);
          const o = interp(f, s - 4, s + 6, 0, 1);
          return (
            <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 30, opacity: o }}>
              <Ring value={v} tone={r.tone}>
                <span style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}%</span>
              </Ring>
              <div>
                <div style={{ fontSize: 34, fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 24, marginTop: 4, color: r.warn ? "#d9543a" : "#3d4247", fontWeight: r.warn ? 600 : 400 }}>
                  {r.say}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </Beat>
  );
}

/** 02 · The verdict, with its reasons. */
export function AdvisorBeat({ f }: { f: number }) {
  const dot = interp(f, 20, 44, 0.08, 0.66, easeOutCubic);
  const verdict = interp(f, 40, 50, 0, 1, easeOutBack);
  const reasons = [
    "“ML coursework 2” is due in 20 hours.",
    "Only 2 more Databases misses left.",
    "It's recorded, so it can be caught up.",
  ];
  return (
    <Beat f={f} n={2} title="Go or skip? Honestly." sub="A call that shows its working. Assessed labs always mean go.">
      <Card>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.12em", color: "#5f666d" }}>DATABASES LAB · TOMORROW 11:00</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#e0a526",
            marginTop: 14,
            opacity: Math.min(1, verdict),
            transform: `scale(${0.85 + 0.15 * verdict})`,
            transformOrigin: "left center",
          }}
        >
          Go if you can
        </div>
        <div style={{ position: "relative", height: 26, marginTop: 20, borderRadius: 13, background: "#f1f1ef", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${dot * 100}%`,
              background: "repeating-linear-gradient(135deg, #f6d27a 0 8px, #f9e3a8 8px 16px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 3,
              left: `calc(${dot * 100}% - 20px)`,
              width: 20,
              height: 20,
              borderRadius: 20,
              background: "#e0a526",
              boxShadow: "0 0 0 4px #fff",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 600, color: "#5f666d", marginTop: 8 }}>
          <span>SKIP IS FINE</span>
          <span>GO</span>
        </div>
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 14 }}>
          {reasons.map((r, i) => {
            const p = interp(f, 48 + i * 7, 60 + i * 7, 0, 1, easeOutCubic);
            return (
              <div
                key={r}
                style={{
                  fontSize: 25,
                  padding: "14px 20px",
                  borderRadius: 18,
                  background: "#f6f6f5",
                  opacity: p,
                  transform: `translateX(${(1 - p) * 30}px)`,
                }}
              >
                <span style={{ color: CORAL, fontWeight: 700, marginRight: 12 }}>→</span>
                {r}
              </div>
            );
          })}
        </div>
      </Card>
    </Beat>
  );
}

const BOARD_CARDS: Array<{ shape: CardShape; tone: string; tilt: number; kicker: string; title: string; when: string; x: number; y: number }> = [
  { shape: "index", tone: "sky", tilt: -3, kicker: "HAND-IN", title: "DBMS assignment 3", when: "Tomorrow, 11:59 PM", x: 40, y: 50 },
  { shape: "polaroid", tone: "iris", tilt: 3, kicker: "EVENT", title: "Hackathon kickoff", when: "Wed, 5:00 PM", x: 420, y: 36 },
  { shape: "tag", tone: "coral", tilt: 2, kicker: "EXAM", title: "OS mid-sem", when: "Mon, 10:00 AM", x: 60, y: 300 },
  { shape: "sticky", tone: "sun", tilt: -2.5, kicker: "ERRAND", title: "Buy lab journal", when: "Today", x: 440, y: 320 },
];

/** 03 · The soft board, cards dropping onto it and swinging on their pins. */
export function BoardBeat({ f }: { f: number }) {
  return (
    <Beat f={f} n={3} title="A soft board for everything." sub="Hand-ins, exams and campus events, pinned by what's due first.">
      <div className="board-frame" style={{ position: "absolute", inset: 0 }}>
        <div className="felt" style={{ position: "absolute", inset: 9 }}>
          {BOARD_CARDS.map((c, i) => {
            const s = 18 + i * 9;
            const d = spring(f, s, { stiffness: 0.25, damping: 0.22 });
            if (f < s) return null;
            const swing = Math.sin((f - s) / 3.2) * Math.exp(-(f - s) / 14) * 9;
            const color = `var(--color-${c.tone})`;
            return (
              <div
                key={c.title}
                className="card-hang"
                style={{
                  position: "absolute",
                  left: c.x,
                  top: c.y,
                  width: 300,
                  transform: `translateY(${(1 - d) * -420}px) rotate(${c.tilt + swing}deg)`,
                  transformOrigin: "50% 0",
                  ["--tone" as string]: color,
                  fontSize: 22,
                }}
              >
                <ShapeFrame shape={c.shape}>
                  {c.shape === "polaroid" && (
                    <div className="card-photo" style={{ marginBottom: 10, display: "grid", placeItems: "center", height: 110 }}>
                      <span style={{ fontSize: 44, fontWeight: 700, lineHeight: 1 }}>24</span>
                    </div>
                  )}
                  <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.6 }}>{c.kicker}</p>
                  <p style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15 }}>{c.title}</p>
                  <p style={{ fontSize: 18, marginTop: 6, opacity: 0.7 }}>{c.when}</p>
                </ShapeFrame>
                <Pin
                  tone={color}
                  delay={0}
                  style={c.shape === "tag" ? { left: 8, top: "calc(50% - 11px)" } : { left: "calc(50% - 11px)", top: -10 }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Beat>
  );
}

/** 04 · The budget ring and food a short walk away. */
export function MoneyBeat({ f }: { f: number }) {
  const left = countUp(f, 18, 32, 821);
  const fill = interp(f, 18, 50, 0, 55, easeOutCubic);
  const places = [
    { name: "Campus canteen", walk: "3 min walk", price: "₹60 thali" },
    { name: "Chai stall, Gate 2", walk: "5 min walk", price: "₹20 chai" },
    { name: "South Indian café", walk: "9 min walk", price: "₹90 dosa" },
  ];
  return (
    <Beat f={f} n={4} title="Money that adds up." sub="One budget becomes what today can take — and food a short walk away.">
      <Card style={{ display: "flex", gap: 40, alignItems: "center" }}>
        <Ring value={fill} tone="var(--color-leaf)" size={250}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.1em", color: "#5f666d" }}>LEFT TODAY</div>
            <div style={{ fontSize: 58, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>₹{left}</div>
          </div>
        </Ring>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {places.map((p, i) => {
            const t = interp(f, 36 + i * 7, 50 + i * 7, 0, 1, easeOutCubic);
            return (
              <div
                key={p.name}
                style={{
                  padding: "16px 20px",
                  borderRadius: 20,
                  background: "#f6f6f5",
                  opacity: t,
                  transform: `translateY(${(1 - t) * 24}px)`,
                }}
              >
                <div style={{ fontSize: 25, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 19, color: "#5f666d", marginTop: 2 }}>
                  {p.walk} · {p.price}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </Beat>
  );
}

/** 05 · Flora, and the things she says before it's too late. */
export function FloraBeat({ f }: { f: number }) {
  const lines = [
    "Databases lab tomorrow — you can't miss another.",
    "₹821 left today. Lunch is covered.",
    "ML coursework 2 is due in 20 hours.",
  ];
  return (
    <Beat f={f} n={5} title="Flora keeps watch." sub="A nudge before it's too late. Never a nag.">
      <Card style={{ background: "linear-gradient(160deg, #fff 0%, #fbf3ef 100%)" }}>
        <div
          style={{
            position: "absolute",
            left: 50,
            bottom: 50,
            transform: `scale(${1.7 * interp(f, 10, 26, 0.3, 1, easeOutBack)})`,
            opacity: interp(f, 10, 16, 0, 1),
            transformOrigin: "left bottom",
          }}
        >
          <Flora mood="cheer" size="lg" action="wave" enter="none" />
        </div>
        <div style={{ position: "absolute", right: 40, top: 50, width: 470, display: "flex", flexDirection: "column", gap: 18 }}>
          {lines.map((l, i) => {
            const s = 20 + i * 14;
            const p = interp(f, s, s + 12, 0, 1, easeOutBack);
            return (
              <div
                key={l}
                style={{
                  fontSize: 25,
                  lineHeight: 1.35,
                  padding: "18px 22px",
                  borderRadius: "24px 24px 24px 6px",
                  background: "#fff",
                  boxShadow: "0 14px 34px rgba(17,17,17,0.1)",
                  opacity: Math.min(1, p),
                  transform: `translateY(${(1 - p) * 20}px) scale(${0.9 + 0.1 * p})`,
                  transformOrigin: "left bottom",
                }}
              >
                {l}
              </div>
            );
          })}
        </div>
      </Card>
    </Beat>
  );
}
