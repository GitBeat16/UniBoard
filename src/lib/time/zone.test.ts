import { describe, expect, it } from "vitest";
import {
  addDays,
  offsetMinutes,
  parseLocalDateTime,
  wallTimeToInstant,
  wallToday,
  weekdayOf,
  zoneOrFallback,
  zonedParts,
} from "./zone";

describe("wallTimeToInstant", () => {
  it("turns 09:00 in Pune into 03:30 UTC — the bug this fixes", () => {
    const t = wallTimeToInstant({ year: 2026, month: 9, day: 22, hour: 9, minute: 0 }, "Asia/Kolkata");
    expect(t.toISOString()).toBe("2026-09-22T03:30:00.000Z");
  });

  it("follows British Summer Time either side of the change", () => {
    const summer = wallTimeToInstant({ year: 2026, month: 10, day: 23, hour: 9, minute: 0 }, "Europe/London");
    const winter = wallTimeToInstant({ year: 2026, month: 10, day: 26, hour: 9, minute: 0 }, "Europe/London");
    expect(summer.toISOString()).toBe("2026-10-23T08:00:00.000Z");
    expect(winter.toISOString()).toBe("2026-10-26T09:00:00.000Z");
  });

  it("lands a time skipped by spring-forward just after the gap", () => {
    // 29 Mar 2026, 01:00→02:00 in London. 01:30 does not exist.
    const t = wallTimeToInstant({ year: 2026, month: 3, day: 29, hour: 1, minute: 30 }, "Europe/London");
    expect(zonedParts(t, "Europe/London").hour).toBe(2);
  });

  it("round-trips through zonedParts", () => {
    const wall = { year: 2027, month: 2, day: 14, hour: 18, minute: 45 };
    const p = zonedParts(wallTimeToInstant(wall, "America/New_York"), "America/New_York");
    expect(p).toMatchObject(wall);
  });
});

describe("offsetMinutes", () => {
  it("knows India is UTC+5:30", () => {
    expect(offsetMinutes(new Date("2026-09-22T00:00:00Z"), "Asia/Kolkata")).toBe(330);
  });
});

describe("wall dates", () => {
  it("adds days across month ends", () => {
    expect(addDays({ year: 2026, month: 9, day: 29 }, 3)).toEqual({ year: 2026, month: 10, day: 2 });
  });
  it("knows 21 Sep 2026 is a Monday", () => {
    expect(weekdayOf({ year: 2026, month: 9, day: 21 })).toBe(1);
  });
  it("gives the student's today, not the server's", () => {
    // 20:00 UTC on the 21st is already the 22nd in Pune.
    expect(wallToday(new Date("2026-09-21T20:00:00Z"), "Asia/Kolkata")).toEqual({
      year: 2026,
      month: 9,
      day: 22,
    });
  });
});

describe("parseLocalDateTime", () => {
  it("reads a datetime-local value in the student's zone", () => {
    expect(parseLocalDateTime("2026-09-25T14:00", "Asia/Kolkata")?.toISOString()).toBe(
      "2026-09-25T08:30:00.000Z",
    );
  });
  it("rejects nonsense", () => {
    expect(parseLocalDateTime("tomorrow", "Asia/Kolkata")).toBeNull();
    expect(parseLocalDateTime("2026-13-01T10:00", "Asia/Kolkata")).toBeNull();
  });
});

describe("zoneOrFallback", () => {
  it("keeps a real zone and replaces junk", () => {
    expect(zoneOrFallback("Europe/London")).toBe("Europe/London");
    expect(zoneOrFallback("Mars/Olympus")).toBe("Asia/Kolkata");
    expect(zoneOrFallback(undefined)).toBe("Asia/Kolkata");
  });
});
