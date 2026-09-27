"use client";

import { useSyncExternalStore } from "react";

/**
 * Two switches, kept per-browser rather than per-account: they are comfort
 * preferences, not data, and they should follow the room you are in — sound
 * off in a lecture, on at your desk — rather than your login.
 *
 * Every localStorage access is wrapped: it throws in private mode and in
 * embedded webviews with site data blocked.
 */

const VISIBLE = "uniboard:flora";
const SOUND = "uniboard:flora-sound";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string, fallback: boolean) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === "on";
  } catch {
    return fallback;
  }
}

function write(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? "on" : "off");
  } catch {
    // Nothing to do — the setting simply does not persist in this browser.
  }
  listeners.forEach((l) => l());
}

/** Flora is on by default, including for the hydrating render. */
export function useFloraEnabled() {
  return useSyncExternalStore(
    subscribe,
    () => read(VISIBLE, true),
    () => true,
  );
}

export function setFloraEnabled(on: boolean) {
  write(VISIBLE, on);
}

/**
 * Her voice is off by default, and stays off until it is asked for.
 *
 * A page that makes a noise on arrival is a page people close. She offers the
 * switch once she has something to say, and remembers the answer.
 */
export function useFloraSound() {
  return useSyncExternalStore(
    subscribe,
    () => read(SOUND, false),
    () => false,
  );
}

export function setFloraSound(on: boolean) {
  write(SOUND, on);
}
