import { describe, expect, it } from "vitest";
import {
  floraSpeech,
  hasSomethingNew,
  isStale,
  nextObservation,
  observations,
  type FloraContext,
} from "./lines";

const home = (over: Partial<FloraContext> = {}): FloraContext => ({
  screen: "home",
  hasTimetable: true,
  ...over,
});

describe("priority — Flora says the most important thing, not the first thing", () => {
  it("puts a module below threshold above everything else", () => {
    const speech = floraSpeech(
      home({
        modulesBelow: 1,
        overdueCount: 3,
        dueTodayCount: 2,
        minutesToNextClass: 4,
      }),
    );

    expect(speech?.mood).toBe("worried");
    expect(speech?.text).toMatch(/threshold/i);
  });

  it("puts overdue work above an imminent class", () => {
    const speech = floraSpeech(home({ overdueCount: 2, minutesToNextClass: 10 }));
    expect(speech?.text).toMatch(/past their date/i);
  });

  it("mentions an imminent class ahead of work due today", () => {
    const speech = floraSpeech(home({ minutesToNextClass: 12, dueTodayCount: 1 }));
    expect(speech?.text).toMatch(/12 minutes/);
  });

  it("asks for a timetable only once nothing is wrong", () => {
    expect(floraSpeech(home({ hasTimetable: false }))?.text).toMatch(/timetable/i);
    // …but a real problem still wins.
    expect(
      floraSpeech(home({ hasTimetable: false, overdueCount: 1 }))?.text,
    ).toMatch(/past its date/i);
  });
});

describe("moods map to real state", () => {
  it("is worried only when something is actually wrong", () => {
    expect(floraSpeech(home({ modulesBelow: 1 }))?.mood).toBe("worried");
    expect(floraSpeech(home({ overdueCount: 1 }))?.mood).toBe("worried");
    expect(floraSpeech(home())?.mood).toBe("happy");
  });

  it("sleeps on an empty day", () => {
    expect(floraSpeech(home({ nothingOnToday: true }))?.mood).toBe("sleepy");
  });

  it("mirrors the Skip Advisor's verdict and never contradicts it", () => {
    expect(floraSpeech({ screen: "advisor", verdict: "go_matters" })?.mood).toBe("worried");
    expect(floraSpeech({ screen: "advisor", verdict: "skip_fine" })?.mood).toBe("happy");
    expect(floraSpeech({ screen: "advisor", verdict: "your_call" })?.mood).toBe("thinking");
  });

  it("says nothing on the Advisor screen until there is a verdict", () => {
    expect(floraSpeech({ screen: "advisor" })).toBeNull();
  });
});

describe("tone", () => {
  it("never nags about working harder", () => {
    const lines = [
      home({ modulesBelow: 2 }),
      home({ overdueCount: 4 }),
      home({ dueTodayCount: 3 }),
      home({ unmarkedCount: 9 }),
      home({ nothingOnToday: true }),
    ].map((c) => floraSpeech(c)?.text ?? "");

    for (const line of lines) {
      expect(line).not.toMatch(/should|must|lazy|behind|hurry|deserve/i);
    }
  });

  it("keeps every line short enough for a speech bubble", () => {
    const contexts: FloraContext[] = [
      { screen: "signin" },
      home(),
      home({ hasTimetable: false }),
      home({ modulesBelow: 3 }),
      home({ overdueCount: 2 }),
      home({ minutesToNextClass: 0 }),
      home({ nothingOnToday: true }),
      { screen: "me", hasTimetable: true, isGuest: true },
      { screen: "me", hasTimetable: true, goalCount: 0 },
      { screen: "board", hasTimetable: true },
      { screen: "timetable", hasTimetable: true },
      { screen: "advisor", verdict: "go_if_you_can" },
    ];

    for (const ctx of contexts) {
      const text = floraSpeech(ctx)?.text;
      expect(text).toBeTruthy();
      expect(text!.length).toBeLessThanOrEqual(78);
    }
  });

  it("handles the singular and plural of every countable line", () => {
    expect(floraSpeech(home({ modulesBelow: 1 }))?.text).toMatch(/One module/);
    expect(floraSpeech(home({ modulesBelow: 2 }))?.text).toMatch(/2 modules/);
    expect(floraSpeech(home({ overdueCount: 1 }))?.text).toMatch(/Something/);
    expect(floraSpeech(home({ overdueCount: 5 }))?.text).toMatch(/5 things/);
    expect(floraSpeech(home({ dueTodayCount: 1 }))?.text).toMatch(/One thing/);
    expect(floraSpeech(home({ dueTodayCount: 4 }))?.text).toMatch(/4 things/);
  });
});

describe("money", () => {
  const money = (over: Partial<FloraContext> = {}): FloraContext => ({
    screen: "money",
    hasCampus: true,
    ...over,
  });

  it("maps each budget state to a mood that matches it", () => {
    expect(floraSpeech(money({ budget: "over" }))?.mood).toBe("worried");
    expect(floraSpeech(money({ budget: "tight" }))?.mood).toBe("thinking");
    expect(floraSpeech(money({ budget: "fine" }))?.mood).toBe("happy");
  });

  it("names the period the budget actually covers", () => {
    expect(floraSpeech(money({ budget: "tight", budgetKind: "month" }))?.text).toMatch(/month/);
    expect(floraSpeech(money({ budget: "tight" }))?.text).toMatch(/week/);
  });

  it("asks for a budget, then for a campus pin, only once nothing is wrong", () => {
    expect(floraSpeech(money({ budget: "none", hasCampus: false }))?.text).toMatch(/budget/);
    expect(floraSpeech(money({ budget: "fine", hasCampus: false }))?.text).toMatch(/campus pin/);
  });

  it("still lets a module under threshold outrank money", () => {
    expect(floraSpeech(money({ budget: "over", modulesBelow: 1 }))?.text).toMatch(/threshold/);
  });

  it("keeps the same tone and bubble rules as every other line", () => {
    for (const budget of ["none", "fine", "tight", "over"] as const) {
      for (const budgetKind of ["week", "month"] as const) {
        const text = floraSpeech(money({ budget, budgetKind }))?.text ?? "";
        expect(text.length).toBeGreaterThan(0);
        expect(text.length).toBeLessThanOrEqual(78);
        expect(text).not.toMatch(/should|must|lazy|behind|hurry|deserve/i);
      }
    }
  });
});

describe("the college's own attendance figure", () => {
  const base = { screen: "timetable" as const, hasTimetable: true };

  it("asks for it before nagging about unmarked classes", () => {
    // Importing it settles every unmarked class at once, so it comes first.
    const out = floraSpeech({ ...base, hasOfficial: false, unmarkedCount: 8 });
    expect(out?.text).toContain("your college publishes attendance");
    expect(out?.action).toBe("point");
  });

  it("goes back to the unmarked nudge once the figure is in", () => {
    const out = floraSpeech({ ...base, hasOfficial: true, officialAgeDays: 3, unmarkedCount: 8 });
    expect(out?.text).toContain("unmarked");
  });

  it("says when the figure has gone stale", () => {
    const out = floraSpeech({ ...base, hasOfficial: true, officialAgeDays: 30 });
    expect(out?.text).toContain("4 weeks old");
  });

  it("leaves a fresh figure alone", () => {
    const out = floraSpeech({ ...base, hasOfficial: true, officialAgeDays: 10 });
    expect(out?.text).not.toContain("weeks old");
  });

  it("says where a below-threshold module stands, when the college said it", () => {
    const out = floraSpeech({ ...base, hasOfficial: true, modulesBelow: 1 });
    expect(out?.text).toContain("your college's count");
  });

  it("does not claim the college's count when there is none", () => {
    const out = floraSpeech({ ...base, hasOfficial: false, modulesBelow: 1 });
    expect(out?.text).not.toContain("college");
  });

  it("never asks for it before there is a timetable to match it to", () => {
    const out = floraSpeech({ screen: "timetable", hasTimetable: false, hasOfficial: false });
    expect(out?.text).toContain("timetable");
  });
});

describe("moving on to the next thing", () => {
  const ctx = {
    screen: "timetable" as const,
    hasTimetable: true,
    hasOfficial: true,
    officialAgeDays: 2,
    modulesBelow: 1,
    unmarkedCount: 5,
  };

  it("collects everything true, not only the winner", () => {
    const all = observations(ctx);
    expect(all.map((o) => o.id)).toContain("below");
    expect(all.map((o) => o.id)).toContain("unmarked");
    expect(all[0].id).toBe("below");
  });

  it("leads with the most important line when she has said nothing", () => {
    const next = nextObservation(observations(ctx), { now: 1000, spoken: {} });
    expect(next?.id).toBe("below");
  });

  it("moves on when tapped, rather than repeating itself", () => {
    const all = observations(ctx);
    const next = nextObservation(all, { now: 1000, spoken: { below: 1000 }, currentId: "below" });
    expect(next?.id).not.toBe("below");
  });

  it("does not come back to a line while it is still fresh", () => {
    const all = observations(ctx);
    const now = 60_000;
    const spoken = Object.fromEntries(all.map((o) => [o.id, now]));
    const next = nextObservation(all, { now, spoken, currentId: "below" });
    // Everything is on cooldown, so she reaches for the stalest — but never
    // repeats what is already on screen.
    expect(next?.id).not.toBe("below");
  });

  it("answers what just happened before anything else", () => {
    const all = observations({ ...ctx, reaction: "marked-present" });
    const next = nextObservation(all, { now: 1000, spoken: { below: 0 }, currentId: "below" });
    expect(next?.text).toContain("in the bank");
  });

  it("says nothing at all when there is nothing to say", () => {
    expect(nextObservation([], { now: 1, spoken: {} })).toBe(null);
  });

  it("nudges only while something has never been said", () => {
    const all = observations(ctx);
    expect(hasSomethingNew(all, { spoken: {}, currentId: "below" })).toBe(true);

    const spoken = Object.fromEntries(all.map((o) => [o.id, 1000]));
    expect(hasSomethingNew(all, { spoken, currentId: "below" })).toBe(false);
  });
});

describe("reading the day on screen", () => {
  it("counts the unmarked classes on the day she is looking at", () => {
    const all = observations({
      screen: "timetable",
      hasTimetable: true,
      hasOfficial: true,
      dayOffset: 0,
      dayCount: 5,
      dayUnmarked: 2,
    });
    expect(all.map((o) => o.text)).toContain("2 classes on this day are still unmarked.");
  });

  it("warns about a heavy day ahead, not one already survived", () => {
    const heavy = { screen: "timetable" as const, hasTimetable: true, hasOfficial: true, dayCount: 6 };
    expect(observations({ ...heavy, dayOffset: 1 }).map((o) => o.id)).toContain("day-heavy");
    expect(observations({ ...heavy, dayOffset: -1 }).map((o) => o.id)).not.toContain("day-heavy");
  });

  it("points out a clear day ahead as something to use", () => {
    const all = observations({
      screen: "timetable",
      hasTimetable: true,
      hasOfficial: true,
      dayOffset: 2,
      dayCount: 0,
    });
    expect(all.map((o) => o.id)).toContain("day-clear");
  });
});

describe("not contradicting herself", () => {
  it("does not say all is quiet while she is still asking for a timetable", () => {
    const all = observations({ screen: "home", hasTimetable: false });
    expect(all.map((o) => o.id)).toContain("no-timetable");
    expect(all.map((o) => o.id)).not.toContain("all-quiet");
  });

  it("keeps the pleasantry once there is a timetable", () => {
    const all = observations({ screen: "home", hasTimetable: true, hasOfficial: true });
    expect(all.map((o) => o.id)).toContain("all-quiet");
  });
});

describe("letting go of a line", () => {
  it("knows when what she is saying has stopped being true", () => {
    const before = observations({ screen: "timetable", hasTimetable: true, hasOfficial: true, unmarkedCount: 5 });
    const after = observations({ screen: "timetable", hasTimetable: true, hasOfficial: true, unmarkedCount: 0 });
    expect(isStale(after, "unmarked")).toBe(true);
    expect(isStale(before, "unmarked")).toBe(false);
  });

  it("treats a lapsed reaction as stale, so she goes back to the real news", () => {
    const during = observations({ screen: "home", hasTimetable: true, hasOfficial: true, reaction: "marked-present" });
    const after = observations({ screen: "home", hasTimetable: true, hasOfficial: true });
    expect(isStale(during, "reaction:marked-present")).toBe(false);
    expect(isStale(after, "reaction:marked-present")).toBe(true);
  });

  it("is not stale when she is saying nothing", () => {
    expect(isStale([], null)).toBe(false);
  });
});
