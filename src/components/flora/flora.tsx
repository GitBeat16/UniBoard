"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";
import { cn } from "@/lib/cn";
import { EASE_SOFT } from "@/lib/motion";

/**
 * Flora — UniBoard's guide.
 *
 * A sprout drawn in the same language as the rest of the system: 2px ink
 * strokes, rounded caps, a deliberate wobble. She is not decoration. Her mood
 * is derived from real state (attendance buffer, overdue work, the Skip
 * Advisor's verdict), so a worried Flora means something is actually wrong.
 *
 * Motion is layered so each part can move independently:
 *
 *   svg            shadow, planted — it never travels with her
 *    └ travel      entrance hop, or a walk across
 *       └ react    a pop replayed whenever her mood changes
 *          └ idle  bob with squash and stretch
 *             └ body, arms, face
 *
 * Squash and stretch is the thing that makes her read as alive rather than as
 * a bobbing sticker: she compresses at the bottom of the bob and stretches at
 * the top, conserving volume the way a real body would.
 *
 * Everything stops under prefers-reduced-motion.
 */

export type FloraMood =
  | "neutral"
  | "happy"
  | "cheer"
  | "worried"
  | "thinking"
  | "sleepy";

/** What she is doing, on top of breathing. */
export type FloraAction = "idle" | "wave" | "point";

const SIZES = { sm: 64, md: 96, lg: 132 } as const;

const BUD =
  "M50 18 C 72 36, 84 52, 84 68 C 84 88, 69 102, 50 102 C 31 102, 16 88, 16 68 C 16 52, 28 36, 50 18 Z";
const ARM_LEFT = "M21 70 C 10 61, -2 67, 1 79 C 4 91, 19 85, 21 70 Z";
const ARM_RIGHT = "M79 70 C 90 61, 102 67, 99 79 C 96 91, 81 85, 79 70 Z";
const VEIN_LEFT = "M21 70 C 14 74, 8 78, 4 81";
const VEIN_RIGHT = "M79 70 C 86 74, 92 78, 96 81";

const MOUTHS: Record<FloraMood, string> = {
  neutral: "M43 73 C 46.5 77, 53.5 77, 57 73",
  happy: "M42 72 C 46 79, 54 79, 58 72",
  cheer: "M42 71 C 44 81, 56 81, 58 71 Z",
  worried: "M43 77 C 46 72, 54 80, 57 74",
  thinking: "M45 75 L 55 75",
  sleepy: "M45 74 C 48 78, 52 78, 55 74",
};

const OPEN_EYES: FloraMood[] = ["neutral", "happy", "worried", "thinking"];

export function Flora({
  mood = "happy",
  size = "md",
  action = "idle",
  enter = "hop",
  className,
}: {
  mood?: FloraMood;
  size?: keyof typeof SIZES;
  action?: FloraAction;
  /** "hop" travels in from the side; "fade" is for dense lists. */
  enter?: "hop" | "fade" | "none";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const still = Boolean(reduced);
  const px = SIZES[size];

  const cheer = mood === "cheer";
  const sleepy = mood === "sleepy";

  // Slow when sleepy, quick when cheering — the tempo carries as much of the
  // mood as the face does.
  const beat = sleepy ? 4.6 : cheer ? 1.5 : 3.4;

  const idle = still
    ? undefined
    : {
        y: [0, -4, 0],
        // Volume-conserving: wide and short at the bottom, tall and narrow at
        // the top of the bob. Kept gentle — the origin sits at her base, so
        // any scale here is amplified at the face, and a wobbling face reads
        // as a glitch rather than as breathing.
        scaleY: [1, 1.028, 0.988, 1],
        scaleX: [1, 0.978, 1.022, 1],
        rotate: sleepy ? [0, 1.1, 0, -1.1, 0] : [0, 0.9, 0, -0.9, 0],
      };

  const travelIn =
    enter === "none" || still
      ? undefined
      : enter === "hop"
        ? {
            initial: { x: -38, opacity: 0, rotate: -8 },
            animate: { x: 0, opacity: 1, rotate: 0, y: [0, -16, 0, -9, 0] },
            transition: { duration: 0.95, ease: EASE_SOFT } as Transition,
          }
        : {
            initial: { opacity: 0, scale: 0.86 },
            animate: { opacity: 1, scale: 1 },
            transition: { duration: 0.4, ease: EASE_SOFT } as Transition,
          };

  return (
    <motion.svg
      width={px}
      height={px * (116 / 100)}
      viewBox="0 0 100 116"
      fill="none"
      role="img"
      aria-label={`Flora looks ${mood}`}
      className={cn("shrink-0 overflow-visible", className)}
    >
      {/* Planted. It tightens as she rises, which is what sells the bob as
          weight rather than drift. */}
      <motion.ellipse
        cx="50"
        cy="110"
        rx="20"
        ry="3.4"
        fill="var(--color-ink)"
        opacity={0.09}
        animate={still ? undefined : { scaleX: [1, 0.84, 1], opacity: [0.1, 0.05, 0.1] }}
        style={{ originX: "50px", originY: "110px" }}
        transition={{ duration: beat, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* travel */}
      <motion.g {...travelIn}>
        {/* react — keyed on mood, so every mood change replays a small pop */}
        <motion.g
          key={mood}
          initial={still ? false : { scale: 0.82, y: -6 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 16, mass: 0.7 }}
          style={{ originX: "50px", originY: "102px" }}
        >
          {/* idle */}
          <motion.g
            animate={idle}
            transition={{
              duration: beat,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.3, 0.7, 1],
            }}
            style={{ originX: "50px", originY: "102px" }}
          >
            <motion.path
              d="M50 18 C 50 10, 55 5, 61 7"
              stroke="var(--color-ink)"
              strokeWidth={3}
              strokeLinecap="round"
              animate={still ? undefined : { rotate: [0, 9, 0, -6, 0] }}
              style={{ originX: "50px", originY: "18px" }}
              transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
            />

            <Arm
              side="left"
              still={still}
              cheer={cheer}
              waving={false}
              beat={beat}
            />
            <Arm
              side="right"
              still={still}
              cheer={cheer}
              waving={action === "wave" || action === "point"}
              pointing={action === "point"}
              beat={beat}
            />

            <path
              d={BUD}
              fill="var(--color-leaf-soft)"
              stroke="var(--color-ink)"
              strokeWidth={2.6}
              strokeLinejoin="round"
            />
            <path
              d="M50 22 C 50 30, 50 36, 50 40"
              stroke="var(--color-ink)"
              strokeWidth={1.6}
              strokeLinecap="round"
              opacity={0.35}
            />

            <Cheeks mood={mood} />
            <Eyes mood={mood} still={still} />

            <path
              d={MOUTHS[mood]}
              stroke="var(--color-ink)"
              strokeWidth={2.4}
              strokeLinecap="round"
              fill={mood === "cheer" ? "var(--color-ink)" : "none"}
            />

            <Accessory mood={mood} still={still} />
          </motion.g>
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}

function Arm({
  side,
  still,
  cheer,
  waving,
  pointing = false,
  beat,
}: {
  side: "left" | "right";
  still: boolean;
  cheer: boolean;
  waving: boolean;
  pointing?: boolean;
  beat: number;
}) {
  const left = side === "left";
  const sign = left ? -1 : 1;

  let animate: Record<string, number[]> | undefined;
  let duration = beat + 0.4;

  if (still) {
    animate = undefined;
  } else if (pointing) {
    // Held out, with a small insistent nudge rather than a full wave.
    animate = { rotate: [sign * 38, sign * 46, sign * 38] };
    duration = 1.4;
  } else if (waving) {
    animate = { rotate: [0, sign * 42, sign * 14, sign * 42, 0] };
    duration = 1.6;
  } else if (cheer) {
    animate = { rotate: [0, sign * 26, 0] };
    duration = 0.8;
  } else {
    // Out of phase with the other arm — that asymmetry is what stops her
    // reading as a rigid logo.
    animate = { rotate: [0, sign * 9, 0, sign * -4, 0] };
  }

  return (
    <motion.g
      style={{ originX: left ? "21px" : "79px", originY: "70px" }}
      animate={animate}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: still || left || waving || pointing ? 0 : 0.4,
      }}
    >
      <path
        d={left ? ARM_LEFT : ARM_RIGHT}
        fill="var(--color-leaf)"
        stroke="var(--color-ink)"
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <path
        d={left ? VEIN_LEFT : VEIN_RIGHT}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.45}
      />
    </motion.g>
  );
}

function Cheeks({ mood }: { mood: FloraMood }) {
  if (mood === "thinking") return null;
  return (
    <g fill="var(--color-coral)" opacity={0.45}>
      <ellipse cx="31" cy="73" rx="5" ry="3.4" />
      <ellipse cx="69" cy="73" rx="5" ry="3.4" />
    </g>
  );
}

function Eyes({ mood, still }: { mood: FloraMood; still: boolean }) {
  if (mood === "cheer") {
    return (
      <g stroke="var(--color-ink)" strokeWidth={2.6} strokeLinecap="round" fill="none">
        <path d="M35 64 C 37.5 59, 42.5 59, 45 64" />
        <path d="M55 64 C 57.5 59, 62.5 59, 65 64" />
      </g>
    );
  }

  if (mood === "sleepy") {
    return (
      <g stroke="var(--color-ink)" strokeWidth={2.6} strokeLinecap="round" fill="none">
        <path d="M35 62 C 37.5 67, 42.5 67, 45 62" />
        <path d="M55 62 C 57.5 67, 62.5 67, 65 62" />
      </g>
    );
  }

  const wide = mood === "worried";
  const lookUp = mood === "thinking" ? -2 : 0;
  const canBlink = !still && OPEN_EYES.includes(mood);
  const rx = wide ? 4 : 3.4;
  const ry = wide ? 4 : 3.4;

  return (
    <>
      {wide && (
        <g stroke="var(--color-ink)" strokeWidth={2} strokeLinecap="round" fill="none">
          <path d="M34 54 C 37 51, 42 51, 45 53" />
          <path d="M66 54 C 63 51, 58 51, 55 53" />
        </g>
      )}

      {/* Looking about. A pure translate — no transform-origin involved, so it
          cannot drift. */}
      <motion.g
        animate={still ? undefined : { x: [0, 0, 2.6, 2.6, 0, -2.6, -2.6, 0] }}
        transition={{
          duration: 9.5,
          times: [0, 0.28, 0.34, 0.46, 0.52, 0.62, 0.74, 1],
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* The blink animates each eye's ry rather than scaling a group.
            transform-origin on a nested SVG <g> resolves against the viewBox,
            not the element, so a scaleY blink dragged the eyes downwards every
            cycle. Animating the geometry has no origin to get wrong. */}
        {[40, 60].map((cx) => (
          <motion.ellipse
            key={cx}
            cx={cx}
            cy={62 + lookUp}
            rx={rx}
            // ry must exist as an attribute before motion animates it,
            // otherwise the first paint is <ellipse ry="undefined">.
            ry={ry}
            fill="var(--color-ink)"
            // Explicit initial: without it motion has no "from" value for a
            // non-standard animated attribute on the very first frame.
            initial={{ ry }}
            animate={canBlink ? { ry: [ry, ry, 0.35, ry, ry, 0.35, ry] } : { ry }}
            transition={
              canBlink
                ? {
                    duration: 6.2,
                    times: [0, 0.45, 0.47, 0.5, 0.86, 0.88, 1],
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
                : { duration: 0 }
            }
          />
        ))}
      </motion.g>
    </>
  );
}

function Accessory({ mood, still }: { mood: FloraMood; still: boolean }) {
  if (mood === "cheer") {
    return (
      <g stroke="var(--color-coral)" strokeWidth={3} strokeLinecap="round">
        {[
          { d: "M12 32 L12 44 M6 38 L18 38", delay: 0 },
          { d: "M89 22 L89 32 M84 27 L94 27", delay: 0.35 },
        ].map((s) => (
          <motion.path
            key={s.d}
            d={s.d}
            animate={still ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.7, 1.15, 0.7], rotate: [0, 25, 0] }}
            style={{ originX: "50px", originY: "50px" }}
            transition={{ duration: 1.5, repeat: Infinity, delay: s.delay, ease: EASE_SOFT }}
          />
        ))}
      </g>
    );
  }

  if (mood === "worried") {
    return (
      <motion.path
        d="M86 44 C 89 49, 91 52, 91 55 C 91 58, 88.5 60, 86 60 C 83.5 60, 81 58, 81 55 C 81 52, 83 49, 86 44 Z"
        fill="var(--color-sky)"
        stroke="var(--color-ink)"
        strokeWidth={1.8}
        animate={still ? undefined : { y: [0, 5, 0], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  if (mood === "thinking") {
    return (
      <g fill="var(--color-ink)">
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={74 + i * 9}
            cy={30 - i * 5}
            r={2.2 + i * 0.6}
            animate={still ? undefined : { opacity: [0.15, 1, 0.15], y: [0, -3, 0] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeInOut",
            }}
          />
        ))}
      </g>
    );
  }

  if (mood === "sleepy") {
    return (
      <g
        fill="var(--color-ink)"
        fontFamily="var(--font-display)"
        fontWeight={700}
        opacity={0.75}
      >
        {[
          { x: 74, y: 42, size: 15, delay: 0 },
          { x: 86, y: 27, size: 20, delay: 0.9 },
        ].map((z) => (
          <motion.text
            key={z.delay}
            x={z.x}
            y={z.y}
            fontSize={z.size}
            animate={still ? undefined : { y: [0, -9, -14], opacity: [0, 0.8, 0], rotate: [0, 8, 14] }}
            style={{ originX: `${z.x}px`, originY: `${z.y}px` }}
            transition={{ duration: 3.4, repeat: Infinity, delay: z.delay, ease: "easeOut" }}
          >
            z
          </motion.text>
        ))}
      </g>
    );
  }

  return null;
}
