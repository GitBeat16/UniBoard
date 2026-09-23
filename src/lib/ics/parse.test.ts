import { describe, expect, it } from "vitest";
import { parseIcs } from "./parse";

const window = { from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-12-31T00:00:00Z") };

function cal(...events: string[]) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join("\r\n");
}

const vevent = (uid: string, start: string, end: string, extra = "") =>
  [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART${start}`,
    `DTEND${end}`,
    "SUMMARY:Databases",
    ...(extra ? [extra] : []),
    "END:VEVENT",
  ].join("\r\n");

describe("time zones in feeds", () => {
  it("reads a TZID the feed never defined in that zone, not the server's", () => {
    const { sessions } = parseIcs(
      cal(vevent("a", ";TZID=Asia/Kolkata:20260922T090000", ";TZID=Asia/Kolkata:20260922T100000")),
      { ...window, timeZone: "Europe/London" },
    );
    expect(sessions[0].start.toISOString()).toBe("2026-09-22T03:30:00.000Z");
  });

  it("reads a floating time in the student's zone", () => {
    const { sessions } = parseIcs(cal(vevent("b", ":20260922T090000", ":20260922T100000")), {
      ...window,
      timeZone: "Asia/Kolkata",
    });
    expect(sessions[0].start.toISOString()).toBe("2026-09-22T03:30:00.000Z");
  });

  it("leaves UTC times exactly as written", () => {
    const { sessions } = parseIcs(cal(vevent("c", ":20260922T090000Z", ":20260922T100000Z")), {
      ...window,
      timeZone: "Asia/Kolkata",
    });
    expect(sessions[0].start.toISOString()).toBe("2026-09-22T09:00:00.000Z");
  });

  it("keeps a weekly floating class at the same wall time every week", () => {
    const { sessions } = parseIcs(
      cal(vevent("d", ":20260922T090000", ":20260922T100000", "RRULE:FREQ=WEEKLY;COUNT=3")),
      { ...window, timeZone: "Asia/Kolkata" },
    );
    expect(sessions.map((s) => s.start.toISOString())).toEqual([
      "2026-09-22T03:30:00.000Z",
      "2026-09-29T03:30:00.000Z",
      "2026-10-06T03:30:00.000Z",
    ]);
  });
});

describe("uids", () => {
  it("keeps two overrides of one recurring event apart", () => {
    // A rescheduled week repeats its parent's UID and is told apart by
    // RECURRENCE-ID. Without that, both weeks claim the same row.
    const { sessions } = parseIcs(
      cal(
        vevent(
          "db",
          ";TZID=Asia/Kolkata:20260922T110000",
          ";TZID=Asia/Kolkata:20260922T120000",
          "RECURRENCE-ID;TZID=Asia/Kolkata:20260922T090000",
        ),
        vevent(
          "db",
          ";TZID=Asia/Kolkata:20260929T110000",
          ";TZID=Asia/Kolkata:20260929T120000",
          "RECURRENCE-ID;TZID=Asia/Kolkata:20260929T090000",
        ),
      ),
      { ...window, timeZone: "Asia/Kolkata" },
    );
    expect(sessions).toHaveLength(2);
    expect(sessions[0].uid).not.toBe(sessions[1].uid);
  });

  it("gives an entry with no UID one of its own", () => {
    const raw = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "DTSTART;TZID=Asia/Kolkata:20260922T090000",
      "DTEND;TZID=Asia/Kolkata:20260922T100000",
      "SUMMARY:Databases",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART;TZID=Asia/Kolkata:20260923T090000",
      "DTEND;TZID=Asia/Kolkata:20260923T100000",
      "SUMMARY:Databases",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const { sessions } = parseIcs(raw, { ...window, timeZone: "Asia/Kolkata" });
    expect(sessions).toHaveLength(2);
    expect(new Set(sessions.map((s) => s.uid)).size).toBe(2);
  });
});
