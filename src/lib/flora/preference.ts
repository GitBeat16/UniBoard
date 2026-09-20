"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether Flora is showing. Per-browser, not per-account: it is a comfort
 * preference, not data, and a guide you cannot switch off is an irritation
 * rather than a feature.
 *
 * Every localStorage access is wrapped — it throws in private mode and in
 * embedded webviews with site data blocked.
 */
const KEY = "uniboard:flora";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

/** Flora is on by default, including for the hydrating render. */
function getServerSnapshot() {
  return true;
}

export function useFloraEnabled() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setFloraEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Nothing to do — she simply stays on for this browser.
  }
  listeners.forEach((l) => l());
}
