import { describe, expect, it } from "vitest";
import {
  currencySymbol,
  currentBudget,
  dayKey,
  formatMoney,
  periodBounds,
  summarize,
  type Budget,
  type Expense,
} from "./budget";

// Local-time constructors keep these tests independent of the machine's zone.
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

let n = 0;
const spend = (amount: number, when: Date, category: Expense["category"] = "food"): Expense => ({
  id: String(++n),
  amount,
  category,
  note: null,
  spentAt: when.toISOString(),
});

const weekly: Budget = { kind: "week", total: 1400, food: 700, startsOn: "2026-09-01" };

describe("periodBounds", () => {
  it("runs a week Monday to Sunday — Sunday belongs to the week that started Monday", () => {
    // 27 Sep 2026 is a Sunday.
    const b = periodBounds("week", at(2026, 9, 27, 23, 30));
    expect(dayKey(b.start)).toBe("2026-09-21");
    expect(dayKey(b.end)).toBe("2026-09-28");
    expect(b.daysTotal).toBe(7);
    expect(b.daysLeft).toBe(1);
  });

  it("counts today as a day you can still spend", () => {
    expect(periodBounds("week", at(2026, 9, 21, 8)).daysLeft).toBe(7); // Monday
  });

  it("uses calendar months, including short ones", () => {
    const feb = periodBounds("month", at(2027, 2, 10));
    expect(dayKey(feb.start)).toBe("2027-02-01");
    expect(feb.daysTotal).toBe(28);
    expect(feb.daysLeft).toBe(19);
  });
});

describe("currentBudget", () => {
  const rows = [
    { startsOn: "2026-08-01", total: 1 },
    { startsOn: "2026-09-15", total: 2 },
    { startsOn: "2026-10-01", total: 3 }, // not started yet
  ];
  it("picks the latest budget that has already started", () => {
    expect(currentBudget(rows, at(2026, 9, 21))?.total).toBe(2);
  });
  it("returns null before any budget starts", () => {
    expect(currentBudget(rows, at(2026, 7, 1))).toBeNull();
  });
});

describe("summarize", () => {
  const now = at(2026, 9, 23, 18); // Wednesday: Mon, Tue gone, 5 days left incl. today

  it("adds up this period only, by category, and today separately", () => {
    const s = summarize(
      weekly,
      [
        spend(200, at(2026, 9, 21, 13)),
        spend(100, at(2026, 9, 22, 9), "transport"),
        spend(80, at(2026, 9, 23, 12)),
        spend(999, at(2026, 9, 20, 23)), // last Sunday — previous week
      ],
      now,
    );
    expect(s.spent).toBe(380);
    expect(s.spentToday).toBe(80);
    expect(s.spentFood).toBe(280);
    expect(s.byCategory.transport).toBe(100);
    expect(s.remaining).toBe(1020);
    expect(s.foodRemaining).toBe(420);
  });

  it("gives today an even share of what was left this morning", () => {
    // 1400 − 300 before today = 1100 over 5 days = 220; 80 already spent today.
    const s = summarize(
      weekly,
      [spend(300, at(2026, 9, 21)), spend(80, at(2026, 9, 23, 9))],
      now,
    );
    expect(s.leftToday).toBe(140);
    expect(s.perDay).toBe(204); // 1020 / 5
    expect(s.status).toBe("fine");
  });

  it("is 'tight' when today is already past its share", () => {
    const s = summarize(weekly, [spend(300, at(2026, 9, 23, 9))], now);
    expect(s.leftToday).toBeLessThan(0);
    expect(s.status).toBe("tight");
  });

  it("is 'tight' when the pace would overshoot, before it actually has", () => {
    // 900 by Wednesday evening on a 1400 week projects to ~2520.
    const s = summarize(weekly, [spend(900, at(2026, 9, 22))], now);
    expect(s.remaining).toBeGreaterThan(0);
    expect(s.status).toBe("tight");
  });

  it("is 'over' past the total, with the ring capped at 100", () => {
    const s = summarize(weekly, [spend(1500, at(2026, 9, 22))], now);
    expect(s.status).toBe("over");
    expect(s.remaining).toBe(-100);
    expect(s.perDay).toBe(0);
    expect(s.usedPct).toBe(100);
  });

  it("does not project a fantasy from one first-morning spend", () => {
    const monday = at(2026, 9, 21, 9);
    const s = summarize(weekly, [spend(150, at(2026, 9, 21, 8))], monday);
    // Half a day elapsed: 150 / 0.5 × 7 = 2100. That projection is noise on
    // day one, so it is reported but does not flag the week as tight.
    expect(s.leftToday).toBe(50);
    expect(s.projected).toBe(2100);
    expect(s.status).toBe("fine");
  });

  it("handles a budget with no food cap", () => {
    expect(summarize({ ...weekly, food: null }, [], now).foodRemaining).toBeNull();
  });
});

describe("formatMoney", () => {
  it("uses lakh grouping for rupees and drops .00", () => {
    expect(formatMoney(123456, "INR")).toBe("₹1,23,456");
  });
  it("keeps paise when there are some", () => {
    expect(formatMoney(49.5, "INR")).toBe("₹49.50");
  });
  it("formats other currencies in their own style", () => {
    expect(formatMoney(1234.5, "GBP")).toBe("£1,234.50");
  });
  it("rounds derived amounts to whole units when asked", () => {
    expect(formatMoney(181.43, "INR", { round: true })).toBe("₹181");
    expect(formatMoney(15.71, "INR", { round: true })).toBe("₹16");
  });
  it("gives a symbol for an input prefix", () => {
    expect(currencySymbol("INR")).toBe("₹");
    expect(currencySymbol("GBP")).toBe("£");
  });
  it("never throws on an odd code", () => {
    expect(formatMoney(10, "ZZZ")).toMatch(/10/);
  });
});
