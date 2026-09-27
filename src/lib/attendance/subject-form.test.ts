import { describe, expect, it } from "vitest";
import { parseSubjectEdit, sameName } from "./subject-form";

const TODAY = "2026-09-27";
const base = { name: "DM", code: "", tone: "sky", threshold: "", attended: "", held: "", asOf: "" };
const parse = (over: Partial<typeof base>) => parseSubjectEdit({ ...base, ...over }, TODAY);

describe("editing a subject", () => {
  it("accepts a plain rename and tidies it", () => {
    expect(parse({ name: "  Discrete   Maths " })).toMatchObject({
      ok: true,
      value: { name: "Discrete Maths", code: null, threshold: null, official: null },
    });
  });

  it("upper-cases a course code", () => {
    expect(parse({ code: "cs201" })).toMatchObject({ ok: true, value: { code: "CS201" } });
  });

  it("refuses an empty name and an unknown colour", () => {
    expect(parse({ name: "  " }).ok).toBe(false);
    expect(parse({ tone: "pink" }).ok).toBe(false);
  });

  it("takes a threshold as a whole percentage, or none to follow the university", () => {
    expect(parse({ threshold: "80" })).toMatchObject({ ok: true, value: { threshold: 80 } });
    expect(parse({ threshold: "0" }).ok).toBe(false);
    expect(parse({ threshold: "101" }).ok).toBe(false);
    expect(parse({ threshold: "75.5" }).ok).toBe(false);
  });
});

describe("correcting the college figure", () => {
  it("takes all three fields", () => {
    expect(parse({ attended: "32", held: "40", asOf: "2026-09-25" })).toMatchObject({
      ok: true,
      value: { official: { attended: 32, held: 40, asOf: "2026-09-25" } },
    });
  });

  it("clears it when all three are emptied", () => {
    expect(parse({})).toMatchObject({ ok: true, value: { official: null } });
  });

  it("refuses half a figure, which the maths could not carry forward", () => {
    expect(parse({ attended: "32", held: "40" })).toMatchObject({ ok: false });
    expect(parse({ asOf: "2026-09-25" })).toMatchObject({ ok: false });
  });

  it("refuses a figure that cannot be true", () => {
    expect(parse({ attended: "41", held: "40", asOf: "2026-09-25" }).ok).toBe(false);
    expect(parse({ attended: "0", held: "0", asOf: "2026-09-25" }).ok).toBe(false);
    expect(parse({ attended: "3.5", held: "40", asOf: "2026-09-25" }).ok).toBe(false);
    expect(parse({ attended: "-1", held: "40", asOf: "2026-09-25" }).ok).toBe(false);
  });

  it("refuses a date that has not happened yet", () => {
    expect(parse({ attended: "30", held: "40", asOf: "2026-09-28" }).ok).toBe(false);
    expect(parse({ attended: "30", held: "40", asOf: TODAY }).ok).toBe(true);
  });

  it("allows a perfect record and a missed-everything one", () => {
    expect(parse({ attended: "40", held: "40", asOf: "2026-09-25" }).ok).toBe(true);
    expect(parse({ attended: "0", held: "12", asOf: "2026-09-25" }).ok).toBe(true);
  });
});

describe("spotting a duplicate", () => {
  it("treats punctuation and case as the same name", () => {
    expect(sameName("D.M", "dm")).toBe(true);
    expect(sameName("Data Structures", "data-structures")).toBe(true);
    expect(sameName("DS", "DSL")).toBe(false);
  });
});
