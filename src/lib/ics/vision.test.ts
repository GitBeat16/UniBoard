import { describe, expect, it } from "vitest";
import { expandExtraction, type TimetableExtraction } from "./vision";

// A Monday, so weekday maths is easy to reason about.
const FROM = new Date("2026-09-21T10:00:00");

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
    const out = expandExtraction(extraction([entry()]), { weeks: 4, from: FROM });
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
    });
    expect(out[0].start.getDay()).toBe(3);
  });

  it("handles Sunday, which is 0 but belongs at the end of a Monday-first week", () => {
    const out = expandExtraction(extraction([entry({ weekday: 0 })]), {
      weeks: 1,
      from: FROM,
    });
    expect(out[0].start.getDay()).toBe(0);
    // Sunday 27th, not Sunday 20th — the end of the week that starts Mon 21st.
    expect(out[0].start.getDate()).toBe(27);
  });

  it("carries the time of day through", () => {
    const out = expandExtraction(
      extraction([entry({ startTime: "14:30", endTime: "16:00" })]),
      { weeks: 1, from: FROM },
    );
    expect(out[0].start.getHours()).toBe(14);
    expect(out[0].start.getMinutes()).toBe(30);
    expect(out[0].end.getHours()).toBe(16);
  });
});

describe("dated entries", () => {
  it("uses the date as given and does not repeat it", () => {
    const out = expandExtraction(
      extraction([entry({ weekday: null, date: "2026-10-14" })]),
      { weeks: 8, from: FROM },
    );
    expect(out).toHaveLength(1);
    expect(out[0].start.getFullYear()).toBe(2026);
    expect(out[0].start.getMonth()).toBe(9); // October
    expect(out[0].start.getDate()).toBe(14);
  });

  it("drops an entry with neither a weekday nor a date", () => {
    const out = expandExtraction(extraction([entry({ weekday: null })]), {
      weeks: 4,
      from: FROM,
    });
    expect(out).toEqual([]);
  });
});

describe("rejecting misreads rather than storing them", () => {
  it("drops an entry whose end is before its start", () => {
    const out = expandExtraction(
      extraction([entry({ startTime: "15:00", endTime: "09:00" })]),
      { weeks: 4, from: FROM },
    );
    expect(out).toEqual([]);
  });

  it("drops a zero-length class", () => {
    const out = expandExtraction(
      extraction([entry({ startTime: "09:00", endTime: "09:00" })]),
      { weeks: 4, from: FROM },
    );
    expect(out).toEqual([]);
  });

  it("drops an unparseable time without taking the rest of the timetable with it", () => {
    const out = expandExtraction(
      extraction([entry({ startTime: "half nine" }), entry({ moduleName: "Networks" })]),
      { weeks: 2, from: FROM },
    );
    expect(out).toHaveLength(2);
    expect(out.every((s) => s.title === "Networks")).toBe(true);
  });
});

describe("uids", () => {
  it("are stable across runs, so re-uploading updates instead of duplicating", () => {
    const args = { weeks: 3, from: FROM };
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
      { weeks: 5, from: FROM },
    );
    expect(new Set(out.map((s) => s.uid)).size).toBe(out.length);
  });

  it("distinguishes two sessions of the same module at different times", () => {
    const out = expandExtraction(
      extraction([entry(), entry({ startTime: "14:00", endTime: "15:00" })]),
      { weeks: 1, from: FROM },
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
      { weeks: 2, from: FROM },
    );
    const times = out.map((s) => s.start.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
