import { describe, expect, it } from "vitest";
import { zonedParts } from "@/lib/time/zone";
import { expandExtraction, type TimetableExtraction } from "./vision";

// The student's zone. Every expectation below is about THEIR wall clock, so
// the tests pass the same on a laptop in Pune and a CI box in UTC.
const TZ = "Asia/Kolkata";
const wall = (d: Date) => zonedParts(d, TZ);

// Monday 21 Sep 2026, 10:00 in Pune.
const FROM = new Date("2026-09-21T04:30:00Z");

const entry = (over: Partial<TimetableExtraction["entries"][number]> = {}) => ({
  moduleName: "Databases",
  code: "CS2004",
  type: "lecture" as const,
  weekday: 1 as number | null, // Monday
  date: null as string | null,
  startTime: "09:00",
  endTime: "10:50",
  room: "Bragg 1.05",
  ...over,
});

const extraction = (
  entries: TimetableExtraction["entries"],
): TimetableExtraction => ({ entries, confidence: "high", notes: null });

describe("expanding a weekly grid", () => {
  it("repeats an entry once per week", () => {
    const out = expandExtraction(extraction([entry()]), { weeks: 4, from: FROM, timeZone: TZ });
    expect(out).toHaveLength(4);

    for (let i = 1; i < out.length; i++) {
      const gap = out[i].start.getTime() - out[i - 1].start.getTime();
      expect(gap).toBe(7 * 24 * 3_600_000);
    }
  });

  it("puts the class on the right weekday, starting from that week's Monday", () => {
    // Wednesday
    const out = expandExtraction(extraction([entry({ weekday: 3 })]), {
      weeks: 1,
      from: FROM,
      timeZone: TZ,
    });
    expect(wall(out[0].start).weekday).toBe(3);
  });

  it("handles Sunday, which is 0 but belongs at the end of a Monday-first week", () => {
    const out = expandExtraction(extraction([entry({ weekday: 0 })]), {
      weeks: 1,
      from: FROM,
      timeZone: TZ,
    });
    expect(wall(out[0].start).weekday).toBe(0);
    // Sunday 27th, not Sunday 20th — the end of the week that starts Mon 21st.
    expect(wall(out[0].start).day).toBe(27);
  });

  it("carries the time of day through", () => {
    const out = expandExtraction(
      extraction([entry({ startTime: "14:30", endTime: "16:00" })]),
      { weeks: 1, from: FROM, timeZone: TZ },
    );
    expect(wall(out[0].start).hour).toBe(14);
    expect(wall(out[0].start).minute).toBe(30);
    expect(wall(out[0].end).hour).toBe(16);
  });
});

describe("dated entries", () => {
  it("uses the date as given and does not repeat it", () => {
    const out = expandExtraction(
      extraction([entry({ weekday: null, date: "2026-10-14" })]),
      { weeks: 8, from: FROM, timeZone: TZ },
    );
    expect(out).toHaveLength(1);
    expect(wall(out[0].start).year).toBe(2026);
    expect(wall(out[0].start).month).toBe(10); // October
    expect(wall(out[0].start).day).toBe(14);
  });

  it("drops an entry with neither a weekday nor a date", () => {
    const out = expandExtraction(extraction([entry({ weekday: null })]), {
      weeks: 4,
      from: FROM,
      timeZone: TZ,
    });
    expect(out).toEqual([]);
  });
});

describe("rejecting misreads rather than storing them", () => {
  it("drops an entry whose end is before its start", () => {
    const out = expandExtraction(
      extraction([entry({ startTime: "15:00", endTime: "09:00" })]),
      { weeks: 4, from: FROM, timeZone: TZ },
    );
    expect(out).toEqual([]);
  });

  it("drops a zero-length class", () => {
    const out = expandExtraction(
      extraction([entry({ startTime: "09:00", endTime: "09:00" })]),
      { weeks: 4, from: FROM, timeZone: TZ },
    );
    expect(out).toEqual([]);
  });

  it("drops an unparseable time without taking the rest of the timetable with it", () => {
    const out = expandExtraction(
      extraction([entry({ startTime: "half nine" }), entry({ moduleName: "Networks" })]),
      { weeks: 2, from: FROM, timeZone: TZ },
    );
    expect(out).toHaveLength(2);
    expect(out.every((s) => s.title === "Networks")).toBe(true);
  });
});

describe("uids", () => {
  it("are stable across runs, so re-uploading updates instead of duplicating", () => {
    const args = { weeks: 3, from: FROM, timeZone: TZ };
    const first = expandExtraction(extraction([entry()]), args);
    const second = expandExtraction(extraction([entry()]), args);
    expect(first.map((s) => s.uid)).toEqual(second.map((s) => s.uid));
  });

  it("are unique within one import", () => {
    const out = expandExtraction(
      extraction([
        entry(),
        entry({ type: "lab", startTime: "14:00", endTime: "16:00" }),
        entry({ moduleName: "Networks", code: "CS2010" }),
      ]),
      { weeks: 5, from: FROM, timeZone: TZ },
    );
    expect(new Set(out.map((s) => s.uid)).size).toBe(out.length);
  });

  it("distinguishes two sessions of the same module at different times", () => {
    const out = expandExtraction(
      extraction([entry(), entry({ startTime: "14:00", endTime: "15:00" })]),
      { weeks: 1, from: FROM, timeZone: TZ },
    );
    expect(out[0].uid).not.toBe(out[1].uid);
  });
});

describe("ordering", () => {
  it("returns sessions in chronological order regardless of input order", () => {
    const out = expandExtraction(
      extraction([
        entry({ weekday: 5, startTime: "16:00", endTime: "17:00" }),
        entry({ weekday: 1 }),
      ]),
      { weeks: 2, from: FROM, timeZone: TZ },
    );
    const times = out.map((s) => s.start.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

describe("time zones", () => {
  it("puts a 09:00 Pune class at 03:30 UTC, whatever zone the server is in", () => {
    const out = expandExtraction(extraction([entry()]), { weeks: 1, from: FROM, timeZone: TZ });
    expect(out[0].start.toISOString()).toBe("2026-09-21T03:30:00.000Z");
  });

  it("uses the student's Monday when their day is already ahead of UTC", () => {
    // Sunday 20 Sep, 20:00 UTC is already Monday 21st, 01:30 in Pune.
    const out = expandExtraction(extraction([entry({ weekday: 1 })]), {
      weeks: 1,
      from: new Date("2026-09-20T20:00:00Z"),
      timeZone: TZ,
    });
    expect(wall(out[0].start).day).toBe(21);
  });
});
