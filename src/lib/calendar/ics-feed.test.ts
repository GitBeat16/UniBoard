import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine, toIcsDate, type FeedEvent } from "./ics-feed";

const STAMP = new Date("2026-09-20T12:00:00Z");

// Built from its char code so the intent survives any copy-paste or shell
// round-trip. Written as a literal, a lost backslash makes these tests pass
// for the wrong reason instead of failing.
const BS = String.fromCharCode(92);

const event = (over: Partial<FeedEvent> = {}): FeedEvent => ({
  uid: "class-1",
  title: "Databases",
  startsAt: "2026-09-21T09:00:00Z",
  endsAt: "2026-09-21T10:50:00Z",
  ...over,
});

describe("escaping", () => {

  it("escapes a backslash by doubling it", () => {
    expect(escapeText(`a${BS}b`)).toBe(`a${BS}${BS}b`);
  });

  it("escapes semicolons and commas", () => {
    expect(escapeText("Lab; room 2, floor 1")).toBe(
      `Lab${BS}; room 2${BS}, floor 1`,
    );
  });

  it("escapes newlines, including CRLF, as a literal \\n", () => {
    expect(escapeText("line\nbreak")).toBe(`line${BS}nbreak`);
    expect(escapeText("a\r\nb")).toBe(`a${BS}nb`);
  });

  it("escapes the backslash before the other specials, not after", () => {
    // Escaping ";" first would turn the input into a backslash followed by
    // an escaped semicolon, and the later backslash pass would corrupt it.
    expect(escapeText(`${BS};`)).toBe(`${BS}${BS}${BS};`);
  });
});

describe("line folding", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:Databases")).toBe("SUMMARY:Databases");
  });

  it("folds long lines with a leading space on continuations", () => {
    const folded = foldLine("SUMMARY:" + "a".repeat(200));
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts.slice(1)) expect(part.startsWith(" ")).toBe(true);
  });

  it("folds by bytes, not characters", () => {
    // 40 emoji = 160 bytes but only 40 code points; a character-based fold
    // would wrongly leave this on one line.
    const line = "SUMMARY:" + "😀".repeat(40);
    const folded = foldLine(line);
    expect(folded).toContain("\r\n ");
    for (const part of folded.split("\r\n")) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(76);
    }
  });

  it("never splits a multi-byte character across two lines", () => {
    const folded = foldLine("SUMMARY:" + "é".repeat(100));
    for (const part of folded.split("\r\n")) {
      expect(part).not.toContain("�");
    }
  });
});

describe("dates", () => {
  it("writes UTC basic format", () => {
    expect(toIcsDate("2026-09-21T09:00:00Z")).toBe("20260921T090000Z");
  });
});

describe("buildIcs", () => {
  it("produces a well-formed calendar with CRLF endings", () => {
    const ics = buildIcs([event()], { name: "UniBoard", stamp: STAMP });

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("\r\n");
    expect(ics.split("\n").every((l) => l === "" || l.endsWith("\r"))).toBe(true);
  });

  it("gives every event a stable unique UID", () => {
    const ics = buildIcs([event(), event({ uid: "class-2" })], {
      name: "UniBoard",
      stamp: STAMP,
    });
    const uids = [...ics.matchAll(/UID:(.+)\r\n/g)].map((m) => m[1]);
    expect(uids).toEqual(["class-1@uniboard", "class-2@uniboard"]);
    expect(new Set(uids).size).toBe(2);
  });

  it("omits optional fields rather than writing empty ones", () => {
    const ics = buildIcs([event()], { name: "UniBoard", stamp: STAMP });
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("DESCRIPTION:");
  });

  it("includes location and description when present", () => {
    const ics = buildIcs([event({ location: "Bragg 1.05", description: "Assessed" })], {
      name: "UniBoard",
      stamp: STAMP,
    });
    expect(ics).toContain("LOCATION:Bragg 1.05");
    expect(ics).toContain("DESCRIPTION:Assessed");
  });

  it("survives a title full of special characters", () => {
    const title = `Maths; Stats, Part 2${BS}3`;
    const ics = buildIcs([event({ title })], { name: "UniBoard", stamp: STAMP });
    expect(ics).toContain(`SUMMARY:Maths${BS}; Stats${BS}, Part 2${BS}${BS}3`);
  });

  it("writes a valid empty calendar when there is nothing to publish", () => {
    const ics = buildIcs([], { name: "UniBoard", stamp: STAMP });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});
