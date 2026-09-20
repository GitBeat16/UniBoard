/**
 * Minimal RFC 5545 writer for the outgoing subscription feed.
 *
 * Hand-rolled on purpose: the whole job is escaping and line folding, and
 * those are exactly the two things that make a feed silently fail to import
 * in Google Calendar. Pure, so both are unit-tested.
 */

export type FeedEvent = {
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  description?: string | null;
};

const CRLF = "\r\n";

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newline are special. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * RFC 5545 §3.1: no line may exceed 75 octets. Continuations start with a
 * single space. Folding is counted in BYTES, not characters — a module name
 * with an accent in it will break a naive character-based fold.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  // Continuation lines carry a leading space, so they have one byte less room.
  let limit = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > limit) {
      out.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += size;
  }
  if (current) out.push(current);

  return out.join(`${CRLF} `);
}

/** UTC basic format: 20260920T140000Z */
export function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(
  events: FeedEvent[],
  { name, stamp }: { name: string; stamp: Date },
): string {
  const dtstamp = toIcsDate(stamp.toISOString());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UniBoard//Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    // Hints to the client how often to re-poll. Google treats it as advisory.
    "REFRESH-INTERVAL;VALUE=DURATION:PT2H",
    "X-PUBLISHED-TTL:PT2H",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      // Must be globally unique and stable, or every refresh duplicates events.
      `UID:${escapeText(event.uid)}@uniboard`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${toIcsDate(event.startsAt)}`,
      `DTEND:${toIcsDate(event.endsAt)}`,
      `SUMMARY:${escapeText(event.title)}`,
    );
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join(CRLF) + CRLF;
}
