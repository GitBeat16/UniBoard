import { describe, expect, it } from "vitest";
import { floraSpeech, type FloraContext } from "./lines";

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
