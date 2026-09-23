import { describe, expect, it } from "vitest";
import { moduleAttendance } from "./stats";

describe("counting from the college's own figure", () => {
  const asOf = new Date("2026-09-20T00:00:00Z");
  const base = {
    moduleId: "m1",
    name: "DM",
    code: null,
    colorToken: "sky",
    threshold: 75,
  };

  it("starts from what the college counted", () => {
    const out = moduleAttendance(
      { ...base, sessions: [], official: { attended: 30, held: 40, asOf } },
      new Date("2026-09-24T12:00:00Z"),
    );
    expect(out.attended).toBe(30);
    expect(out.held).toBe(40);
    expect(out.percent).toBe(75);
  });

  it("adds only what happened after the college counted", () => {
    const out = moduleAttendance(
      {
        ...base,
        official: { attended: 30, held: 40, asOf },
        sessions: [
          // Already inside the college's 40 — counting it again would double it.
          { startsAt: new Date("2026-09-18T09:00:00Z"), status: "present" },
          { startsAt: new Date("2026-09-22T09:00:00Z"), status: "present" },
          { startsAt: new Date("2026-09-23T09:00:00Z"), status: "absent" },
        ],
      },
      new Date("2026-09-24T12:00:00Z"),
    );
    expect(out.attended).toBe(31);
    expect(out.held).toBe(42);
  });

  it("does not count an old class as unmarked", () => {
    // Classes before the cut-off were counted by the college, marked or not,
    // so nagging her to mark them would be asking for work that changes nothing.
    const out = moduleAttendance(
      {
        ...base,
        official: { attended: 30, held: 40, asOf },
        sessions: [{ startsAt: new Date("2026-09-15T09:00:00Z"), status: null }],
      },
      new Date("2026-09-24T12:00:00Z"),
    );
    expect(out.unmarked).toBe(0);
  });

  it("still counts classes to come, so the advice looks forward", () => {
    const out = moduleAttendance(
      {
        ...base,
        official: { attended: 30, held: 40, asOf },
        sessions: [{ startsAt: new Date("2026-10-01T09:00:00Z"), status: null }],
      },
      new Date("2026-09-24T12:00:00Z"),
    );
    expect(out.remaining).toBe(1);
    expect(out.canMissMore).toBe(0); // 30/41 is already under 75
  });

  it("says when the figure was taken, so the screen can too", () => {
    const out = moduleAttendance(
      { ...base, sessions: [], official: { attended: 1, held: 1, asOf } },
      new Date("2026-09-24T12:00:00Z"),
    );
    expect(out.officialAsOf).toEqual(asOf);
  });

  it("changes nothing when there is no imported figure", () => {
    const sessions = [{ startsAt: new Date("2026-09-22T09:00:00Z"), status: "present" as const }];
    expect(moduleAttendance({ ...base, sessions }, new Date("2026-09-24T12:00:00Z"))).toMatchObject({
      attended: 1,
      held: 1,
      officialAsOf: null,
    });
  });
});
