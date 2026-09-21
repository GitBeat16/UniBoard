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
