import { describe, expect, it } from "vitest";
import { nameKey, shortKey, tidyShortName, tidyUniversityName } from "./names";

describe("nameKey — matches however it was typed", () => {
  const canonical = nameKey("Pune Institute of Computer Technology");

  it.each([
    "pune institute of computer technology",
    "PUNE INSTITUTE OF COMPUTER TECHNOLOGY",
    "  Pune   Institute of Computer Technology. ",
    "Pune Institute of Computer-Technology",
  ])("%s", (typed) => {
    expect(nameKey(typed)).toBe(canonical);
  });

  it("keeps letters from other scripts", () => {
    expect(nameKey("पुणे विद्यापीठ")).not.toBe("");
  });
});

describe("shortKey", () => {
  it("treats P.I.C.T, pict and PICT as one", () => {
    expect(new Set(["P.I.C.T", "pict", "PICT", " P I C T "].map(shortKey))).toEqual(new Set(["pict"]));
  });
});

describe("tidyUniversityName", () => {
  it("title-cases an all-lower-case name, keeping small words small", () => {
    expect(tidyUniversityName("pune institute of computer technology")).toBe(
      "Pune Institute of Computer Technology",
    );
  });

  it("title-cases SHOUTING too", () => {
    expect(tidyUniversityName("UNIVERSITY OF LEEDS")).toBe("University of Leeds");
  });

  it("leaves mixed case exactly as the author typed it", () => {
    expect(tidyUniversityName("IIT Bombay")).toBe("IIT Bombay");
    expect(tidyUniversityName("McGill University")).toBe("McGill University");
  });

  it("collapses spaces and drops a trailing full stop", () => {
    expect(tidyUniversityName("  University   of Pune. ")).toBe("University of Pune");
  });

  it("capitalises a small word when it starts the name", () => {
    expect(tidyUniversityName("the open university")).toBe("The Open University");
  });
});

describe("tidyShortName", () => {
  it("upper-cases an all-lower-case short name", () => {
    expect(tidyShortName("pict")).toBe("PICT");
  });
  it("keeps deliberate mixed case", () => {
    expect(tidyShortName("IITb")).toBe("IITb");
  });
});
