import type { FloraMood } from "@/components/flora/flora";

/**
 * Flora's voice.
 *
 * Synthesised in the browser rather than shipped as files: a handful of sine
 * tones with a soft envelope costs nothing to download, never 404s, and can
 * be tuned by changing a number instead of re-recording. It also keeps her
 * wordless, which is the point — she chirps, she does not talk over you.
 *
 * Rules the sound follows:
 *  - Quiet. Peak gain is a twentieth of full scale; this plays while someone
 *    is in a lecture hall.
 *  - Short. Nothing lasts longer than a third of a second.
 *  - Built per mood from one small scale, so worried and cheerful are the same
 *    instrument in a different mood rather than two different beeps.
 *  - Never the first thing that happens. Browsers suspend audio until a
 *    gesture, and `unlock()` is only called from one.
 */

/** A pentatonic-ish set, in Hz: nothing in it can sound sour against the rest. */
const NOTE = {
  low: 329.63, // E4
  mid: 392.0, // G4
  high: 493.88, // B4
  top: 587.33, // D5
  peak: 659.25, // E5
} as const;

type Note = { hz: number; at: number; for: number };

/** Each mood is a short motif: rising for good news, falling for bad. */
const MOTIF: Record<FloraMood, Note[]> = {
  cheer: [
    { hz: NOTE.mid, at: 0, for: 0.09 },
    { hz: NOTE.top, at: 0.07, for: 0.09 },
    { hz: NOTE.peak, at: 0.14, for: 0.16 },
  ],
  happy: [
    { hz: NOTE.mid, at: 0, for: 0.09 },
    { hz: NOTE.high, at: 0.08, for: 0.14 },
  ],
  neutral: [{ hz: NOTE.high, at: 0, for: 0.13 }],
  thinking: [
    { hz: NOTE.high, at: 0, for: 0.1 },
    { hz: NOTE.mid, at: 0.11, for: 0.15 },
  ],
  worried: [
    { hz: NOTE.high, at: 0, for: 0.1 },
    { hz: NOTE.low, at: 0.1, for: 0.2 },
  ],
  sleepy: [{ hz: NOTE.low, at: 0, for: 0.28 }],
};

/** The tap on her — a single soft blip, so a tap feels answered instantly. */
const TAP: Note[] = [{ hz: NOTE.top, at: 0, for: 0.06 }];

/** Any other button: shorter and lower than hers, so she stays the special one. */
const CLICK: Note[] = [{ hz: NOTE.mid, at: 0, for: 0.035 }];

const PEAK_GAIN = 0.05;

let context: AudioContext | null = null;

type WindowWithAudio = Window &
  typeof globalThis & { webkitAudioContext?: typeof AudioContext };

/**
 * Open the audio device. Safe to call repeatedly.
 *
 * Must run inside a real user gesture: every browser starts an AudioContext
 * suspended, and resuming it anywhere else silently fails.
 */
export function unlock(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume();
  } catch {
    // No audio device, or one the browser will not hand over. She stays mute.
    context = null;
  }
}

export function play(mood: FloraMood): void {
  emit(MOTIF[mood] ?? MOTIF.neutral);
}

export function playTap(): void {
  emit(TAP);
}

export function playClick(): void {
  emit(CLICK, 0.6);
}

function emit(notes: Note[], loudness = 1): void {
  if (!context || context.state !== "running") return;

  const start = context.currentTime;
  for (const note of notes) {
    try {
      voice(context, note, start, loudness);
    } catch {
      return;
    }
  }
}

/**
 * One note: a sine through its own gain envelope.
 *
 * The envelope matters more than the pitch. A raw gain switch clicks; ramping
 * up over 12ms and down exponentially is what makes it a chirp rather than a
 * beep.
 */
function voice(ctx: AudioContext, note: Note, start: number, loudness = 1) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(note.hz, start + note.at);

  const from = start + note.at;
  const to = from + note.for;
  gain.gain.setValueAtTime(0.0001, from);
  gain.gain.exponentialRampToValueAtTime(PEAK_GAIN * loudness, from + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, to);

  osc.connect(gain).connect(ctx.destination);
  osc.start(from);
  osc.stop(to + 0.02);
}

/** Close the device — used when sound is switched off. */
export function silence(): void {
  try {
    void context?.close();
  } catch {
    // Already gone.
  }
  context = null;
}
