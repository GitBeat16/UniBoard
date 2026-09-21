"use client";

import { useId } from "react";
import { motion } from "motion/react";

/**
 * A push-pin head: a glossy dome in the card's tone with a highlight and a
 * cast shadow. On arrival it drops in and squashes as it presses into the
 * felt, a beat after its card lands.
 */
export function Pin({
  tone,
  delay = 0,
  style,
}: {
  tone: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const id = useId();
  return (
    <motion.svg
      viewBox="0 0 22 22"
      width={22}
      height={22}
      aria-hidden="true"
      className="pointer-events-none absolute z-10"
      style={{ filter: "drop-shadow(1px 3px 2px rgb(0 0 0 / 0.45))", ...style }}
      initial={{ opacity: 0, y: -16, scale: 1.6 }}
      animate={{ opacity: 1, y: 0, scale: [1.6, 0.8, 1] }}
      transition={{ delay: delay + 0.22, duration: 0.38, times: [0, 0.7, 1], ease: "easeOut" }}
    >
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.28" stopColor={tone} />
          <stop offset="1" stopColor={tone} />
        </radialGradient>
      </defs>
      <circle cx="11" cy="11" r="8" fill={`url(#${id})`} stroke="rgb(0 0 0 / 0.35)" strokeWidth="1" />
      <ellipse cx="8.3" cy="7.6" rx="2.4" ry="1.6" fill="#fff" opacity="0.85" />
    </motion.svg>
  );
}
