import { describe, expect, it } from "vitest";
import { initialsOf, matchOne, matchRows, type MatchTarget } from "./match";
import type { PortalRow } from "./portal";

// The modules a PICT timetable leaves behind: short, shouted abbreviations.
const MODULES: MatchTarget[] = [
  { moduleId: "dm", name: "DM", code: null },
  { moduleId: "ds", name: "DS", code: null },
  { moduleId: "coa", name: "COA", code: null },
  { moduleId: "dsl", name: "DSL", code: null },
  { moduleId: "uhv", name: "UHV", code: null },
];

const row = (over: Partial<PortalRow> = {}): PortalRow => ({
  subject: "DM",
  code: null,
  attended: 20,
  held: 24,
  ...over,
});

describe("matching a portal subject to a module", () => {
  it("matches the same short name", () => {
    expect(matchOne(row({ subject: "DM" }), MODULES)).toBe("dm");
  });

  it("matches however it is punctuated or cased", () => {
    expect(matchOne(row({ subject: "d.m." }), MODULES)).toBe("dm");
    expect(matchOne(row({ subject: " Coa " }), MODULES)).toBe("coa");
  });

  it("matches a spelt-out subject by its initials", () => {
    expect(matchOne(row({ subject: "Discrete Mathematics" }), MODULES)).toBe("dm");
    expect(matchOne(row({ subject: "Data Structures Laboratory" }), MODULES)).toBe("dsl");
  });

  it("finds the short name a portal puts in brackets", () => {
    expect(matchOne(row({ subject: "Computer Organisation & Architecture (COA)" }), MODULES)).toBe(
      "coa",
    );
  });

  it("looks past a course number", () => {
    expect(matchOne(row({ subject: "210241 - Discrete Mathematics" }), MODULES)).toBe("dm");
  });

  it("uses the code column when the name is unhelpful", () => {
    expect(matchOne(row({ subject: "Subject 3", code: "UHV" }), MODULES)).toBe("uhv");
  });

  it("gives up rather than guess between two modules", () => {
    const ambiguous: MatchTarget[] = [
      { moduleId: "a", name: "Data Structures", code: null },
      { moduleId: "b", name: "Data Science", code: null },
    ];
    expect(matchOne(row({ subject: "Data S" }), ambiguous)).toBe(null);
  });

  it("gives up on a subject it has never seen", () => {
    expect(matchOne(row({ subject: "Yoga" }), MODULES)).toBe(null);
  });
});

describe("initials", () => {
  it("skips the little words", () => {
    expect(initialsOf("Design and Analysis of Algorithms")).toBe("daa");
  });
});

describe("reading a whole page", () => {
  it("adds theory and practical into one figure", () => {
    // A portal lists DM twice; the college's percentage is the two together.
    const { matched } = matchRows(
      [
        row({ subject: "DM", attended: 20, held: 24 }),
        row({ subject: "DM Practical", attended: 8, held: 10 }),
      ],
      MODULES,
    );
    expect(matched).toEqual([
      { moduleId: "dm", attended: 28, held: 34, labels: ["DM", "DM Practical"] },
    ]);
  });

  it("hands back what it could not place, rather than dropping it", () => {
    const { matched, unmatched } = matchRows(
      [row({ subject: "DM" }), row({ subject: "Yoga" })],
      MODULES,
    );
    expect(matched).toHaveLength(1);
    expect(unmatched.map((r) => r.subject)).toEqual(["Yoga"]);
  });

  it("refuses a row that cannot be true", () => {
    const { matched, unmatched } = matchRows(
      [row({ subject: "DM", attended: 30, held: 24 }), row({ subject: "DS", held: 0, attended: 0 })],
      MODULES,
    );
    expect(matched).toEqual([]);
    expect(unmatched).toHaveLength(2);
  });
});
