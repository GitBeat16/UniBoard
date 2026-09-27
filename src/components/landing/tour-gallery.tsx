"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import CircularGallery, { type CircularGalleryHandle } from "@/components/reactbits/CircularGallery";
import { cn } from "@/lib/cn";
import { EASE_SOFT } from "@/lib/motion";
import { TOUR_SCENES, TOUR_STAGE, tourStill } from "@/lib/tour";

const WIDE = "(min-width: 768px)";
const subscribeWide = (onChange: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const ITEMS = TOUR_SCENES.map((s) => ({ image: tourStill(s.id), text: s.title }));

/**
 * The tour: the app's real screens on a slowly turning arc. Drag or swipe it
 * sideways, or focus it and use the arrow keys; it drifts on its own until a
 * hand is on it.
 *
 * The screens are drawn in WebGL, which a screen reader can't see — so the
 * list below says the same thing in words. The list follows the arc — the
 * screen in the middle is the one lit up — and choosing an item turns the
 * arc to it. On a phone only the current one shows, with dots to jump.
 * If WebGL won't start, the same stills sit in a plain row you can swipe.
 */
export function TourGallery({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const gallery = useRef<CircularGalleryHandle>(null);
  // A gentler arc on a phone: at full bend the side cards tip over.
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);

  return (
    <div className={className}>
      {failed ? (
        <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TOUR_SCENES.map((s) => (
            <li key={s.id} className="w-[13rem] shrink-0 snap-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size still, already optimised */}
              <img
                src={tourStill(s.id)}
                alt=""
                width={TOUR_STAGE.width}
                height={TOUR_STAGE.height}
                loading="lazy"
                className="h-auto w-full rounded-card shadow-lift"
              />
              <p className="mt-3 text-center text-label font-semibold">{s.title}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="h-[27rem] sm:h-[34rem] lg:h-[38rem]">
          <CircularGallery
            items={ITEMS}
            bend={wide ? 3 : 1.2}
            textColor="#111111"
            borderRadius={0.05}
            scrollEase={0.05}
            autoplay={0.012}
            planeWidth={560}
            planeHeight={1005}
            className="rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            ariaLabel="The app's screens on a turning arc. Drag sideways, or use the Left and Right Arrow keys."
            offsetY={0.07}
            onActiveChange={setActive}
            ref={gallery}
            onError={() => setFailed(true)}
          />
        </div>
      )}

      <ol className="mx-auto mt-8 grid max-w-5xl gap-x-6 px-5 md:grid-cols-5 md:px-8 lg:px-10">
        {TOUR_SCENES.map((s, i) => {
          const lit = failed || i === active;
          return (
            <li key={s.id} className={cn(!lit && "hidden md:block")}>
              <button
                type="button"
                onClick={() => gallery.current?.goTo(i)}
                aria-current={lit && !failed ? "step" : undefined}
                disabled={failed}
                className="group relative block w-full rounded-chip pt-4 text-left transition-opacity duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink md:opacity-60 md:hover:opacity-90 md:aria-[current=step]:opacity-100"
              >
                {/* The track every item has, and the coral mark that moves
                    along it to whichever screen is in the middle. */}
                <span className="absolute inset-x-0 top-0 h-[3px] rounded-full bg-hairline" aria-hidden="true" />
                {lit && !failed && (
                  <motion.span
                    layoutId="tour-mark"
                    className="absolute inset-x-0 top-0 h-[3px] rounded-full bg-coral"
                    transition={{ duration: 0.45, ease: EASE_SOFT }}
                    aria-hidden="true"
                  />
                )}
                <motion.span
                  key={lit ? "lit" : "dim"}
                  className="block"
                  initial={{ opacity: 0.6, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE_SOFT }}
                >
                  <span className="block text-caption font-semibold uppercase text-muted tnum">0{i + 1}</span>
                  <span className="mt-1 block text-body font-bold">{s.title}</span>
                  <span className="mt-1 block text-label leading-snug text-muted">{s.text}</span>
                </motion.span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Phones: one caption at a time, and dots to jump between screens. */}
      {!failed && (
        <div className="mt-5 flex justify-center gap-1.5 md:hidden">
          {TOUR_SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => gallery.current?.goTo(i)}
              aria-label={`Show ${s.title}`}
              className="grid size-6 place-items-center"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  i === active ? "w-5 bg-coral" : "w-1.5 bg-ink/25",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
