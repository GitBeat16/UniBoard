"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * The UniBoard mark: a felt board in a wooden frame, with one card pinned to
 * it, and a hand-drawn U on the card. It is the Board screen in miniature,
 * so the logo and the product are the same idea.
 *
 * Animated: the board settles, the card drops in and swings on its pin, the
 * pin presses in, the U draws itself, then the wordmark rises. Hovering swings
 * the card again. `animated={false}` (and prefers-reduced-motion) draw it
 * finished, for small or repeated uses.
 */
export function Logo({
  size = 40,
  animated = true,
  wordmark = true,
  className,
  wordmarkClassName,
}: {
  size?: number;
  animated?: boolean;
  wordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}) {
  const reduced = useReducedMotion();
  const play = animated && !reduced;
  const [swing, setSwing] = useState(0);

  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      onMouseEnter={() => play && setSwing((n) => n + 1)}
    >
      <LogoMark size={size} play={play} swing={swing} />
      {wordmark && (
        <span
          className={cn("text-h2 leading-none tracking-tight", wordmarkClassName)}
          aria-label="UniBoard"
        >
          {["Uni", "Board"].map((part, i) => (
            <motion.span
              key={part}
              aria-hidden="true"
              className={cn("inline-block", i === 0 ? "font-normal" : "font-bold")}
              initial={play ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: play ? 0.95 + i * 0.12 : 0, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {part}
            </motion.span>
          ))}
        </span>
      )}
    </span>
  );
}

export function LogoMark({
  size = 40,
  play = false,
  swing = 0,
  className,
}: {
  size?: number;
  play?: boolean;
  /** Bump to replay the card's swing (hover). */
  swing?: number;
  className?: string;
}) {
  const id = useId();
  const pinGrad = `${id}-pin`;
  const woodGrad = `${id}-wood`;
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="UniBoard"
      className={cn("shrink-0 overflow-visible", className)}
    >
      <defs>
        <linearGradient id={woodGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9875a" />
          <stop offset="0.5" stopColor="#94613a" />
          <stop offset="1" stopColor="#a87447" />
        </linearGradient>
        <radialGradient id={pinGrad} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.3" stopColor="var(--color-coral)" />
          <stop offset="1" stopColor="var(--color-coral)" />
        </radialGradient>
      </defs>

      {/* The board: wood frame, felt inside. */}
      <motion.g
        initial={play ? { opacity: 0, scale: 0.8 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease }}
        style={{ originX: "24px", originY: "26px" }}
      >
        <rect x="2" y="5" width="44" height="40" rx="10" fill={`url(#${woodGrad})`} />
        <rect x="5.5" y="8.5" width="37" height="33" rx="7" fill="var(--color-felt)" />
        <rect
          x="7.8"
          y="10.8"
          width="32.4"
          height="28.4"
          rx="5"
          stroke="rgb(255 225 225 / 0.28)"
          strokeWidth="0.9"
          strokeDasharray="1.6 1.6"
        />
      </motion.g>

      {/* The card, hung from the pin at its top centre. */}
      <motion.g
        key={swing}
        initial={play ? { y: swing ? 0 : -20, opacity: swing ? 1 : 0, rotate: -16 } : false}
        animate={{ y: 0, opacity: 1, rotate: play ? [-16, 7, -4.5, -3] : -3 }}
        transition={{
          y: { type: "spring", stiffness: 260, damping: 18, delay: swing ? 0 : 0.2 },
          opacity: { duration: 0.2, delay: swing ? 0 : 0.2 },
          rotate: { duration: 0.95, times: [0, 0.45, 0.75, 1], ease: "easeOut", delay: swing ? 0 : 0.2 },
        }}
        style={{ originX: "24px", originY: "13px" }}
      >
        <path
          d="M13.4 14.6C20.4 14.1 27.5 14.2 34.6 14.5C35 21.3 34.9 28.1 34.5 34.9C27.5 35.3 20.5 35.2 13.5 34.9C13.1 28.1 13.1 21.4 13.4 14.6Z"
          fill="var(--color-paper)"
          stroke="var(--color-ink)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* The U, drawn by hand. */}
        <motion.path
          d="M18.8 20.2C18.6 23.4 18.5 26.4 19.6 28.4C20.8 30.5 23.6 31 25.8 30.3C28.4 29.5 29.4 27.2 29.4 24.2C29.4 22.8 29.3 21.4 29.2 20.1"
          stroke="var(--color-ink)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={play && !swing ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.75, ease }}
        />
      </motion.g>

      {/* The pin: arrives after the card, presses into the felt. */}
      <motion.g
        initial={play ? { opacity: 0, y: -8, scale: 1.7 } : false}
        animate={{ opacity: 1, y: 0, scale: play ? [1.7, 0.8, 1] : 1 }}
        transition={{ duration: 0.4, delay: 0.5, times: [0, 0.7, 1], ease: "easeOut" }}
        style={{ originX: "24px", originY: "13px" }}
      >
        <ellipse cx="25" cy="15.6" rx="4" ry="1.6" fill="rgb(0 0 0 / 0.28)" />
        <circle cx="24" cy="13" r="4.3" fill={`url(#${pinGrad})`} stroke="rgb(0 0 0 / 0.35)" strokeWidth="0.7" />
        <ellipse cx="22.6" cy="11.5" rx="1.3" ry="0.85" fill="#fff" opacity="0.85" />
      </motion.g>
    </svg>
  );
}
