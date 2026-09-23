import { describe, expect, it } from "vitest";
import { zonedParts } from "@/lib/time/zone";
import { PICT } from "./__fixtures__/pict-timetable";
import { fromGrid, expandExtraction } from "./vision";

/**
 * The photo route end to end: the grid the model transcribes, through the
 * batch filter and the term expansion, to the rows that go in the diary.
 * Everything here except the model call itself.
 */
const TZ = "Asia/Kolkata";
// Monday 21 September 2026, in Pune.
const FROM = new Date("2026-09-21T04:30:00Z");

const run = (batch: string | null, weeks = 4) =>
  expandExtraction(fromGrid(PICT, batch), { weeks, from: FROM, timeZone: TZ });

describe("a photographed timetable, end to end", () => {
  it("offers the batches rather than importing all four", () => {
    expect(fromGrid(PICT).batches).toEqual(["E3", "F3", "G3", "H3"]);
  });

  it("fills four weeks of a G3 week", () => {
    expect(run("G3")).toHaveLength(22 * 4);
  });

  it("gives every class its own row, so the upsert has nothing to collide on", () => {
    const uids = run("G3").map((s) => s.uid);
    expect(new Set(uids).size).toBe(uids.length);
  });

  it("puts Wednesday's five classes on Wednesday, in Pune's clock", () => {
    const wednesday = run("G3", 1).filter((s) => zonedParts(s.start, TZ).weekday === 3);
    expect(wednesday.map((s) => `${zonedParts(s.start, TZ).hour}:00`)).toEqual([
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "15:00",
    ]);
  });

  it("keeps the afternoon in the afternoon", () => {
    const coa = run("G3", 1).find((s) => s.title === "COA")!;
    const at = zonedParts(coa.start, TZ);
    expect(at.hour).toBe(13);
    expect(at.minute).toBe(45);
  });

  it("marks a batch practical as a lab and a whole-class hour as a lecture", () => {
    const week = run("G3", 1);
    expect(week.find((s) => s.title === "DSL")?.type).toBe("lab");
    expect(week.find((s) => s.title === "DM")?.type).toBe("lecture");
  });

  it("gives two batches different weeks off the same photo", () => {
    const g3 = run("G3", 1).map((s) => s.title);
    const f3 = run("F3", 1).map((s) => s.title);
    expect(g3).not.toEqual(f3);
    expect(g3).toContain("CEP");
    expect(f3).toContain("FLS");
  });
});
