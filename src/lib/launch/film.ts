/**
 * The launch film's clock and timeline. Everything on screen is a pure
 * function of the frame number, so the film plays the same in the browser
 * preview and in the frame-by-frame render (tools/render-launch.mjs).
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/**
 * Scenes in order, with their length in frames. `wipe`: open on a coral flash.
 * From "statement" on, lengths are whole beats of the score (14 frames a
 * beat, ~128.6 BPM), so every flash lands on a downbeat.
 */
export const FRAMES_PER_BEAT = 14;
export const SCENES = [
  { id: "night", frames: 135 },
  { id: "nothing", frames: 60 },
  { id: "chaos", frames: 135 },
  { id: "whatif", frames: 90 },
  { id: "intro", frames: 135 },
  { id: "statement", frames: 112, wipe: true },
  { id: "snap", frames: 168, wipe: true },
  { id: "f1", frames: 84, wipe: true },
  { id: "f2", frames: 84, wipe: true },
  { id: "f3", frames: 84, wipe: true },
  { id: "f4", frames: 84, wipe: true },
  { id: "f5", frames: 84, wipe: true },
  { id: "scale", frames: 126, wipe: true },
  { id: "trust", frames: 154 },
  { id: "end", frames: 112 },
] as const satisfies ReadonlyArray<{ id: string; frames: number; wipe?: boolean }>;

export type SceneId = (typeof SCENES)[number]["id"];

export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.frames, 0);

/** Where each scene starts. */
export const SCENE_START: Record<SceneId, number> = (() => {
  const out = {} as Record<SceneId, number>;
  let at = 0;
  for (const s of SCENES) {
    out[s.id] = at;
    at += s.frames;
  }
  return out;
})();

/** Which scene a frame falls in, and how far into it. */
export function sceneAt(frame: number) {
  const f = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.floor(frame)));
  let at = 0;
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    if (f < at + s.frames) {
      return { index: i, id: s.id as SceneId, local: f - at, length: s.frames, wipe: "wipe" in s && s.wipe };
    }
    at += s.frames;
  }
  const last = SCENES[SCENES.length - 1];
  return { index: SCENES.length - 1, id: last.id as SceneId, local: last.frames - 1, length: last.frames, wipe: false };
}

// ---------------------------------------------------------------- easing

export type Ease = (t: number) => number;

export const linear: Ease = (t) => t;
export const easeOutCubic: Ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic: Ease = (t) => t * t * t;
export const easeInOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo: Ease = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInExpo: Ease = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
/** The app's own EASE_SOFT curve, approximated: fast out, long settle. */
export const easeSoft: Ease = (t) => 1 - Math.pow(1 - t, 4);
export const easeOutBack: Ease = (t) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Maps `frame` from [from, to] onto [a, b], clamped at both ends.
 * `interp(f, 10, 30, 0, 1, easeOutCubic)`.
 */
export function interp(frame: number, from: number, to: number, a = 0, b = 1, ease: Ease = linear) {
  if (to === from) return frame < from ? a : b;
  const t = Math.max(0, Math.min(1, (frame - from) / (to - from)));
  return a + (b - a) * ease(t);
}

/**
 * A damped spring from 0 to 1 starting at `start`. Overshoots a little and
 * settles — for things landing (cards, pins, the logo).
 */
export function spring(frame: number, start: number, { stiffness = 0.22, damping = 0.18 } = {}) {
  const t = frame - start;
  if (t <= 0) return 0;
  const w = stiffness * 1.9;
  return 1 - Math.exp(-damping * 1.6 * t * 0.5) * Math.cos(w * t);
}

/** The text a typewriter has reached. `cps`: characters per frame. */
export function typed(text: string, frame: number, start: number, cpf = 0.9) {
  if (frame < start) return "";
  return text.slice(0, Math.min(text.length, Math.floor((frame - start) * cpf)));
}

/** A caret's blink: on for half a second, off for half. Solid while typing. */
export function caretOn(frame: number, typing = false) {
  return typing || Math.floor(frame / 15) % 2 === 0;
}

/** A number counting up from 0 to `to`, eased. */
export function countUp(frame: number, start: number, frames: number, to: number) {
  return Math.round(interp(frame, start, start + frames, 0, to, easeOutCubic));
}

/**
 * Deterministic pseudo-random in [0, 1) from a seed — for scattering chips and
 * cards so the layout is the same on every render.
 */
export function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
