"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { SOFT_SPRING, press } from "@/lib/motion";

type Variant = "primary" | "soft" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  // One loud black pill per screen. Do not dilute it by using primary twice.
  primary: "bg-ink text-paper hover:bg-ink/90",
  soft: "bg-paper text-ink shadow-soft hover:shadow-lift",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  outline: "bg-transparent text-ink ring-1 ring-inset ring-hairline hover:bg-ink/5",
};

const sizes = {
  sm: "h-9 px-4 text-label",
  md: "h-11 px-5 text-label",
  lg: "h-14 px-8 text-body",
} as const;

type Size = keyof typeof sizes;

function classes(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold",
    "transition-colors duration-250 ease-soft",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
    "disabled:opacity-40 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );
}

const MotionLink = motion.create(Link);

export function PillButton({
  variant = "primary",
  size = "lg",
  className,
  ...props
}: {
  variant?: Variant;
  size?: Size;
} & React.ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      className={classes(variant, size, className)}
      whileTap={press}
      whileHover={{ y: -1 }}
      transition={SOFT_SPRING}
      {...props}
    />
  );
}

export function PillLink({
  variant = "primary",
  size = "lg",
  className,
  href,
  ...props
}: {
  variant?: Variant;
  size?: Size;
} & React.ComponentProps<typeof MotionLink>) {
  return (
    <MotionLink
      href={href}
      className={classes(variant, size, className)}
      whileTap={press}
      whileHover={{ y: -1 }}
      transition={SOFT_SPRING}
      {...props}
    />
  );
}
