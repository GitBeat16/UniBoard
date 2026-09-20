"use client";

import { AnimatePresence, motion } from "motion/react";
import { Flora } from "./flora";
import { cn } from "@/lib/cn";
import { EASE_SOFT, SOFT_SPRING, press } from "@/lib/motion";
import { floraSpeech, type FloraContext } from "@/lib/flora/lines";
import { setFloraEnabled, useFloraEnabled } from "@/lib/flora/preference";

/**
 * Flora plus what she has to say. Renders nothing when she has nothing useful
 * to add, or when the student has switched her off — an empty bubble is worse
 * than no bubble.
 */
export function FloraSays({
  context,
  className,
  size = "sm",
}: {
  context: FloraContext;
  className?: string;
  size?: "sm" | "md";
}) {
  const enabled = useFloraEnabled();
  const speech = floraSpeech(context);

  if (!enabled || !speech) return null;

  return (
    <div className={cn("flex items-end gap-1", className)}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SOFT_SPRING}
      >
        <Flora mood={speech.mood} size={size} action={speech.action ?? "idle"} />
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={speech.text}
          initial={{ opacity: 0, x: -8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 8, scale: 0.96 }}
          transition={{ duration: 0.3, ease: EASE_SOFT }}
          className="relative mb-3 flex-1 rounded-tile rounded-bl-md bg-paper p-4 shadow-soft"
        >
          {/* Tail, drawn as a rotated square so it inherits the card's colour */}
          <span
            aria-hidden="true"
            className="absolute -left-1.5 bottom-3 size-3 rotate-45 bg-paper"
          />
          <p className="relative text-label text-ink">{speech.text}</p>

          <motion.button
            type="button"
            onClick={() => setFloraEnabled(false)}
            whileTap={press}
            transition={SOFT_SPRING}
            aria-label="Hide Flora"
            className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-canvas text-caption font-bold text-muted hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            ×
          </motion.button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Flora on her own, no bubble — for empty states and the sign-in screen. */
export function FloraSolo({
  mood = "happy",
  size = "md",
  action = "idle",
  className,
}: {
  mood?: Parameters<typeof Flora>[0]["mood"];
  size?: Parameters<typeof Flora>[0]["size"];
  action?: Parameters<typeof Flora>[0]["action"];
  className?: string;
}) {
  const enabled = useFloraEnabled();
  if (!enabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SOFT_SPRING}
      className={className}
    >
      <Flora mood={mood} size={size} action={action} />
    </motion.div>
  );
}
