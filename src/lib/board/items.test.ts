import { describe, expect, it } from "vitest";
import type { WorkItem } from "@/lib/work/urgency";
import {
  buildBoard,
  eventUrgency,
  hangOf,
  hasTag,
  parseTags,
  topTags,
  twoColumns,
  type BoardEvent,
} from "./items";

const now = new Date("2026-09-21T10:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();

const work = (over: Partial<WorkItem> = {}): WorkItem & { shape: null } => ({
  id: "w1",
  kind: "assignment",
  title: "DBMS assignment",
  at: inHours(30),
  moduleId: "m1",
  moduleName: "Databases",
  tone: "sky",
  status: "not_started",
  weight: null,
  estimatedHours: 2,
  shape: null,
  ...over,
});

const event = (over: Partial<BoardEvent> = {}): BoardEvent => ({
  id: "e1",
  title: "Hackathon kickoff",
  startsAt: inHours(50),
  endsAt: null,
  location: "Main auditorium",
  details: null,
  tags: ["Coding"],
  visibility: "university",
  mine: false,
  mark: null,
  shape: null,
  ...over,
});

describe("buildBoard", () => {
  it("pins own work, own events and saved shared events — most urgent first", () => {
    const { pinned } = buildBoard({
      work: [work({ id: "later", at: inHours(24 * 10) }), work({ id: "soon", at: inHours(5) })],
      events: [
        event({ id: "mine", mine: true, visibility: "private", startsAt: inHours(30) }),
        event({ id: "saved", mark: "save", startsAt: inHours(80) }),
      ],
      now,
    });
    expect(pinned.map((c) => c.id)).toEqual(["soon", "mine", "saved", "later"]);
  });

  it("puts undecided classmates' events in the campus tray, never on the board", () => {
    const { pinned, campus } = buildBoard({ work: [], events: [event()], now });
    expect(pinned).toHaveLength(0);
    expect(campus.map((e) => e.id)).toEqual(["e1"]);
  });

  it("drops hidden events everywhere, and ended ones from the tray", () => {
    const { pinned, campus } = buildBoard({
      work: [],
      events: [
        event({ id: "hidden", mark: "hide" }),
        event({ id: "over", startsAt: inHours(-5), endsAt: inHours(-3) }),
      ],
      now,
    });
    expect(pinned).toHaveLength(0);
    expect(campus).toHaveLength(0);
  });

  it("gives each kind its default shape until one is chosen", () => {
    const { pinned } = buildBoard({
      work: [work(), work({ id: "x", kind: "exam", status: null })],
      events: [event({ mine: true }), event({ id: "e2", mine: true, shape: "sticky" })],
      now,
    });
    const shapeOf = (id: string) => pinned.find((c) => c.id === id)?.shape;
    expect(shapeOf("w1")).toBe("index");
    expect(shapeOf("x")).toBe("tag");
    expect(shapeOf("e1")).toBe("polaroid");
    expect(shapeOf("e2")).toBe("sticky");
  });

  it("tags work with its kind and module so the filter row can find it", () => {
    const { pinned } = buildBoard({ work: [work()], events: [], now });
    expect(pinned[0].tags).toEqual(["Hand-in", "Databases"]);
  });
});

describe("eventUrgency", () => {
  it("is today while an event is on, done once it has ended", () => {
    expect(eventUrgency({ startsAt: inHours(-0.5), endsAt: inHours(1) }, now)).toBe("today");
    expect(eventUrgency({ startsAt: inHours(-3), endsAt: inHours(-1) }, now)).toBe("done");
  });
  it("assumes an hour when no end is given", () => {
    expect(eventUrgency({ startsAt: inHours(-0.5), endsAt: null }, now)).toBe("today");
    expect(eventUrgency({ startsAt: inHours(-2), endsAt: null }, now)).toBe("done");
  });
});

describe("hangOf", () => {
  it("hangs a card the same way every time, within a gentle range", () => {
    expect(hangOf("event:abc")).toEqual(hangOf("event:abc"));
    for (const k of ["a", "b", "assignment:1", "exam:2", "event:3"]) {
      const { tilt, pinX } = hangOf(k);
      expect(Math.abs(tilt)).toBeLessThanOrEqual(3);
      expect(Math.abs(pinX)).toBeLessThanOrEqual(12);
    }
  });
});

describe("twoColumns", () => {
  it("deals row by row so the top row holds the two most urgent", () => {
    expect(twoColumns([1, 2, 3, 4, 5])).toEqual([
      [1, 3, 5],
      [2, 4],
    ]);
  });
});

describe("tags", () => {
  it("parses, trims #, and de-duplicates ignoring case", () => {
    expect(parseTags("Hackathon, #coding , hackathon,  ,Free food")).toEqual([
      "Hackathon",
      "coding",
      "Free food",
    ]);
  });

  it("caps at six", () => {
    expect(parseTags("a,b,c,d,e,f,g,h")).toHaveLength(6);
  });

  it("offers the most-used tags as filters, matching case-insensitively", () => {
    const { pinned } = buildBoard({
      work: [work(), work({ id: "w2" })],
      events: [event({ mine: true, tags: ["databases"] })],
      now,
    });
    expect(topTags(pinned)[0]).toBe("Databases");
    expect(hasTag(pinned[2], "DATABASES")).toBe(true);
  });
});
