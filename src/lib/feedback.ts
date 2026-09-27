/**
 * What a tap feels like: a vibration pattern per kind of tap.
 *
 * Kept tiny on purpose. An ordinary button gets the shortest buzz a phone can
 * make — a confirmation, not a notification — and Flora gets a little double
 * bump, so poking her feels like poking something alive.
 */
export type TapKind = "tap" | "flora";

export const HAPTIC: Record<TapKind, number | number[]> = {
  tap: 8,
  flora: [10, 45, 16],
};

/** What was tapped, from the element under the pointer. Null means leave it alone. */
export function tapKindOf(target: Element | null): TapKind | null {
  const hit = target?.closest<HTMLElement>(
    'button, a[href], [role="button"], summary, label, input[type="checkbox"], input[type="radio"], input[type="submit"]',
  );
  if (!hit) return null;
  if (hit.matches(":disabled") || hit.getAttribute("aria-disabled") === "true") return null;

  const marked = hit.closest<HTMLElement>("[data-feedback]")?.dataset.feedback;
  if (marked === "none") return null;
  if (marked === "flora") return "flora";
  return "tap";
}

/** Vibrate, where the browser allows it. Never throws. */
export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when called outside a gesture. Nothing to do.
  }
}
