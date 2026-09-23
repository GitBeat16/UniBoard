"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { LAYOUT_SPRING } from "@/lib/motion";

export type Chapter = { at: number; title: string; text: string };

/**
 * The tour: a real recording of the app (sample data), looping silently in a
 * phone frame. The chapter list beside it follows the video, and clicking a
 * chapter jumps there — so it works as a video and as a table of contents.
 *
 * Respects prefers-reduced-motion by not autoplaying; the poster and the
 * chapter list still tell the whole story.
 */
export function TourVideo({ chapters, className }: { chapters: Chapter[]; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.removeAttribute("autoplay");
      v.pause();
    }
    const onTime = () => {
      let idx = 0;
      chapters.forEach((c, i) => {
        if (v.currentTime >= c.at) idx = i;
      });
      setCurrent(idx);
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [chapters]);

  function jump(i: number) {
    const v = video.current;
    if (!v) return;
    v.currentTime = chapters[i].at + 0.05;
    setCurrent(i);
    void v.play().catch(() => {});
  }

  return (
    <div className={cn("flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-14", className)}>
      {/* A phone, drawn in CSS: the recording is phone-shaped. */}
      <div className="relative w-[18.5rem] shrink-0 rounded-[2.75rem] bg-ink p-2.5 shadow-lift sm:w-[20rem]">
        <video
          ref={video}
          className="aspect-[390/844] w-full rounded-[2.25rem] bg-canvas object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/uniboard-tour.jpg"
          aria-label="A tour of UniBoard: importing a timetable, attendance, the Skip Advisor, the soft board, and money."
        >
          <source src="/media/uniboard-tour.webm" type="video/webm" />
          <source src="/media/uniboard-tour.mp4" type="video/mp4" />
        </video>
      </div>

      <ol className="flex w-full max-w-md flex-col gap-2">
        {chapters.map((c, i) => (
          <li key={c.title}>
            <button
              type="button"
              onClick={() => jump(i)}
              aria-current={current === i ? "step" : undefined}
              className="relative w-full rounded-tile px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {current === i && (
                <motion.span
                  layoutId="tour-chapter"
                  transition={LAYOUT_SPRING}
                  className="absolute inset-0 rounded-tile bg-paper shadow-soft"
                />
              )}
              <span className="relative flex items-baseline gap-3">
                <span className={cn("text-caption font-bold tnum", current === i ? "text-coral" : "text-muted")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-body font-bold">{c.title}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-label transition-colors",
                      current === i ? "text-ink/80" : "text-muted",
                    )}
                  >
                    {c.text}
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
