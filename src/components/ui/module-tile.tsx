"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { SOFT_SPRING, press } from "@/lib/motion";

export type Tone = "coral" | "sky" | "sun" | "leaf" | "iris";

/**
 * Colour carries meaning here, so the halo tone is never decorative-only.
 * Pastels fail contrast on white, which is why the label sits in ink below the
 * icon rather than inside the tint.
 */
const tones: Record<Tone, { halo: string; ink: string }> = {
  coral: { halo: "bg-coral-soft", ink: "text-coral" },
  sky: { halo: "bg-sky-soft", ink: "text-sky" },
  sun: { halo: "bg-sun-soft", ink: "text-sun" },
  leaf: { halo: "bg-leaf-soft", ink: "text-leaf" },
  iris: { halo: "bg-iris-soft", ink: "text-iris" },
};

const MotionLink = motion.create(Link);

export function ModuleTile({
  label,
  tone,
  href,
  icon: Icon,
}: {
  label: string;
  tone: Tone;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const t = tones[tone];

  return (
    <MotionLink
      href={href}
      className="group flex flex-col items-center gap-3 rounded-tile p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      initial="rest"
      whileHover="hover"
      whileFocus="hover"
      whileTap={press}
      animate="rest"
      transition={SOFT_SPRING}
      variants={{ rest: { y: 0 }, hover: { y: -4 } }}
    >
      <span className="relative grid size-16 place-items-center">
        {/* The halo swells behind the icon on hover — the icon itself stays
            put, so the line work never distorts. */}
        <motion.span
          className={cn("absolute inset-0 rounded-full", t.halo)}
          variants={{ rest: { scale: 1 }, hover: { scale: 1.12 } }}
          transition={SOFT_SPRING}
        />
        <Icon className={cn("relative size-8", t.ink)} />
      </span>
      <span className="text-label font-semibold text-ink">{label}</span>
    </MotionLink>
  );
}
