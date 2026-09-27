"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FPS, HEIGHT, SCENES, SCENE_START, TOTAL_FRAMES, WIDTH, sceneAt } from "@/lib/launch/film";
import { Film } from "./film";

declare global {
  interface Window {
    __film?: { total: number; fps: number; setFrame: (n: number) => void };
  }
}

/**
 * Plays the film in the browser, scaled to fit, with a scrubber and scene
 * marks. With `render`, it shows the bare 1920×1080 frame and hands the
 * frame to tools/render-launch.mjs instead of playing on its own.
 */
export function LaunchPlayer({ render = false }: { render?: boolean }) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(!render);
  const [scale, setScale] = useState(0.5);
  const origin = useRef<{ t: number; f: number } | null>(null);

  // Render mode: the script sets each frame and waits for it to be drawn.
  useEffect(() => {
    if (!render) return;
    window.__film = {
      total: TOTAL_FRAMES,
      fps: FPS,
      setFrame: (n: number) => flushSync(() => setFrame(n)),
    };
  }, [render]);

  // Preview: play in real time.
  useEffect(() => {
    if (render || !playing) return;
    let raf = 0;
    const tick = (now: number) => {
      if (!origin.current) origin.current = { t: now, f: frame };
      const f = origin.current.f + ((now - origin.current.t) / 1000) * FPS;
      if (f >= TOTAL_FRAMES) {
        setFrame(TOTAL_FRAMES - 1);
        setPlaying(false);
        return;
      }
      setFrame(Math.floor(f));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      origin.current = null;
    };
    // `frame` is read only as the starting point when play begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, render]);

  useEffect(() => {
    if (render) return;
    const fit = () => setScale(Math.min((window.innerWidth - 48) / WIDTH, (window.innerHeight - 150) / HEIGHT));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [render]);

  const seek = useCallback((n: number) => {
    setPlaying(false);
    setFrame(Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(n))));
  }, []);

  if (render) return <Film frame={frame} />;

  const s = sceneAt(frame);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#0b0b0b] p-6 text-white">
      <div style={{ width: WIDTH * scale, height: HEIGHT * scale }} className="overflow-hidden rounded-xl shadow-2xl">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <Film frame={frame} />
        </div>
      </div>
      <div className="flex w-full max-w-5xl items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => {
            if (frame >= TOTAL_FRAMES - 1) setFrame(0);
            setPlaying((p) => !p);
          }}
          className="rounded-full bg-white px-5 py-2 font-semibold text-black"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={TOTAL_FRAMES - 1}
            value={frame}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full"
            aria-label="Film position"
          />
          <div className="mt-1 flex">
            {SCENES.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => seek(SCENE_START[sc.id])}
                style={{ width: `${(sc.frames / TOTAL_FRAMES) * 100}%` }}
                className={`truncate border-l border-white/20 px-1 text-left text-[11px] ${s.id === sc.id ? "text-[#f2846b]" : "text-white/50"}`}
              >
                {sc.id}
              </button>
            ))}
          </div>
        </div>
        <span className="w-24 text-right tabular-nums text-white/70">
          {(frame / FPS).toFixed(1)}s / {(TOTAL_FRAMES / FPS).toFixed(0)}s
        </span>
      </div>
    </main>
  );
}
