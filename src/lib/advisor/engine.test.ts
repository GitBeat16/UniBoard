import { describe, expect, it } from "vitest";
import { advise, type AdvisorInput } from "./engine";
import type { ModuleAttendance } from "@/lib/attendance/stats";

const NOW = new Date("2026-10-05T08:00:00Z");
const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
const daysFromNow = (d: number) => hoursFromNow(d * 24);

function attendance(over: Partial<ModuleAttendance> = {}): ModuleAttendance {
  return {
    moduleId: "m1",
    name: "Databases",
    code: "CS2004",
    colorToken: "sky",
    threshold: 75,
    attended: 12,
    missed: 1,
    held: 13,
    unmarked: 0,
    remaining: 8,
    percent: 92.3,
    canMissMore: 5,
    status: "safe",
    ...over,
  };
}

function input(over: Partial<AdvisorInput> = {}): AdvisorInput {
  return {
    session: {
      moduleName: "Databases",
      startsAt: hoursFromNow(3),
      endsAt: hoursFromNow(4),
      type: "lecture",
      isAssessed: false,
      hasSubmission: false,
      isRecorded: false,
      ...over.session,
    },
    attendance: over.attendance ?? attendance(),
    deadlines: over.deadlines ?? [],
    exams: over.exams ?? [],
    travelMinutes: over.travelMinutes,
    state: over.state,
    attendanceMonitored: over.attendanceMonitored,
    now: over.now ?? NOW,
  };
}

describe("guardrails — these must never bend", () => {
  it("forces GO when something is due in the class, however much else is going on", () => {
    const result = advise(
      input({
        session: {
          moduleName: "Databases",
          startsAt: hoursFromNow(3),
          endsAt: hoursFromNow(4),
          type: "lecture",
          isAssessed: false,
          hasSubmission: true,
          isRecorded: true,
        },
        // Everything else screams "skip".
        attendance: attendance({ canMissMore: 9, percent: 99, status: "safe" }),
        deadlines: [{ title: "ML coursework", dueAt: hoursFromNow(6), moduleId: "other" }],
        state: "ill",
        travelMinutes: 90,
      }),
    );

    expect(result.verdict).toBe("go_matters");
    expect(result.guardrail).toMatch(/due in this class/i);
  });

  it("forces GO for an assessed session", () => {
    const result = advise(
      input({
        session: {
          moduleName: "Databases",
          startsAt: hoursFromNow(3),
          endsAt: hoursFromNow(4),
          type: "lecture",
          isAssessed: true,
          hasSubmission: false,
          isRecorded: true,
        },
        attendance: attendance({ canMissMore: 9, status: "safe" }),
        state: "tired",
      }),
    );

    expect(result.verdict).toBe("go_matters");
    expect(result.guardrail).toMatch(/assessed/i);
  });

  it("forces GO when attendance is formally monitored", () => {
    const result = advise(
      input({
        attendance: attendance({ canMissMore: 9, percent: 99 }),
        attendanceMonitored: true,
        state: "ill",
      }),
    );

    expect(result.verdict).toBe("go_matters");
    expect(result.guardrail).toMatch(/monitored/i);
  });

  it("forces GO when already below the threshold", () => {
    const result = advise(
      input({
        attendance: attendance({ percent: 61, canMissMore: 0, status: "below" }),
      }),
    );

    expect(result.verdict).toBe("go_matters");
    expect(result.guardrail).toMatch(/under the 75% threshold/i);
  });

  it("forces GO when this absence is the one that drops you below", () => {
    const result = advise(
      input({
        attendance: attendance({ percent: 76, canMissMore: 0, status: "thin" }),
        state: "ill",
        deadlines: [{ title: "Essay", dueAt: hoursFromNow(4), moduleId: "other" }],
      }),
    );

    expect(result.verdict).toBe("go_matters");
    expect(result.guardrail).toMatch(/drops below 75%/i);
  });

  it("never returns skip_fine for any guardrail case", () => {
    const guardrailCases: Array<Partial<AdvisorInput>> = [
      { session: { ...input().session, hasSubmission: true } },
      { session: { ...input().session, isAssessed: true } },
      { attendanceMonitored: true },
      { attendance: attendance({ status: "below", percent: 40, canMissMore: 0 }) },
      { attendance: attendance({ canMissMore: 0, status: "thin" }) },
    ];

    for (const over of guardrailCases) {
      const result = advise(
        input({ ...over, state: "ill", travelMinutes: 120, deadlines: [
          { title: "Anything", dueAt: hoursFromNow(2), moduleId: "other" },
        ] }),
      );
      expect(result.verdict).toBe("go_matters");
    }
  });
});

describe("scored verdicts", () => {
  it("says skipping is fine with a deep buffer, a recorded lecture and real work due", () => {
    const result = advise(
      input({
        session: { ...input().session, isRecorded: true },
        attendance: attendance({ canMissMore: 8, percent: 95, status: "safe" }),
        deadlines: [{ title: "ML coursework", dueAt: hoursFromNow(10), moduleId: "other" }],
      }),
    );

    expect(result.verdict).toBe("skip_fine");
    expect(result.score).toBeLessThan(0);
  });

  it("leans go when the buffer is thin even with nothing else pressing", () => {
    const result = advise(
      input({ attendance: attendance({ canMissMore: 1, percent: 78, status: "thin" }) }),
    );

    expect(["go_matters", "go_if_you_can"]).toContain(result.verdict);
    expect(result.score).toBeGreaterThan(0);
  });

  it("treats a lab as harder to miss than a lecture, all else equal", () => {
    const base = { attendance: attendance({ canMissMore: 4 }) };
    const lecture = advise(input({ ...base, session: { ...input().session, type: "lecture" } }));
    const lab = advise(input({ ...base, session: { ...input().session, type: "lab" } }));

    expect(lab.score).toBeGreaterThan(lecture.score);
  });

  it("discounts a recorded session but does not zero it out", () => {
    const live = advise(input({ session: { ...input().session, type: "lab" } }));
    const recorded = advise(
      input({ session: { ...input().session, type: "lab", isRecorded: true } }),
    );

    expect(recorded.score).toBeLessThan(live.score);
    expect(recorded.factors.sessionImportance).toBeGreaterThan(0);
  });

  it("counts work due for THIS module as a reason to attend, not to hide", () => {
    const ownModule = advise(
      input({
        deadlines: [{ title: "DB lab report", dueAt: hoursFromNow(10), moduleId: "m1" }],
      }),
    );
    const otherModule = advise(
      input({
        deadlines: [{ title: "ML coursework", dueAt: hoursFromNow(10), moduleId: "other" }],
      }),
    );

    expect(ownModule.factors.deadlinePressure).toBeLessThan(
      otherModule.factors.deadlinePressure,
    );
    expect(ownModule.score).toBeGreaterThan(otherModule.score);
  });

  it("ignores deadlines beyond 72 hours and exams beyond a fortnight", () => {
    const result = advise(
      input({
        deadlines: [{ title: "Far off", dueAt: daysFromNow(9), moduleId: "other" }],
        exams: [{ title: "Finals", startsAt: daysFromNow(40), moduleId: "other" }],
      }),
    );

    expect(result.factors.deadlinePressure).toBe(0);
  });

  it("scales travel cost against how long the class actually is", () => {
    const shortClass = advise(
      input({
        session: { ...input().session, startsAt: hoursFromNow(3), endsAt: hoursFromNow(4) },
        travelMinutes: 60,
      }),
    );
    const longClass = advise(
      input({
        session: { ...input().session, startsAt: hoursFromNow(3), endsAt: hoursFromNow(7) },
        travelMinutes: 60,
      }),
    );

    expect(shortClass.factors.travelCost).toBeGreaterThan(longClass.factors.travelCost);
  });

  it("treats an unmarked module as a guess rather than as safe", () => {
    const unknown = advise(
      input({
        attendance: attendance({ percent: null, held: 0, attended: 0, missed: 0, status: "unknown" }),
      }),
    );

    expect(unknown.factors.attendanceRisk).toBeGreaterThan(0);
    expect(unknown.reasons.some((r) => /guess/i.test(r.text))).toBe(true);
  });
});

describe("explanations", () => {
  it("always returns between one and three reasons", () => {
    const cases = [
      input(),
      input({ state: "ill" }),
      input({ attendance: attendance({ canMissMore: 0, status: "thin" }) }),
      input({ deadlines: [{ title: "X", dueAt: hoursFromNow(5), moduleId: "other" }] }),
    ];

    for (const c of cases) {
      const { reasons } = advise(c);
      expect(reasons.length).toBeGreaterThanOrEqual(1);
      expect(reasons.length).toBeLessThanOrEqual(3);
    }
  });

  it("orders the strongest argument first", () => {
    const { reasons } = advise(
      input({
        attendance: attendance({ canMissMore: 0, status: "thin" }),
        state: "tired",
      }),
    );

    const weights = reasons.map((r) => r.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });

  it("names the illness reason rather than hiding it in the score", () => {
    const { reasons } = advise(input({ state: "ill" }));
    expect(reasons.some((r) => /ill/i.test(r.text))).toBe(true);
  });
});
