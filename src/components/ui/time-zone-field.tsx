"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";

/**
 * A hidden `tz` field carrying the browser's IANA zone ("Asia/Kolkata"), so a
 * Server Action can read wall-clock inputs — a datetime-local, "Monday 09:00"
 * — as the student means them. Empty during SSR; the server falls back to
 * FALLBACK_TIME_ZONE if a form is ever submitted before hydration.
 */
export function TimeZoneField() {
  const tz = useSyncExternalStore(noop, browserZone, () => "");
  return <input type="hidden" name="tz" value={tz} />;
}
