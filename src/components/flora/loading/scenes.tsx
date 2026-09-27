"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Flora, type FloraMood } from "@/components/flora/flora";
import { EASE_SOFT } from "@/lib/motion";
import type { Activity } from "@/lib/flora/loading";

/**
 * Flora's loading tricks.
 *
 * Every scene is the real Flora — the same drawing, moods and breathing as
 * everywhere else — with a few props drawn around her on a 256×176 stage.
 * Each scene runs on a steady beat: `useBeat` ticks, and everything keyed on
 * the tick replays, so a trick loops cleanly without hand-tuned keyframe
 * timings drifting out of step with each other.
 *
 * Props use the app's own palette and the same 2px ink stroke, so the scene
 * reads as part of UniBoard rather than a sticker pasted on top.
 */

const W = 256;
const H = 176;
const INK = "var(--color-ink)";

/** Ticks every `ms`, so keyed children replay their animation each beat. */
function useBeat(ms: number) {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBeat((b) => b + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return beat;
}

/** Flora standing on the stage floor, `left` px from the stage's left edge. */
function Her({
  left,
  mood,
  action = "idle",
}: {
  left: number;
  mood: FloraMood;
  action?: "idle" | "wave" | "point";
}) {
  return (
    <div className="absolute bottom-1" style={{ left }}>
      <Flora mood={mood} size="md" action={action} enter="none" />
    </div>
  );
}

function Stage({ children, props }: { children: React.ReactNode; props?: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-44 w-64" aria-hidden="true">
      {children}
      {props && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
          fill="none"
        >
          {props}
        </svg>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ watering

function Watering() {
  const beat = useBeat(2800);
  return (
    <Stage
      props={
        <>
          {/* A sprout on her head that grows a notch every pour. */}
          <motion.path
            key={`leaf-${beat}`}
            d="M128 80 C 126 72, 128 66, 134 62 C 136 70, 133 76, 128 80 Z"
            fill="var(--color-leaf)"
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
            style={{ transformBox: "fill-box", transformOrigin: "bottom left" }}
            initial={{ scale: 0.7 }}
            animate={{ scale: [0.7, 0.7, 1.08, 1] }}
            transition={{ duration: 2.2, times: [0, 0.55, 0.85, 1], ease: EASE_SOFT }}
          />
          {/* The can tips, pours, and rights itself — held just above her head,
              so the drops have somewhere to land. */}
          <g transform="translate(-16 14)">
          <motion.g
            style={{ transformBox: "fill-box", transformOrigin: "85% 40%" }}
            animate={{ rotate: [0, -28, -28, 0] }}
            transition={{ duration: 2.8, times: [0, 0.25, 0.7, 1], repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M172 30 h34 a4 4 0 0 1 4 4 v22 a6 6 0 0 1 -6 6 h-26 a6 6 0 0 1 -6 -6 z"
              fill="var(--color-sky)"
              stroke={INK}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <path d="M172 38 L150 26" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
            <path d="M146 22 l8 -2 l-1 8 z" fill={INK} />
            <path d="M210 36 c 10 0, 10 20, 0 20" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          </motion.g>
          </g>
          {/* Three drops, staggered, onto the sprout. */}
          {[0, 1, 2].map((i) => (
            <motion.ellipse
              key={`drop-${beat}-${i}`}
              cx={131 - i * 2}
              rx={2.2}
              ry={3.2}
              fill="var(--color-sky)"
              initial={{ cy: 50, opacity: 0 }}
              animate={{ cy: [50, 74], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.6, delay: 0.75 + i * 0.28, ease: "easeIn" }}
            />
          ))}
        </>
      }
    >
      <Her left={80} mood="happy" />
    </Stage>
  );
}

// ------------------------------------------------------------------ pinning

const NOTES = [
  { x: 138, y: 50, fill: "var(--color-sun)", tilt: -5 },
  { x: 186, y: 56, fill: "var(--color-sky)", tilt: 6 },
  { x: 158, y: 96, fill: "var(--color-leaf)", tilt: -3 },
];

function Pinning() {
  const beat = useBeat(4200);
  return (
    <Stage
      props={
        <>
          {/* A little maroon soft board, the same felt as the Board screen. */}
          <rect x={126} y={38} width={118} height={104} rx={8} fill="var(--color-felt-deep)" />
          <rect x={131} y={43} width={108} height={94} rx={5} fill="var(--color-felt)" />
          {NOTES.map((n, i) => (
            <motion.g
              key={`note-${beat}-${i}`}
              initial={{ y: -40, opacity: 0, rotate: n.tilt * 3 }}
              animate={{ y: [-40, 0, 0, 0], opacity: [0, 1, 1, 0], rotate: [n.tilt * 3, n.tilt, n.tilt, n.tilt] }}
              transition={{ duration: 3.8, delay: i * 0.45, times: [0, 0.12, 0.85, 1], ease: EASE_SOFT }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            >
              <rect x={n.x} y={n.y} width={40} height={34} rx={2} fill={n.fill} />
              <path d={`M${n.x + 7} ${n.y + 14} h24 M${n.x + 7} ${n.y + 21} h16`} stroke={INK} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
              <circle cx={n.x + 20} cy={n.y + 3} r={4} fill="var(--color-coral)" stroke={INK} strokeWidth={1.6} />
            </motion.g>
          ))}
        </>
      }
    >
      <Her left={20} mood="happy" action="point" />
    </Stage>
  );
}

// ------------------------------------------------------------------ counting

/** Each beat is a fresh run: keying on the beat resets the count to zero. */
function Counting() {
  return <CountingRun key={useBeat(3600)} />;
}

function CountingRun() {
  const [n, setN] = useState(0);

  // The number climbs with the ring, then holds on the result for a moment.
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v >= 100 ? 100 : v + 4)), 100);
    return () => clearInterval(t);
  }, []);

  const done = n >= 100;
  const circumference = 2 * Math.PI * 38;

  return (
    <Stage
      props={
        <g>
          <circle cx={186} cy={86} r={38} stroke="var(--color-hairline)" strokeWidth={10} />
          <circle
            cx={186}
            cy={86}
            r={38}
            stroke="var(--color-leaf)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - n / 100)}
            transform="rotate(-90 186 86)"
          />
          <text
            x={186}
            y={93}
            textAnchor="middle"
            fontSize={20}
            fontWeight={700}
            fill={INK}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {n}%
          </text>
        </g>
      }
    >
      <Her left={16} mood={done ? "cheer" : "thinking"} />
    </Stage>
  );
}

// ------------------------------------------------------------------ juggling

/** Points round a small ellipse above her head. */
function orbit(phase: number) {
  const steps = 8;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((i / steps) * 2 + phase) * Math.PI;
    xs.push(128 + Math.cos(a) * 40);
    ys.push(44 - Math.abs(Math.sin(a)) * 30);
  }
  return { xs, ys };
}

const PIN_COLOURS = ["var(--color-coral)", "var(--color-sky)", "var(--color-sun)"];

function Juggling() {
  const beat = useBeat(1500);
  // One throw in five, the last pin gets away from her.
  const fumble = beat % 5 === 4;

  return (
    <Stage
      props={
        <>
          {PIN_COLOURS.map((colour, i) => {
            const { xs, ys } = orbit((i * 2) / 3);
            if (fumble && i === 2) {
              return (
                <motion.circle
                  key={`drop-${beat}`}
                  r={7}
                  fill={colour}
                  stroke={INK}
                  strokeWidth={2}
                  initial={{ cx: xs[0], cy: ys[0] }}
                  animate={{ cx: [xs[0], 206, 214], cy: [ys[0], 160, 150, 164] }}
                  transition={{ duration: 1.1, ease: "easeIn" }}
                />
              );
            }
            return (
              <motion.circle
                key={i}
                r={7}
                fill={colour}
                stroke={INK}
                strokeWidth={2}
                initial={false}
                animate={{ cx: xs, cy: ys }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            );
          })}
        </>
      }
    >
      <Her left={80} mood={fumble ? "worried" : "cheer"} action="wave" />
    </Stage>
  );
}

// ------------------------------------------------------------------ reading

function Reading() {
  return <ReadingRun key={useBeat(4000)} />;
}

function ReadingRun() {
  const [flipped, setFlipped] = useState(false);

  // Upside down first — then the penny drops.
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 1700);
    return () => clearTimeout(t);
  }, []);

  return (
    <Stage
      props={
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          animate={{ rotate: flipped ? 0 : 180 }}
          transition={{ duration: 0.6, ease: EASE_SOFT }}
        >
          <rect x={146} y={70} width={78} height={56} rx={5} fill="var(--color-paper)" stroke={INK} strokeWidth={2} />
          <rect x={146} y={70} width={78} height={12} rx={5} fill="var(--color-sky)" stroke={INK} strokeWidth={2} />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={152 + c * 17}
                y={88 + r * 12}
                width={13}
                height={8}
                rx={2}
                fill={(r + c) % 3 === 0 ? "var(--color-coral-soft)" : "var(--color-hairline)"}
              />
            )),
          )}
        </motion.g>
      }
    >
      <Her left={48} mood={flipped ? "happy" : "thinking"} action="point" />
    </Stage>
  );
}

// ------------------------------------------------------------------ sleeping

function Sleeping() {
  const beat = useBeat(3000);
  return (
    <Stage
      props={
        <>
          {[0, 1, 2].map((i) => (
            <motion.text
              key={`z-${beat}-${i}`}
              fontSize={12 + i * 4}
              fontWeight={700}
              fill={INK}
              initial={{ x: 162, y: 76, opacity: 0 }}
              animate={{ x: 162 + 16 + i * 12, y: 76 - 30 - i * 18, opacity: [0, 0.8, 0] }}
              transition={{ duration: 2.2, delay: i * 0.6, ease: "easeOut" }}
            >
              z
            </motion.text>
          ))}
        </>
      }
    >
      <Her left={80} mood="sleepy" />
    </Stage>
  );
}

// ------------------------------------------------------------------ coins

const STACK = 5;

function Coins() {
  return <CoinsRun key={useBeat(4200)} />;
}

function CoinsRun() {
  const [landed, setLanded] = useState(0);

  useEffect(() => {
    const timers = Array.from({ length: STACK }, (_, i) =>
      setTimeout(() => setLanded(i + 1), 450 + i * 450),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Stage
      props={
        <>
          {Array.from({ length: STACK }, (_, i) => (
            <motion.g
              key={i}
              initial={{ y: -150, opacity: 0 }}
              animate={{ y: [-150, 0, 0, 0], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3.9, delay: i * 0.45, times: [0, 0.1, 0.88, 1], ease: "easeIn" }}
            >
              <ellipse cx={188} cy={160 - i * 9} rx={22} ry={7} fill="var(--color-sun)" stroke={INK} strokeWidth={2} />
              <path d={`M178 ${160 - i * 9} h20`} stroke={INK} strokeOpacity={0.3} strokeWidth={1.6} strokeLinecap="round" />
            </motion.g>
          ))}
        </>
      }
    >
      <Her left={24} mood={landed >= STACK ? "cheer" : "thinking"} />
    </Stage>
  );
}

// ------------------------------------------------------------------ still

/** Under reduced motion: just her, in the trick's mood, and no props moving. */
export function StillScene({ mood }: { mood: FloraMood }) {
  return (
    <Stage>
      <Her left={80} mood={mood} />
    </Stage>
  );
}

export function Scene({ activity }: { activity: Activity }) {
  switch (activity) {
    case "watering":
      return <Watering />;
    case "pinning":
      return <Pinning />;
    case "counting":
      return <Counting />;
    case "juggling":
      return <Juggling />;
    case "reading":
      return <Reading />;
    case "sleeping":
      return <Sleeping />;
    case "coins":
      return <Coins />;
  }
}
