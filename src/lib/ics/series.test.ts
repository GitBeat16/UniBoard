import { describe, expect, it } from "vitest";
import { seriesIdFor, seriesKeyOf } from "./series";

describe("finding the slot a class belongs to", () => {
  it("takes the week off a photographed class", () => {
    expect(seriesKeyOf("vision:dm|lecture|d3|11:00-12:00:w4")).toBe(
      "vision:dm|lecture|d3|11:00-12:00",
    );
  });

  it("puts every week of a slot in the same series", () => {
    const weeks = [0, 1, 11].map((w) => seriesKeyOf(`vision:ds|lab|d1|15:00-16:00:w${w}`));
    expect(new Set(weeks).size).toBe(1);
  });

  it("takes the recurrence id off an ICS occurrence", () => {
    expect(seriesKeyOf("abc-123@uni.ac.uk::20260922T090000")).toBe("abc-123@uni.ac.uk");
  });

  it("leaves a one-off alone", () => {
    expect(seriesKeyOf("abc-123@uni.ac.uk")).toBe("abc-123@uni.ac.uk");
  });
});

describe("the series id", () => {
  it("is a uuid", () => {
    expect(seriesIdFor("user-1", "vision:dm")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("is the same on a re-import, so a slot is never split in two", () => {
    expect(seriesIdFor("user-1", "vision:dm")).toBe(seriesIdFor("user-1", "vision:dm"));
  });

  it("differs per slot and per student", () => {
    expect(seriesIdFor("user-1", "vision:dm")).not.toBe(seriesIdFor("user-1", "vision:ds"));
    expect(seriesIdFor("user-1", "vision:dm")).not.toBe(seriesIdFor("user-2", "vision:dm"));
  });
});
