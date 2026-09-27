import { describe, expect, it } from "vitest";
import {
  ACTIVITY,
  defaultActivity,
  firstActivity,
  firstTip,
  isLate,
  nextActivity,
  poolFor,
  TIPS,
} from "./loading";

describe("what she does while it loads", () => {
  it("does something that belongs on the screen", () => {
    expect(firstActivity("money", 14, 0.9)).toBe("coins");
    expect(["pinning", "juggling"]).toContain(firstActivity("board", 14, 0.5));
    expect(["reading", "counting"]).toContain(firstActivity("timetable", 14, 0.1));
  });

  it("covers the whole pool as the random number moves", () => {
    const seen = new Set([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((r) => firstActivity("home", 12, r)));
    expect(seen.size).toBe(poolFor("home", 12).length);
  });

  it("never picks past the end of the pool", () => {
    expect(firstActivity("home", 12, 0.99999)).toBe("reading");
  });

  it("knows where late starts and ends", () => {
    expect([22, 23, 0, 4, 5].map(isLate)).toEqual([false, true, true, true, false]);
  });

  it("only sleeps when it is actually late", () => {
    expect(firstActivity("home", 23, 0.5)).toBe("sleeping");
    expect(firstActivity("home", 2, 0.5)).toBe("sleeping");
    for (const hour of [5, 9, 13, 18, 22]) {
      expect(poolFor("home", hour)).not.toContain("sleeping");
    }
  });

  it("wakes up and does something else when tapped", () => {
    expect(nextActivity("home", 23, "sleeping")).not.toBe("sleeping");
  });

  it("never repeats the same trick twice in a row", () => {
    let current = firstActivity("home", 12, 0);
    for (let i = 0; i < 12; i++) {
      const next = nextActivity("home", 12, current);
      expect(next).not.toBe(current);
      current = next;
    }
  });

  it("keeps a one-trick screen on its one trick", () => {
    expect(nextActivity("money", 12, "coins")).toBe("coins");
  });

  it("has a caption and a mood for every trick", () => {
    for (const a of Object.values(ACTIVITY)) {
      expect(a.caption.length).toBeGreaterThan(10);
      expect(a.caption.length).toBeLessThan(60);
    }
  });
});

describe("the first frame, drawn on the server", () => {
  it("is fixed per screen and belongs on it", () => {
    expect(defaultActivity("money")).toBe("coins");
    expect(defaultActivity("board")).toBe(defaultActivity("board"));
    for (const screen of ["home", "timetable", "board", "money"] as const) {
      expect(poolFor(screen, 12)).toContain(defaultActivity(screen));
      expect(defaultActivity(screen)).not.toBe("sleeping");
    }
  });
});

describe("tips", () => {
  it("fit on two lines of a phone", () => {
    for (const tip of TIPS) expect(tip.length).toBeLessThanOrEqual(80);
  });

  it("never pretend to measure progress", () => {
    for (const tip of TIPS) expect(tip).not.toMatch(/\d+\s?%|loading/i);
  });

  it("start somewhere inside the list", () => {
    expect(firstTip(0)).toBe(0);
    expect(firstTip(0.99999)).toBe(TIPS.length - 1);
  });
});
