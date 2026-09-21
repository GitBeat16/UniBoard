/**
 * Budget maths. Pure — no clock, no database, no formatting surprises.
 *
 * Everything is in the student's LOCAL calendar: "today" is their today, a
 * week runs Monday–Sunday, a month is the calendar month. That is why the
 * Money screen computes this in the browser (see money-view.tsx) — the server
 * runs in UTC, and 11:30pm spend in Pune is still today's spend.
 */

export const CATEGORIES = ["food", "transport", "study", "fun", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  food: "Food",
  transport: "Travel",
  study: "Study",
  fun: "Fun",
  other: "Other",
};

export type BudgetKind = "week" | "month";

export type Budget = {
  kind: BudgetKind;
  /** Everything, food included. */
  total: number;
  /** Optional cap on food inside the total. */
  food: number | null;
  /** yyyy-mm-dd, the day this budget took effect. */
  startsOn: string;
};

export type Expense = {
  id: string;
  amount: number;
  category: Category;
  note: string | null;
  spentAt: string; // ISO
};

const DAY = 86_400_000;

/** yyyy-mm-dd for a Date, in local time. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole local days between two local midnights, DST-safe. */
function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

export function periodBounds(kind: BudgetKind, now: Date) {
  const today = startOfDay(now);
  let start: Date;
  let end: Date; // exclusive

  if (kind === "week") {
    const sinceMonday = (today.getDay() + 6) % 7; // Mon=0 … Sun=6
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - sinceMonday);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  } else {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }

  const daysTotal = daysBetween(start, end);
  /** Today counts as a day left — you can still spend today. */
  const daysLeft = daysBetween(today, end);
  return { start, end, daysTotal, daysLeft };
}

/** The budget in force today: the latest one that has already started. */
export function currentBudget<T extends { startsOn: string }>(rows: T[], now: Date): T | null {
  const today = dayKey(now);
  let best: T | null = null;
  for (const r of rows) {
    if (r.startsOn <= today && (!best || r.startsOn > best.startsOn)) best = r;
  }
  return best;
}

export type BudgetStatus = "fine" | "tight" | "over";

export type BudgetSummary = {
  start: Date;
  end: Date;
  daysTotal: number;
  daysLeft: number;
  spent: number;
  spentToday: number;
  spentFood: number;
  byCategory: Record<Category, number>;
  /** total − spent. Negative when over. */
  remaining: number;
  /**
   * What today can take and still leave the rest of the period an even share:
   * (what was left this morning ÷ days left) − already spent today.
   */
  leftToday: number;
  /** An even share of what is left, per remaining day, today included. */
  perDay: number;
  /** Straight-line projection of spend by the end of the period. */
  projected: number;
  foodRemaining: number | null;
  /** 0–100 of the total used, for the ring. */
  usedPct: number;
  status: BudgetStatus;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarize(budget: Budget, expenses: Expense[], now: Date): BudgetSummary {
  const { start, end, daysTotal, daysLeft } = periodBounds(budget.kind, now);
  const todayKey = dayKey(now);

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  let spent = 0;
  let spentToday = 0;

  for (const e of expenses) {
    const at = new Date(e.spentAt);
    if (at < start || at >= end) continue;
    spent += e.amount;
    byCategory[e.category] += e.amount;
    if (dayKey(at) === todayKey) spentToday += e.amount;
  }

  const remaining = budget.total - spent;
  const leftThisMorning = budget.total - (spent - spentToday);
  const leftToday = daysLeft > 0 ? leftThisMorning / daysLeft - spentToday : 0;
  const perDay = daysLeft > 0 ? Math.max(0, remaining) / daysLeft : 0;

  // Elapsed days, counting today as half-gone, so a big first-morning spend
  // does not project to a fantasy number.
  const elapsed = Math.max(0.5, daysTotal - daysLeft + 0.5);
  const projected = (spent / elapsed) * daysTotal;

  // Pace is only a signal once there is some history: on day one, a single
  // breakfast "projects" to three times the budget and means nothing.
  const paceTrusted = daysTotal - daysLeft >= 2;

  let status: BudgetStatus = "fine";
  if (spent > budget.total) status = "over";
  else if (leftToday < 0 || (paceTrusted && projected > budget.total * 1.05)) status = "tight";

  return {
    start,
    end,
    daysTotal,
    daysLeft,
    spent: round2(spent),
    spentToday: round2(spentToday),
    spentFood: round2(byCategory.food),
    byCategory,
    remaining: round2(remaining),
    leftToday: round2(leftToday),
    perDay: round2(perDay),
    projected: round2(projected),
    foodRemaining: budget.food === null ? null : round2(budget.food - byCategory.food),
    usedPct: budget.total > 0 ? Math.min(100, (spent / budget.total) * 100) : 0,
    status,
  };
}

/** "₹" for INR, "£" for GBP — for an input prefix. Falls back to the code. */
export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(LOCALE_FOR[currency] ?? "en", {
      style: "currency",
      currency,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

const LOCALE_FOR: Record<string, string> = {
  INR: "en-IN",
  GBP: "en-GB",
  USD: "en-US",
  EUR: "en-IE",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
  AED: "en-AE",
};

/** The currencies offered in the picker. Anything ISO-valid is stored fine. */
export const CURRENCIES = Object.keys(LOCALE_FOR);

/**
 * ₹1,23,456 for INR (lakh grouping), £1,234.50 for GBP. Whole amounts drop
 * the decimals — "₹120" reads better than "₹120.00" on a snack.
 *
 * `round` is for derived amounts (a daily share, what is left today): paise
 * there are arithmetic noise, not money anyone spent.
 */
export function formatMoney(
  amount: number,
  currency: string,
  { round = false }: { round?: boolean } = {},
): string {
  if (round) amount = Math.round(amount);
  const whole = Math.abs(amount % 1) < 0.005;
  try {
    return new Intl.NumberFormat(LOCALE_FOR[currency] ?? "en", {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(whole ? 0 : 2)}`;
  }
}
