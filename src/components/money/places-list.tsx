"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconLocation, IconPlus, IconWalk } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { EASE_SOFT } from "@/lib/motion";
import { KIND_LABEL, type Place } from "@/lib/places/overpass";

export const LOG_SPEND_EVENT = "uniboard:log-spend";

const FIRST_PAGE = 8;

/**
 * Nearby food, closest walk first. Carries OSM's attribution, which the
 * licence requires wherever its data is shown.
 */
export function PlacesList({ places }: { places: Place[] }) {
  const [vegOnly, setVegOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const filtered = vegOnly ? places.filter((p) => p.veg !== null) : places;
  const shown = showAll ? filtered : filtered.slice(0, FIRST_PAGE);
  const vegKnown = places.some((p) => p.veg !== null);

  return (
    <div className="flex flex-col gap-3">
      {vegKnown && (
        <div className="flex">
          <button
            type="button"
            onClick={() => setVegOnly((v) => !v)}
            aria-pressed={vegOnly}
            className={cn(
              "rounded-full px-4 py-2 text-label font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              vegOnly ? "bg-ink text-paper" : "bg-paper text-ink shadow-soft",
            )}
          >
            <span
              className={cn(
                "mr-2 inline-block size-2 rounded-full align-middle",
                vegOnly ? "bg-leaf-soft" : "bg-leaf",
              )}
              aria-hidden="true"
            />
            Veg-friendly only
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {shown.map((p) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE_SOFT }}
              className="flex items-center gap-3 rounded-tile bg-paper p-4 shadow-soft"
            >
              <div className="grid w-12 shrink-0 place-items-center text-center">
                <IconWalk className="size-5" />
                <span className="mt-0.5 text-label font-bold tnum">{p.walkMin}</span>
                <span className="text-caption text-muted">min</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold">{p.name}</p>
                <p className="truncate text-label text-muted">
                  {KIND_LABEL[p.kind]}
                  {p.cuisine ? ` · ${p.cuisine}` : ""}
                </p>
                {(p.veg || p.hours) && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted">
                    {p.veg && (
                      <span className="rounded-chip bg-leaf-soft px-2 py-0.5 font-semibold uppercase text-ink/80">
                        {p.veg === "only" ? "Pure veg" : "Veg options"}
                      </span>
                    )}
                    {p.hours && <span className="truncate">{p.hours}</span>}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-1.5">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${p.name} in maps`}
                  className="grid size-9 place-items-center rounded-full bg-canvas hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <IconLocation className="size-5" />
                </a>
                <button
                  type="button"
                  aria-label={`Log a spend at ${p.name}`}
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent(LOG_SPEND_EVENT, { detail: { note: p.name } }))
                  }
                  className="grid size-9 place-items-center rounded-full bg-canvas hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <IconPlus className="size-5" />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {filtered.length > FIRST_PAGE && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="self-center rounded-full px-4 py-2 text-label font-semibold underline underline-offset-4 hover:bg-ink/5"
        >
          {showAll ? "Show fewer" : `Show all ${filtered.length}`}
        </button>
      )}

      <p className="px-1 text-caption text-muted">
        Walking times are straight-line estimates. Map data ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          OpenStreetMap contributors
        </a>
        .
      </p>
    </div>
  );
}
