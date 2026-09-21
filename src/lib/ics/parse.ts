import ICAL from "ical.js";
import { isValidTimeZone, wallTimeToInstant } from "@/lib/time/zone";

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
 * VTIMEZONE. Feeds that omit it — common for university feeds — produce
 * "floating" times, which ical.js would read in the *runtime's* zone. On the
 * server that is UTC, so a 09:00 class in Pune landed at 14:30. Floating
 * times are instead read in the TZID the feed named, if it is a real IANA
 * zone, and otherwise in the student's own zone (`timeZone`).
 */
export function parseIcs(
  text: string,
  {
    from,
    to,
    maxEvents = 2000,
    timeZone,
  }: { from: Date; to: Date; maxEvents?: number; timeZone: string },
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
      const start = toInstant(event.startDate, timeZone);
      const end = toInstant(event.endDate, timeZone);
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

      const startDate = toInstant(next, timeZone);
      if (startDate > to) break;

      let occurrence;
      try {
        occurrence = event.getOccurrenceDetails(next);
      } catch {
        skipped++;
        continue;
      }

      const start = toInstant(occurrence.startDate, timeZone);
      const end = toInstant(occurrence.endDate, timeZone);
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

/**
 * An ICAL.Time as an instant. UTC and zones the feed defined are exact; a
 * floating time is a wall-clock time and needs a zone to mean anything.
 */
export function toInstant(t: ICAL.Time, fallbackZone: string): Date {
  if (t.zone && t.zone !== ICAL.Timezone.localTimezone) return t.toJSDate();

  const named = (t as unknown as { timezone?: string }).timezone;
  const zone = isValidTimeZone(named) ? named : fallbackZone;
  return wallTimeToInstant(
    {
      year: t.year,
      month: t.month,
      day: t.day,
      hour: t.isDate ? 0 : t.hour,
      minute: t.isDate ? 0 : t.minute,
    },
    zone,
  );
}
