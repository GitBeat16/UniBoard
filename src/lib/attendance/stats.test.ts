import { describe, expect, it } from "vitest";
import { attendanceFromCounts, countSessions, moduleAttendance, officialOf } from "./stats";

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


/**
 * The same fixture the database's attendance_summary() was checked against,
 * inside a rolled-back transaction, as a signed-in student through RLS. The
 * SQL returned A 2/1/2/3, B 32/11/1/2, C 0/0/0/0. If these ever disagree, one
 * of the two has drifted and Home and Timetable will show different numbers.
 */
describe("the database and the app count the same way", () => {
  const now = new Date("2026-09-27T06:00:00Z");
  const day = 86_400_000;
  const ago = (d: number) => new Date(now.getTime() - d * day);

  it("counts every kind of mark", () => {
    const counts = countSessions(
      {
        sessions: [
          { startsAt: ago(1), status: "present" },
          { startsAt: ago(2), status: "late" },
          { startsAt: ago(3), status: "absent" },
          { startsAt: ago(4), status: "excused" },
          { startsAt: ago(5), status: "unknown" },
          { startsAt: ago(6), status: null },
          { startsAt: ago(-1), status: null },
          { startsAt: ago(-2), status: null },
          { startsAt: ago(-3), status: null },
        ],
      },
      now,
    );
    expect(counts).toEqual({ attended: 2, missed: 1, unmarked: 2, remaining: 3 });
  });

  it("starts from the college and cuts off at the end of its day, in UTC", () => {
    const official = officialOf({
      official_attended: 30,
      official_held: 40,
      official_as_of: "2026-09-17",
    });
    const counts = countSessions(
      {
        official,
        sessions: [
          { startsAt: ago(20), status: "present" }, // before: already counted by the college
          { startsAt: new Date("2026-09-17T23:00:00Z"), status: "present" }, // late on the day: still theirs
          { startsAt: new Date("2026-09-18T00:30:00Z"), status: "present" }, // just after: ours
          { startsAt: ago(5), status: "present" },
          { startsAt: ago(3), status: "absent" },
          { startsAt: ago(2), status: null },
          { startsAt: ago(-1), status: null },
          { startsAt: ago(-2), status: null },
        ],
      },
      now,
    );
    expect(counts).toEqual({ attended: 32, missed: 11, unmarked: 1, remaining: 2 });
  });

  it("gives the same verdict from counts as from the classes themselves", () => {
    const meta = { moduleId: "m", name: "DM", code: null, colorToken: "sky", threshold: 75 };
    const sessions = [
      { startsAt: ago(3), status: "present" as const },
      { startsAt: ago(2), status: "absent" as const },
      { startsAt: ago(-2), status: null },
    ];
    expect(attendanceFromCounts(meta, countSessions({ sessions }, now))).toEqual(
      moduleAttendance({ ...meta, sessions }, now),
    );
  });
});
