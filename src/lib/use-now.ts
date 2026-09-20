"use client";

import { useSyncExternalStore } from "react";

/**
 * A clock that is safe to read during render.
 *
 * Calling Date.now() in a component body is impure, and reading it during SSR
 * produces markup that disagrees with the client. useSyncExternalStore solves
 * both: the server snapshot is 0, the client snapshot is the current minute.
 *
 * Rounding to the minute matters — getSnapshot must return the same value on
 * repeated calls or React re-renders forever.
 *
 * It also earns its keep at runtime: "I went / I missed it" appears on a class
 * the moment it starts, without the student reloading the page.
 */
const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}

function clientSnapshot() {
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}

function serverSnapshot() {
  return 0;
}

/** Returns 0 until mounted, then the current time rounded to the minute. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
