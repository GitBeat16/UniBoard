import ICAL from "ical.js";

export type ParsedSession = {
  /** Stable per occurrence, so re-importing updates rather than duplicates. */
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
};

export type ParseResult = {
  sessions: ParsedSession[];
  /** Events we could not read. Surfaced rather than silently dropped. */
  skipped: number;
  truncated: boolean;
};

/** Belt and braces against a recurrence rule with no UNTIL and no COUNT. */
const HARD_ITERATION_CAP = 20_000;

/**
 * Expand an ICS calendar into concrete session occurrences inside a window.
 *
 * Pure: text in, sessions out. No database, no clock of its own — the caller
 * supplies the window, which is what makes this testable.
 *
 * Timezone note: TZID references resolve only when the feed ships the matching
 * VTIMEZONE. Feeds that omit it produce floating times, which ical.js reads in
 * the runtime's local zone. That is the common case for university feeds and
 * is the right answer for a student sitting in that timezone.
 */
export function parseIcs(
  text: string,
  { from, to, maxEvents = 2000 }: { from: Date; to: Date; maxEvents?: number },
): ParseResult {
  const sessions: ParsedSession[] = [];
  let skipped = 0;
  let truncated = false;

  const root = new ICAL.Component(ICAL.parse(text));

  // Register any timezones the feed defines, so TZID actually resolves.
  for (const vtz of root.getAllSubcomponents("vtimezone")) {
    try {
      const tz = new ICAL.Timezone(vtz);
      if (!ICAL.TimezoneService.has(tz.tzid)) ICAL.TimezoneService.register(tz);
    } catch {
      // A malformed VTIMEZONE should not sink the whole import.
    }
  }

  const vevents = root.getAllSubcomponents("vevent");

  outer: for (const vevent of vevents) {
    let event: ICAL.Event;
    try {
      event = new ICAL.Event(vevent);
      if (!event.startDate || !event.endDate) {
        skipped++;
        continue;
      }
    } catch {
      skipped++;
      continue;
    }

    const base = {
      title: (event.summary ?? "Untitled").trim(),
      description: event.description?.trim() || undefined,
      location: event.location?.trim() || undefined,
    };

    if (!event.isRecurring()) {
      const start = event.startDate.toJSDate();
      const end = event.endDate.toJSDate();
      if (end >= from && start <= to) {
        sessions.push({ uid: event.uid, ...base, start, end });
      }
      if (sessions.length >= maxEvents) {
        truncated = true;
        break;
      }
      continue;
    }

    const iterator = event.iterator();
    let steps = 0;

    for (let next = iterator.next(); next; next = iterator.next()) {
      if (++steps > HARD_ITERATION_CAP) {
        truncated = true;
        break;
      }

      const startDate = next.toJSDate();
      if (startDate > to) break;

      let occurrence;
      try {
        occurrence = event.getOccurrenceDetails(next);
      } catch {
        skipped++;
        continue;
      }

      const start = occurrence.startDate.toJSDate();
      const end = occurrence.endDate.toJSDate();
      if (end < from) continue;

      sessions.push({
        // The recurrence id is what makes each occurrence individually
        // addressable — without it a re-import collapses a whole term into one row.
        uid: `${event.uid}::${occurrence.recurrenceId.toString()}`,
        ...base,
        start,
        end,
      });

      if (sessions.length >= maxEvents) {
        truncated = true;
        break outer;
      }
    }
  }

  sessions.sort((a, b) => a.start.getTime() - b.start.getTime());
  return { sessions, skipped, truncated };
}
