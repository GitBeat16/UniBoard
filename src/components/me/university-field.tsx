"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { EASE_SOFT } from "@/lib/motion";
import { nameKey, tidyUniversityName } from "@/lib/university/names";
import { searchUniversities, type UniversityHit } from "@/app/(app)/me/actions";

const field =
  "h-12 w-full rounded-full bg-canvas px-5 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

/**
 * Pick your university from the shared list, or add it. Suggestions match
 * however the name is typed — capitals, spacing and punctuation don't matter,
 * and the short name works too ("pict").
 */
export function UniversityField({
  initial,
  onPick,
}: {
  initial: { id: string | null; name: string; shortName: string | null };
  /** Called with the university's default threshold when one is chosen. */
  onPick?: (hit: UniversityHit) => void;
}) {
  const [text, setText] = useState(initial.name);
  const [selected, setSelected] = useState<UniversityHit | null>(
    initial.id ? { id: initial.id, name: initial.name, shortName: initial.shortName, threshold: 75 } : null,
  );
  const [hits, setHits] = useState<UniversityHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, startSearch] = useTransition();
  const listId = useId();
  const reqId = useRef(0);

  // Debounced search. Only the latest request's answer is kept.
  useEffect(() => {
    if (selected || nameKey(text).length < 2) return;
    const id = ++reqId.current;
    const t = window.setTimeout(() => {
      startSearch(async () => {
        const found = await searchUniversities(text);
        if (id === reqId.current) {
          setHits(found);
          setActive(-1);
        }
      });
    }, 220);
    return () => window.clearTimeout(t);
  }, [text, selected]);

  const typedKey = nameKey(text);
  const exact = selected ? null : hits.find((h) => nameKey(h.name) === typedKey) ?? null;
  const isNew = !selected && !exact && typedKey.length >= 3 && !searching;
  const showList = open && !selected && hits.length > 0;

  function pick(hit: UniversityHit) {
    setSelected(hit);
    setText(hit.name);
    setOpen(false);
    onPick?.(hit);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? hits.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(hits[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name="universityId" value={selected?.id ?? exact?.id ?? ""} />
      <input
        name="universityName"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSelected(null);
          setOpen(true);
          if (nameKey(e.target.value).length < 2) setHits([]);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="University — e.g. PICT, Pune"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className={field}
      />

      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE_SOFT }}
            className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-tile bg-paper shadow-lift"
          >
            {hits.map((h, i) => (
              <li
                key={h.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(h)}
                className={cn(
                  "flex cursor-pointer items-baseline justify-between gap-3 px-5 py-3 text-body",
                  i === active ? "bg-canvas" : "hover:bg-canvas",
                )}
              >
                <span className="truncate">{h.name}</span>
                {h.shortName && (
                  <span className="shrink-0 text-caption font-semibold uppercase text-muted">
                    {h.shortName}
                  </span>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Say what Save will do before it is pressed. */}
      <p className="mt-1.5 px-2 text-caption text-muted" aria-live="polite">
        {selected ? (
          <>Shared with everyone who picks {selected.shortName ?? "it"}.</>
        ) : exact ? (
          <>
            Matches <span className="font-semibold text-ink">{exact.name}</span> — you&rsquo;ll join
            it.
          </>
        ) : isNew ? (
          <>
            New — it&rsquo;ll be added as{" "}
            <span className="font-semibold text-ink">{tidyUniversityName(text)}</span> for
            classmates to join.
          </>
        ) : (
          <>Classmates at the same university share campus events on the Board.</>
        )}
      </p>

      {isNew && (
        <input
          name="universityShort"
          maxLength={16}
          placeholder="Short name, if it has one (PICT)"
          aria-label="Short name for the university"
          className={cn(field, "mt-3")}
        />
      )}
    </div>
  );
}
