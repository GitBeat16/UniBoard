/**
 * Scenes 1–4: the night before a deadline. Dark, quiet, then too much.
 */
import { easeInCubic, easeOutCubic, easeOutExpo, easeSoft, interp, rand, typed } from "@/lib/launch/film";
import { Caret, Chip, CORAL, DarkStage, DISPLAY, Layer, MONO } from "./kit";
import { PrintedTimetable } from "./timetable-art";

/** 1 · 11:48 PM, and a deadline typing itself out underneath. */
export function NightScene({ f }: { f: number }) {
  const inO = interp(f, 6, 30, 0, 1, easeOutCubic);
  const blur = interp(f, 6, 30, 14, 0, easeOutCubic);
  const out = interp(f, 122, 135, 1, 0);
  const minute = f >= 96 ? "49" : "48";
  const flip = f < 96 ? 0 : interp(f, 96, 104, 1, 0, easeOutCubic); // the new minute drops in
  const colon = Math.floor(f / 15) % 2 === 0 ? 1 : 0.25;

  const line = "DBMS assignment · due ";
  const deadline = "11:59 PM";
  const typedLine = typed(line + deadline, f, 42, 0.75);
  const lineDone = typedLine.length === (line + deadline).length;

  return (
    <DarkStage frame={f}>
      <Layer className="flex flex-col items-center justify-center" style={{ opacity: out }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 200,
            fontSize: 190,
            letterSpacing: "-0.02em",
            color: "#f2f2f2",
            opacity: inO,
            filter: `blur(${blur}px)`,
            display: "flex",
            alignItems: "flex-start",
            lineHeight: 1,
          }}
        >
          <span>11</span>
          <span style={{ opacity: colon, margin: "0 0.02em" }}>:</span>
          <span style={{ display: "inline-block", overflow: "hidden" }}>
            <span style={{ display: "inline-block", transform: `translateY(${-flip * 40}%)`, opacity: 1 - flip * 0.8 }}>
              {minute}
            </span>
          </span>
          <span style={{ fontSize: 34, fontWeight: 400, marginLeft: 14, marginTop: 18, color: "#9aa0a6" }}>PM</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 30, color: "#b9bdc1", marginTop: 36, height: 40 }}>
          {typedLine.slice(0, line.length)}
          <span style={{ color: CORAL }}>{typedLine.slice(line.length)}</span>
          {f >= 40 && <Caret frame={f} typing={!lineDone} />}
        </div>
      </Layer>
    </DarkStage>
  );
}

/** 2 · The problem, plainly. */
export function NothingScene({ f }: { f: number }) {
  const o = interp(f, 2, 12, 0, 1, easeOutCubic) * interp(f, 50, 60, 1, 0);
  const blur = interp(f, 2, 14, 10, 0, easeOutCubic);
  const scale = interp(f, 0, 60, 1.04, 1);
  return (
    <DarkStage frame={f + 135}>
      <Layer className="flex items-center justify-center">
        <div
          style={{
            fontFamily: "var(--font-poppins)",
            fontWeight: 600,
            fontSize: 92,
            letterSpacing: "-0.02em",
            color: "#f5f5f5",
            opacity: o,
            filter: `blur(${blur}px)`,
            transform: `scale(${scale})`,
          }}
        >
          Nothing is in one place.
        </div>
      </Layer>
    </DarkStage>
  );
}

const CHIPS: Array<{ text: string; at: number; x: number; y: number; tone?: "alarm" | "coral" }> = [
  { text: "timetable_final(2).jpg", at: 14, x: 330, y: 205 },
  { text: "Attendance: 72%??", at: 22, x: 1340, y: 250, tone: "alarm" },
  { text: "Is the OS lab monitored?", at: 30, x: 250, y: 820 },
  { text: "₹140 left till Friday", at: 38, x: 1400, y: 690, tone: "alarm" },
  { text: "WhatsApp · “lab moved to 3?”", at: 45, x: 1180, y: 150 },
  { text: "DBMS assignment · due 11:59 PM", at: 52, x: 560, y: 905, tone: "coral" },
  { text: "Hackathon reg closes tonight", at: 58, x: 130, y: 470 },
  { text: "Can I skip tomorrow?", at: 64, x: 1450, y: 480 },
  { text: "Screenshot 2026-09-22 at 8.14 AM.png", at: 70, x: 1030, y: 890 },
  { text: "3 notes apps · 0 answers", at: 76, x: 560, y: 125, tone: "alarm" },
  { text: "notice board (3).jpg", at: 82, x: 140, y: 640 },
  { text: "Which room is TOC in??", at: 88, x: 1500, y: 360 },
];

/** 3 · Everything at once: the photo of a printout, and the questions piling up. */
export function ChaosScene({ f }: { f: number }) {
  const photoIn = interp(f, 0, 22, 0, 1, easeOutExpo);
  const push = interp(f, 0, 135, 1, 1.12);
  const shake = f > 70 ? (rand(f) - 0.5) * interp(f, 70, 125, 0, 9) : 0;
  const shakeY = f > 70 ? (rand(f + 99) - 0.5) * interp(f, 70, 125, 0, 7) : 0;
  const out = interp(f, 124, 135, 1, 0, easeInCubic);

  return (
    <DarkStage frame={f + 195} glow={1.3}>
      <Layer style={{ opacity: out, transform: `translate(${shake}px, ${shakeY}px) scale(${push})` }}>
        <Layer className="flex items-center justify-center" style={{ perspective: 1600 }}>
          <div
            style={{
              transform: `translateY(${(1 - photoIn) * 160}px) rotateX(14deg) rotateZ(${-7 + (1 - photoIn) * -6}deg) rotateY(-8deg)`,
              opacity: photoIn,
              filter: "blur(0.6px) saturate(0.9)",
            }}
          >
            <PrintedTimetable width={860} />
          </div>
        </Layer>
        {CHIPS.map((c, i) => {
          const p = interp(f, c.at, c.at + 8, 0, 1, easeOutExpo);
          if (p <= 0) return null;
          const drift = Math.sin((f + i * 20) / 18) * 4;
          // the alarming ones flicker once the pile is big
          const flicker = c.tone === "alarm" && f > 95 && rand(f * 7 + i) > 0.82 ? 0.45 : 1;
          return (
            <Chip
              key={c.text}
              tone={c.tone}
              style={{
                left: c.x,
                top: c.y + drift,
                opacity: p * flicker,
                transform: `scale(${0.85 + 0.15 * p}) rotate(${(rand(i + 3) - 0.5) * 5}deg)`,
              }}
            >
              {c.text}
            </Chip>
          );
        })}
      </Layer>
    </DarkStage>
  );
}

/** 4 · The turn. */
export function WhatIfScene({ f }: { f: number }) {
  const text = "What if it was all on one board?";
  const t = typed(text, f, 10, 0.62);
  const done = t.length === text.length;
  const glow = interp(f, 60, 90, 0.3, 1.6, easeSoft);
  return (
    <DarkStage frame={f + 330} glow={glow}>
      <Layer className="flex items-center justify-center">
        <div style={{ fontFamily: MONO, fontSize: 52, color: "#f0f0f0", letterSpacing: "-0.01em" }}>
          {t}
          <Caret frame={f} typing={!done} />
        </div>
      </Layer>
    </DarkStage>
  );
}
