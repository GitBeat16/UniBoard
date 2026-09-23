import { describe, expect, it } from "vitest";
import { asDayOrder, batchesIn, gridToEntries, type TimetableGrid } from "./grid";
import { PICT } from "./__fixtures__/pict-timetable";

const on = (weekday: number, batch?: string) =>
  gridToEntries(PICT, { batch }).filter((e) => e.weekday === weekday);

const names = (weekday: number, batch?: string) => on(weekday, batch).map((e) => e.moduleName);

describe("finding the batches", () => {
  it("picks up the four batches the timetable splits into", () => {
    expect(batchesIn(PICT)).toEqual(["E3", "F3", "G3", "H3"]);
  });

  it("finds none in a timetable that is not split", () => {
    const plain: TimetableGrid = {
      ...PICT,
      rows: [
        {
          startTime: "09:00",
          endTime: "10:00",
          cells: ["Databases [LT1]", "", "", "", "", ""],
        },
      ],
    };
    expect(batchesIn(plain)).toEqual([]);
  });
});

describe("a G3 student's week", () => {
  it("keeps Monday whole, and leaves F3's practical out", () => {
    expect(names(1, "G3")).toEqual(["MDM", "DS", "UHV", "DM", "CEP"]);
  });

  it("gives Tuesday the tutorial in G3's own room", () => {
    expect(names(2, "G3")).toEqual(["EEFM", "DM", "UHV", "MDM TUT"]);
    const tut = on(2, "G3").at(-1);
    expect(tut?.room).toBe("A1-311");
    expect(tut?.type).toBe("tutorial");
  });

  it("gives Wednesday all six of its hours, not one", () => {
    // The whole reason for this rewrite: Wednesday used to come back with a
    // single class on it.
    expect(names(3, "G3")).toEqual(["Mentor Meet", "DM", "DS", "COA", "FLS"]);
  });

  it("reads Thursday's merged cell as one two-hour lab", () => {
    const thursday = on(4, "G3");
    expect(thursday[0]).toMatchObject({
      moduleName: "DSL",
      startTime: "10:00",
      endTime: "12:00",
      type: "lab",
    });
    expect(names(4, "G3")).toEqual(["DSL", "DS", "COA", "COAL"]);
  });

  it("keeps Friday's afternoon lab and its own PDCR slot", () => {
    expect(names(5, "G3")).toEqual(["MDM", "COA", "DSL", "PDCR"]);
  });

  it("leaves Saturday empty, because it is", () => {
    expect(names(6, "G3")).toEqual([]);
  });

  it("comes to a full week, not a quarter of one", () => {
    expect(gridToEntries(PICT, { batch: "G3" })).toHaveLength(22);
  });
});

describe("the other batches get their own week", () => {
  it("sends F3 to FLS on Monday afternoon, where G3 has nothing", () => {
    expect(names(1, "F3")).toEqual(["MDM", "DS", "UHV", "DM", "FLS"]);
  });

  it("gives E3 the Thursday lab G3 does not have", () => {
    expect(on(4, "E3")[0]).toMatchObject({ moduleName: "COAL", endTime: "12:00" });
  });

  it("puts every batch in the same lectures", () => {
    const lectures = (batch: string) =>
      gridToEntries(PICT, { batch })
        .filter((e) => e.type === "lecture")
        .map((e) => `${e.weekday} ${e.startTime} ${e.moduleName}`);
    expect(lectures("E3")).toEqual(lectures("H3"));
  });
});

describe("without a batch", () => {
  it("keeps everything, so nothing is lost by not choosing", () => {
    const all = gridToEntries(PICT);
    expect(all.filter((e) => e.weekday === 3)).toHaveLength(7);
  });
});

describe("breaks and blanks", () => {
  it("does not import lunch", () => {
    const all = gridToEntries(PICT).map((e) => e.moduleName.toLowerCase());
    expect(all.some((n) => n.includes("break"))).toBe(false);
  });

  it("ignores a column that is not a weekday", () => {
    const withJunk: TimetableGrid = {
      ...PICT,
      days: ["Time", ...PICT.days],
      rows: PICT.rows.map((r) => ({ ...r, cells: ["10:00 to 11:00", ...r.cells] })),
    };
    expect(gridToEntries(withJunk, { batch: "G3" })).toHaveLength(22);
  });
});

describe("the afternoon", () => {
  it("reads a 12-hour grid as one day, not two", () => {
    // Printed exactly as PICT prints it: 10 to 12, then 12:45 to 01:45.
    const rows = asDayOrder([
      { startTime: "10:00", endTime: "11:00", cells: [] },
      { startTime: "12:00", endTime: "12:45", cells: [] },
      { startTime: "12:45", endTime: "01:45", cells: [] },
      { startTime: "01:45", endTime: "02:45", cells: [] },
      { startTime: "03:00", endTime: "04:00", cells: [] },
      { startTime: "04:00", endTime: "05:00", cells: [] },
    ]);
    expect(rows.map((r) => `${r.startTime}-${r.endTime}`)).toEqual([
      "10:00-11:00",
      "12:00-12:45",
      "12:45-13:45",
      "13:45-14:45",
      "15:00-16:00",
      "16:00-17:00",
    ]);
  });

  it("leaves a grid already on a 24-hour clock alone", () => {
    const rows = asDayOrder([
      { startTime: "09:00", endTime: "10:30", cells: [] },
      { startTime: "14:00", endTime: "15:00", cells: [] },
    ]);
    expect(rows.map((r) => r.startTime)).toEqual(["09:00", "14:00"]);
  });

  it("puts an afternoon class in the afternoon, end to end", () => {
    const twelveHour: TimetableGrid = {
      days: ["Monday"],
      rows: [
        { startTime: "10:00", endTime: "11:00", cells: ["DM [A1-213]"] },
        { startTime: "01:45", endTime: "02:45", cells: ["COA [A1-213]"] },
      ],
      confidence: "high",
      notes: null,
    };
    expect(gridToEntries(twelveHour)[1]).toMatchObject({
      moduleName: "COA",
      startTime: "13:45",
      endTime: "14:45",
    });
  });
});
