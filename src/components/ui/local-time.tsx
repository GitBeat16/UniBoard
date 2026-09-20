"use client";

import { useNow } from "@/lib/use-now";

/**
 * Renders a date in the VIEWER's locale and timezone — never the server's.
 *
 * Server-rendered dates are a trap twice over: Node formats 14:00 where the
 * browser formats 02:00 PM, and on Vercel the server runs in UTC while the
 * student is not. Both produce hydration mismatches, and the second quietly
 * shows the wrong day near midnight.
 *
 * So nothing is rendered until mount. useNow() returns 0 for the server
 * snapshot and for the hydrating render, which is what keeps the two in
 * agreement; the real time appears a tick later, under the card's own fade-in.
 */
export function LocalTime({
  iso,
  mode = "time",
  className,
}: {
  iso: string;
  mode?: "time" | "when" | "dayLong";
  className?: string;
}) {
  const now = useNow();

  if (now === 0) {
    // Reserves a line box so nothing jumps when the text lands.
    return <span className={className}>&nbsp;</span>;
  }

  return (
    <span className={className} suppressHydrationWarning>
      {format(iso, mode, now)}
    </span>
  );
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function format(iso: string, mode: "time" | "when" | "dayLong", now: number) {
  const d = new Date(iso);

  if (mode === "time") return formatTime(iso);

  if (mode === "dayLong") {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThat = new Date(d);
  startOfThat.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (startOfThat.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  const time = formatTime(iso);
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Tomorrow, ${time}`;
  if (diffDays === -1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${time}`;
}
