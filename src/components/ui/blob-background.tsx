"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * The soft colour blocks the white cards float over — now slowly drifting.
 *
 * Amplitudes are deliberately tiny (a dozen pixels over half a minute). The
 * point is that the page feels alive when you glance back at it, not that you
 * ever catch it moving. Anything faster turns a calm study app into a
 * screensaver.
 *
 * Decorative only: aria-hidden, and never the sole carrier of meaning.
 */

const BLOBS = {
  coral:
    "M45.6 -58.2C58.1 -47.4 65.9 -31.4 70.2 -14.1C74.5 3.2 75.3 21.8 67.2 35.3C59.1 48.8 42.1 57.1 25.2 62.4C8.3 67.7 -8.5 70 -24.9 65.7C-41.3 61.4 -57.3 50.5 -65.4 35.4C-73.5 20.3 -73.7 1 -68.6 -15.8C-63.5 -32.6 -53.1 -46.9 -39.7 -57.4C-26.3 -67.9 -9.9 -74.6 4.9 -80.4C19.7 -86.2 33.1 -69 45.6 -58.2Z",
  sky: "M52.9 -62.7C66.6 -52.3 74.4 -33.6 75.9 -15.3C77.4 3 72.6 20.9 62.6 35.3C52.6 49.7 37.4 60.6 20.4 66.8C3.4 73 -15.4 74.5 -31.9 68.4C-48.4 62.3 -62.6 48.6 -69.8 32.1C-77 15.6 -77.2 -3.7 -71.2 -20.5C-65.2 -37.3 -53 -51.6 -38.5 -61.8C-24 -72 -7.2 -78.1 7.9 -77.4C23 -76.7 39.2 -73.1 52.9 -62.7Z",
  sun: "M41.3 -52.4C54.4 -42.6 66.6 -30.9 70.5 -16.6C74.4 -2.3 70 14.7 61.3 28.9C52.6 43.1 39.6 54.6 24.5 61.3C9.4 68 -7.8 69.9 -23.6 65.3C-39.4 60.7 -53.8 49.6 -62.4 35C-71 20.4 -73.8 2.3 -69.6 -13.5C-65.4 -29.3 -54.2 -42.8 -40.7 -52.7C-27.2 -62.6 -13.6 -68.9 0.4 -69.4C14.4 -69.9 28.2 -62.2 41.3 -52.4Z",
} as const;

function Blob({
  d,
  className,
  drift,
  duration,
  delay = 0,
  still,
}: {
  d: string;
  className: string;
  drift: { x: number[]; y: number[]; rotate: number[] };
  duration: number;
  delay?: number;
  still: boolean;
}) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 200 200"
      fill="currentColor"
      animate={still ? undefined : drift}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      }}
    >
      <path d={d} transform="translate(100 100)" />
    </motion.svg>
  );
}

export function BlobBackground({ variant = "home" }: { variant?: "home" | "calm" }) {
  const reduced = useReducedMotion();
  const still = Boolean(reduced);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Opacity lives on the shapes rather than a flat white wash over the
          top: the wash desaturated them to near-grey. These levels keep ink
          text readable where it sits directly on a blob. */}
      <Blob
        d={BLOBS.coral}
        className="absolute -top-28 -left-24 size-[22rem] text-coral opacity-45"
        drift={{ x: [0, 14, 0], y: [0, -10, 0], rotate: [0, 6, 0] }}
        duration={34}
        still={still}
      />

      {variant === "home" && (
        <Blob
          d={BLOBS.sky}
          className="absolute -right-36 top-[42%] size-[20rem] text-sky opacity-40"
          drift={{ x: [0, -16, 0], y: [0, 12, 0], rotate: [0, -7, 0] }}
          duration={41}
          delay={1.5}
          still={still}
        />
      )}

      <Blob
        d={BLOBS.sun}
        className="absolute -bottom-28 -left-20 size-[19rem] text-sun opacity-45"
        drift={{ x: [0, 12, 0], y: [0, 10, 0], rotate: [0, 8, 0] }}
        duration={38}
        delay={0.8}
        still={still}
      />
    </div>
  );
}
