import { describe, expect, it } from "vitest";
import { buildReclaimPlan, planMinutes, type ReclaimGoal } from "./plan";
import type { WorkItem } from "@/lib/work/urgency";

const NOW = new Date("2026-10-05T09:00:00");
const at = (h: number, m = 0) => {
  const d = new Date(NOW);
  d.setHours(h, m, 0, 0);
  return d;
};

function work(over: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "w1",
    kind: "assignment",
    title: "ML coursework",
    at: new Date("2026-10-06T17:00:00").toISOString(),
    moduleId: "m2",
    moduleName: "Machine Learning",
    tone: "coral",
    status: "not_started",
    weight: 30,
    estimatedHours: 3,
    ...over,
  };
}

const goal: ReclaimGoal = { id: "g1", title: "React course", kind: "project" };

const minutes = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60_000;

describe("honesty about short windows", () => {
  it("refuses to invent a work block out of twenty minutes", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(9, 20),
      work: [work()],
      goals: [goal],
      now: NOW,
    });

    expect(plan).toHaveLength(1);
    expect(plan[0].kind).toBe("break");
    expect(plan[0].why).toMatch(/too short/i);
  });

  it("returns nothing for a zero-length or inverted window", () => {
    expect(buildReclaimPlan({ from: at(9), to: at(9), work: [], goals: [], now: NOW })).toEqual([]);
    expect(buildReclaimPlan({ from: at(11), to: at(9), work: [], goals: [], now: NOW })).toEqual([]);
  });
});

describe("the plan fits the window", () => {
  it("never runs past the end, for any window length", () => {
    for (const end of [at(9, 30), at(10), at(10, 45), at(11), at(12), at(13, 20)]) {
      const plan = buildReclaimPlan({
        from: at(9),
        to: end,
        work: [work(), work({ id: "w2", title: "Lab report", estimatedHours: 2 })],
        goals: [goal],
        now: NOW,
      });

      const last = plan.at(-1);
      if (!last) continue;
      expect(new Date(last.endsAt).getTime()).toBeLessThanOrEqual(end.getTime());
      expect(planMinutes(plan)).toBeLessThanOrEqual(minutes(at(9), end));
    }
  });

  it("produces slots that run back to back with no gaps or overlaps", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(12),
      work: [work(), work({ id: "w2", title: "Lab report" })],
      goals: [goal],
      now: NOW,
    });

    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].startsAt).toBe(plan[i - 1].endsAt);
    }
  });
});

describe("it does not produce a grind", () => {
  it("always ends on a break", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(12),
      work: [work({ estimatedHours: 10 })],
      goals: [],
      now: NOW,
    });

    expect(plan.at(-1)?.kind).toBe("break");
  });

  it("never puts more than two focus blocks back to back", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(14),
      work: [work({ estimatedHours: 20 })],
      goals: [],
      now: NOW,
    });

    let run = 0;
    for (const s of plan) {
      run = s.kind === "break" ? 0 : run + 1;
      expect(run).toBeLessThanOrEqual(2);
    }
  });
});

describe("what gets the time", () => {
  it("puts overdue work ahead of work merely due soon", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(11),
      work: [
        work({ id: "soon", title: "Due Thursday", at: new Date("2026-10-07T17:00:00").toISOString() }),
        work({ id: "late", title: "Already late", at: new Date("2026-10-01T17:00:00").toISOString() }),
      ],
      goals: [],
      now: NOW,
    });

    expect(plan[0].title).toBe("Already late");
    expect(plan[0].why).toMatch(/past its date/i);
  });

  it("gives goals time, but only after deadlines are served", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(13),
      work: [work({ estimatedHours: 1 })],
      goals: [goal],
      now: NOW,
    });

    const kinds = plan.filter((s) => s.kind !== "break").map((s) => s.kind);
    expect(kinds[0]).toBe("work");
    expect(kinds).toContain("goal");
  });

  it("frames an exam as revision rather than as a task", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(11),
      work: [work({ id: "e1", kind: "exam", title: "OS midterm", status: null, estimatedHours: null })],
      goals: [],
      now: NOW,
    });

    expect(plan[0].kind).toBe("revision");
    expect(plan[0].title).toBe("Revise for OS midterm");
  });

  it("ignores work that is already submitted", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(11),
      work: [work({ status: "submitted" })],
      goals: [],
      now: NOW,
    });

    expect(plan.every((s) => s.kind === "break")).toBe(true);
  });

  it("says so plainly when there is genuinely nothing to do", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(11),
      work: [],
      goals: [],
      now: NOW,
    });

    expect(plan).toHaveLength(1);
    expect(plan[0].kind).toBe("break");
    expect(plan[0].why).toMatch(/genuinely free/i);
  });
});

describe("determinism", () => {
  it("returns the same plan for the same inputs", () => {
    const args = {
      from: at(9),
      to: at(12),
      work: [work(), work({ id: "w2", title: "Lab report" })],
      goals: [goal],
      now: NOW,
    };
    expect(buildReclaimPlan(args)).toEqual(buildReclaimPlan(args));
  });
});

describe("planning around events pinned on the board", () => {
  const talk = { id: "ev1", title: "Guest talk", from: at(10), to: at(11) };

  it("never schedules anything over a pinned event, and shows it as a fixed slot", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(12),
      work: [work()],
      goals: [],
      now: NOW,
      busy: [talk],
    });

    const event = plan.find((s) => s.kind === "event");
    expect(event).toMatchObject({ title: "Guest talk", linkedType: "event", linkedId: "ev1" });

    for (const s of plan.filter((x) => x.kind !== "event")) {
      const overlaps =
        new Date(s.startsAt) < talk.to && new Date(s.endsAt) > talk.from;
      expect(overlaps).toBe(false);
    }
  });

  it("still covers the whole window, gap-free, around the event", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(12),
      work: [work()],
      goals: [goal],
      now: NOW,
      busy: [talk],
    });
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].startsAt).toBe(plan[i - 1].endsAt);
    }
    expect(plan[0].startsAt).toBe(at(9).toISOString());
  });

  it("does not schedule the same short task both before and after the event", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(12),
      work: [work({ estimatedHours: 0.75 })],
      goals: [],
      now: NOW,
      busy: [talk],
    });
    expect(plan.filter((s) => s.linkedId === "w1")).toHaveLength(1);
  });

  it("ignores events outside the window and clips ones that straddle it", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(10),
      work: [],
      goals: [],
      now: NOW,
      busy: [
        { id: "a", title: "Earlier", from: at(7), to: at(8) },
        { id: "b", title: "Straddles", from: at(9, 30), to: at(11) },
      ],
    });
    const events = plan.filter((s) => s.kind === "event");
    expect(events.map((e) => e.title)).toEqual(["Straddles"]);
    expect(events[0].endsAt).toBe(at(10).toISOString());
  });

  it("keeps ids unique and positional across the whole plan", () => {
    const plan = buildReclaimPlan({
      from: at(9),
      to: at(12),
      work: [work()],
      goals: [goal],
      now: NOW,
      busy: [talk],
    });
    expect(new Set(plan.map((s) => s.id)).size).toBe(plan.length);
    expect(plan[0].id).toBe("slot-0");
  });
});
