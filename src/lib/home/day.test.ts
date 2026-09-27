import { describe, expect, it } from "vitest";
import {
  markStreak,
  nowPosition,
  skyArc,
  skyPhase,
  stateOf,
  todayTimeline,
  weekStrip,
  type DaySession,
} from "./day";

// Local times throughout: these functions run in the viewer's clock.
const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m);
let n = 0;
const cls = (
  d: number,
  h: number,
  m: number,
  mins: number,
  status: DaySession["status"] = null,
): DaySession => ({
  id: `s${n++}`,
  startsAt: at(d, h, m),
  endsAt: new Date(at(d, h, m).getTime() + mins * 60_000),
  status,
});

// Thursday 24 September 2026, 13:00.
const NOW = at(24, 13);

describe("a class's state", () => {
  it("reads marks, and time when there is no mark", () => {
    expect(stateOf(cls(24, 10, 0, 60, "present"), NOW)).toBe("attended");
    expect(stateOf(cls(24, 10, 0, 60, "late"), NOW)).toBe("attended");
    expect(stateOf(cls(24, 10, 0, 60, "absent"), NOW)).toBe("missed");
    expect(stateOf(cls(24, 10, 0, 60), NOW)).toBe("unmarked");
    expect(stateOf(cls(24, 12, 45, 60), NOW)).toBe("now");
    expect(stateOf(cls(24, 15, 0, 60), NOW)).toBe("later");
  });
});

describe("today's timeline", () => {
  const day = [
    cls(24, 10, 0, 60, "present"),
    cls(24, 11, 0, 60, "present"),
    cls(24, 12, 45, 60),
    cls(24, 13, 45, 60),
    cls(24, 15, 0, 60),
    cls(23, 10, 0, 60), // yesterday: not today's
  ];

  it("keeps only today, in order", () => {
    const classes = todayTimeline(day, NOW).filter((i) => i.kind === "class");
    expect(classes).toHaveLength(5);
  });

  it("names lunch and leaves a back-to-back change alone", () => {
    const gaps = todayTimeline(day, NOW).filter((i) => i.kind === "gap");
    // 12:00–12:45 is lunch; 11:00→12:00 back to back is no gap; 14:45–15:00 is a break.
    expect(gaps.map((g) => g.kind === "gap" && g.label)).toEqual(["Lunch", "Break"]);
  });

  it("calls a long gap free time", () => {
    const gaps = todayTimeline([cls(24, 9, 0, 60), cls(24, 14, 0, 60)], NOW).filter(
      (i) => i.kind === "gap",
    );
    expect(gaps[0]).toMatchObject({ label: "Free" });
  });

  it("puts now partway across the day, and nowhere outside it", () => {
    const p = nowPosition(day, NOW)!;
    expect(p).toBeGreaterThan(0.4);
    expect(p).toBeLessThan(0.6);
    expect(nowPosition(day, at(24, 8))).toBe(null);
    expect(nowPosition(day, at(24, 18))).toBe(null);
    expect(nowPosition([], NOW)).toBe(null);
  });
});

describe("the week strip", () => {
  it("runs Monday to Sunday around today", () => {
    const week = weekStrip([], NOW);
    expect(week.map((d) => d.letter).join("")).toBe("MTWTFSS");
    expect(week[0].date.getDate()).toBe(21);
    expect(week.find((d) => d.isToday)?.date.getDate()).toBe(24);
  });

  it("counts classes and marks a day complete only when all is marked", () => {
    const week = weekStrip(
      [
        cls(21, 10, 0, 60, "present"),
        cls(21, 11, 0, 60, "absent"),
        cls(22, 10, 0, 60, "present"),
        cls(22, 11, 0, 60),
        cls(24, 15, 0, 60),
      ],
      NOW,
    );
    expect(week[0]).toMatchObject({ count: 2, complete: true });
    expect(week[1]).toMatchObject({ count: 2, complete: false });
    // Today still has a class to come: not complete, whatever else is marked.
    expect(week[3]).toMatchObject({ count: 1, complete: false });
  });
});

describe("the marking streak", () => {
  it("counts back through fully marked days", () => {
    const s = [cls(21, 10, 0, 60, "present"), cls(22, 10, 0, 60, "absent"), cls(23, 10, 0, 60, "present")];
    expect(markStreak(s, NOW)).toBe(3);
  });

  it("does not let a weekend break it", () => {
    const s = [cls(18, 10, 0, 60, "present"), cls(21, 10, 0, 60, "present"), cls(23, 10, 0, 60, "present")];
    expect(markStreak(s, NOW)).toBe(3);
  });

  it("stops at the first day with something unmarked", () => {
    const s = [cls(21, 10, 0, 60, "present"), cls(22, 10, 0, 60), cls(23, 10, 0, 60, "present")];
    expect(markStreak(s, NOW)).toBe(1);
  });

  it("does not count today until today is marked, and does not break on it either", () => {
    const yesterday = cls(23, 10, 0, 60, "present");
    expect(markStreak([yesterday, cls(24, 10, 0, 60)], NOW)).toBe(1);
    expect(markStreak([yesterday, cls(24, 10, 0, 60, "present")], NOW)).toBe(2);
  });

  it("treats 'unknown' as not marked", () => {
    expect(markStreak([cls(23, 10, 0, 60, "unknown")], NOW)).toBe(0);
  });

  it("is zero with nothing to go on", () => {
    expect(markStreak([], NOW)).toBe(0);
  });
});

describe("the sky", () => {
  it("follows the clock", () => {
    expect([6, 12, 18, 22, 3].map(skyPhase)).toEqual(["dawn", "day", "dusk", "night", "night"]);
  });

  it("moves the sun and the moon across their arcs", () => {
    expect(skyArc(6)).toBe(0);
    expect(skyArc(12, 30)).toBeCloseTo(0.5);
    expect(skyArc(19)).toBe(0);
    expect(skyArc(0, 30)).toBeCloseTo(0.5);
    for (let h = 0; h < 24; h++) {
      expect(skyArc(h)).toBeGreaterThanOrEqual(0);
      expect(skyArc(h)).toBeLessThanOrEqual(1);
    }
  });
});
