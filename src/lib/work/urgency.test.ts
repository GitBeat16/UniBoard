import { describe, expect, it } from "vitest";
import { outstandingHours, sortByUrgency, urgencyOf, type WorkItem } from "./urgency";

const NOW = new Date("2026-10-05T09:00:00");
const at = (iso: string) => new Date(iso).toISOString();

function item(over: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "a1",
    kind: "assignment",
    title: "Essay",
    at: at("2026-10-08T09:00:00"),
    moduleId: "m1",
    moduleName: "Databases",
    tone: "sky",
    status: "not_started",
    weight: 20,
    estimatedHours: 6,
    ...over,
  };
}

describe("urgencyOf", () => {
  it("marks a submitted assignment done regardless of its date", () => {
    expect(urgencyOf(item({ status: "submitted", at: at("2026-09-01T09:00:00") }), NOW)).toBe("done");
    expect(urgencyOf(item({ status: "graded" }), NOW)).toBe("done");
  });

  it("never marks an exam done — it is ahead of you or behind you", () => {
    expect(urgencyOf(item({ kind: "exam", status: null, at: at("2026-10-09T09:00:00") }), NOW)).toBe("this_week");
    expect(urgencyOf(item({ kind: "exam", status: null, at: at("2026-10-01T09:00:00") }), NOW)).toBe("overdue");
  });

  it("calls anything in the past overdue", () => {
    expect(urgencyOf(item({ at: at("2026-10-05T08:59:00") }), NOW)).toBe("overdue");
  });

  it("separates 'today' from 'within 3 days' by calendar day, not by hours", () => {
    // 14 hours away, but still tonight.
    expect(urgencyOf(item({ at: at("2026-10-05T23:59:00") }), NOW)).toBe("today");
    // Only 1 hour later, but it is tomorrow.
    expect(urgencyOf(item({ at: at("2026-10-06T00:30:00") }), NOW)).toBe("soon");
  });

  it("holds the 72-hour and 7-day boundaries", () => {
    expect(urgencyOf(item({ at: at("2026-10-08T09:00:00") }), NOW)).toBe("soon");
    expect(urgencyOf(item({ at: at("2026-10-08T09:01:00") }), NOW)).toBe("this_week");
    expect(urgencyOf(item({ at: at("2026-10-12T09:00:00") }), NOW)).toBe("this_week");
    expect(urgencyOf(item({ at: at("2026-10-12T09:01:00") }), NOW)).toBe("later");
  });
});

describe("sortByUrgency", () => {
  it("puts live work first and sinks finished work", () => {
    const items = [
      item({ id: "later", at: at("2026-11-01T09:00:00") }),
      item({ id: "done", status: "submitted", at: at("2026-10-05T10:00:00") }),
      item({ id: "overdue", at: at("2026-10-01T09:00:00") }),
      item({ id: "today", at: at("2026-10-05T18:00:00") }),
    ];

    expect(sortByUrgency(items, NOW).map((i) => i.id)).toEqual([
      "overdue",
      "today",
      "later",
      "done",
    ]);
  });

  it("orders items within the same band by date", () => {
    const items = [
      item({ id: "b", at: at("2026-10-07T09:00:00") }),
      item({ id: "a", at: at("2026-10-06T09:00:00") }),
    ];
    expect(sortByUrgency(items, NOW).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const items = [item({ id: "b", at: at("2026-11-01T09:00:00") }), item({ id: "a" })];
    const before = items.map((i) => i.id);
    sortByUrgency(items, NOW);
    expect(items.map((i) => i.id)).toEqual(before);
  });
});

describe("outstandingHours", () => {
  it("counts only unfinished work inside the window", () => {
    const items = [
      item({ id: "1", estimatedHours: 6 }),                                  // soon
      item({ id: "2", estimatedHours: 4, status: "submitted" }),             // done
      item({ id: "3", estimatedHours: 10, at: at("2026-11-20T09:00:00") }),  // outside
      item({ id: "4", estimatedHours: null }),                               // unestimated
    ];

    expect(outstandingHours(items, NOW)).toBe(6);
  });

  it("includes overdue work, which is exactly the work that needs the time", () => {
    const items = [item({ estimatedHours: 3, at: at("2026-10-01T09:00:00") })];
    expect(outstandingHours(items, NOW)).toBe(3);
  });
});
