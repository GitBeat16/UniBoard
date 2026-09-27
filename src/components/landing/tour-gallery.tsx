"use client";

import { useState, useSyncExternalStore } from "react";
import CircularGallery from "@/components/reactbits/CircularGallery";
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
 * list below says the same thing in words. If WebGL won't start, the same
 * stills sit in a plain row you can swipe.
 */
export function TourGallery({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
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
            onError={() => setFailed(true)}
          />
        </div>
      )}

      <ol className="mx-auto mt-10 grid max-w-5xl gap-x-8 gap-y-6 px-5 sm:grid-cols-2 md:px-8 lg:grid-cols-5 lg:px-10">
        {TOUR_SCENES.map((s, i) => (
          <li key={s.id}>
            <p className="text-caption font-semibold uppercase text-muted tnum">0{i + 1}</p>
            <p className="mt-1 text-body font-bold">{s.title}</p>
            <p className="mt-1 text-label leading-snug text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
