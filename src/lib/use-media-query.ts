"use client";

import { useSyncExternalStore } from "react";

/**
 * A media query as state. False during SSR and the hydration pass, so markup
 * never disagrees with the server; it settles on the first client render.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
