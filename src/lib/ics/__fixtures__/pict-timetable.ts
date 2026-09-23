import type { TimetableGrid } from "../grid";

/**
 * The SY-III timetable from PICT, transcribed the way the model is asked to
 * transcribe it: a row per time slot, a cell per weekday, merged cells
 * repeated in every row they cover.
 *
 * It has everything that used to go wrong in one page — an empty Saturday,
 * break rows, a two-hour merged lab, cells holding a different subject per
 * batch, and afternoon times printed on a 12-hour clock.
 */
export const PICT: TimetableGrid = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  rows: [
    {
      startTime: "10:00",
      endTime: "11:00",
      cells: [
        "MDM [A1-213]",
        "EEFM [A1-213]",
        "MENTOR MEET",
        "COAL E3 F3 / DSL G3 H3",
        "MDM [A1-213]",
        "",
      ],
    },
    {
      startTime: "11:00",
      endTime: "12:00",
      cells: [
        "DS [A1-213]",
        "DM [A1-213]",
        "DM [A1-213]",
        "COAL E3 F3 / DSL G3 H3",
        "COA [A1-213]",
        "",
      ],
    },
    {
      startTime: "12:00",
      endTime: "12:45",
      cells: ["LUNCH BREAK", "LUNCH BREAK", "LUNCH BREAK", "LUNCH BREAK", "LUNCH BREAK", ""],
    },
    {
      startTime: "12:45",
      endTime: "13:45",
      cells: ["UHV [A1-213]", "UHV [A1-213]", "DS [A1-213]", "DS [A1-213]", "", ""],
    },
    {
      startTime: "13:45",
      endTime: "14:45",
      cells: [
        "DM [A1-213]",
        "MDM TUT [E3-A1-213 F3-A1-111 G3-A1-311 H3-A1-311]",
        "COA [A1-213]",
        "COA [A1-213]",
        "PDCR E3 F3 / DSL G3 H3",
        "",
      ],
    },
    {
      startTime: "14:45",
      endTime: "15:00",
      cells: ["SHORT BREAK", "SHORT BREAK", "SHORT BREAK", "SHORT BREAK", "SHORT BREAK", ""],
    },
    {
      startTime: "15:00",
      endTime: "16:00",
      cells: [
        "CEP E3, G3, H3",
        "DSL E3 F3",
        "DSL E3 F3 / FLS G3",
        "COAL G3 H3 / CEP F3",
        "PDCR G3",
        "",
      ],
    },
    {
      startTime: "16:00",
      endTime: "17:00",
      cells: ["FLS F3", "DSL E3 F3", "PDCR H3", "FLS E3", "FLS H3", ""],
    },
  ],
  confidence: "high",
  notes: null,
};
