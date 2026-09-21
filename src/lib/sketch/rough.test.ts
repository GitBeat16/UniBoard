import { describe, expect, it } from "vitest";
import { sectorPoints, seedOf, sketchBar, sketchRing } from "./rough";

const ring = (value: number, seedKey = "mod-1") =>
  sketchRing({ size: 72, thickness: 9, value, seedKey });

describe("sketchRing", () => {
  it("is deterministic for a key — server and browser draw the same squiggle", () => {
    expect(ring(64)).toEqual(ring(64));
  });

  it("wobbles differently for different keys", () => {
    expect(ring(64, "a").track[0].d).not.toBe(ring(64, "b").track[0].d);
  });

  it("draws only the empty track at 0%, and for NaN", () => {
    for (const v of [0, Number.NaN, -20]) {
      const s = ring(v);
      expect(s.track).toHaveLength(2);
      expect(s.fill).toHaveLength(0);
      expect(s.edge).toHaveLength(0);
    }
  });

  it("fills a full ring at 100% without a start tick", () => {
    const s = ring(100);
    expect(s.fill.length).toBeGreaterThan(0);
    expect(s.edge).toHaveLength(0);
  });

  it("clamps values above 100", () => {
    expect(ring(140)).toEqual(ring(100));
  });

  it("marks where a partial ring starts", () => {
    expect(ring(50).edge.length).toBeGreaterThan(0);
  });
});

describe("sectorPoints", () => {
  it("starts at 12 o'clock and sweeps clockwise", () => {
    const pts = sectorPoints(50, 50, 40, 30, 0.25);
    const [x0, y0] = pts[0];
    expect(x0).toBeCloseTo(50);
    expect(y0).toBeCloseTo(10);
    // A quarter turn clockwise ends at 3 o'clock on the outer edge.
    const outerEnd = pts[pts.length / 2 - 1];
    expect(outerEnd[0]).toBeCloseTo(90);
    expect(outerEnd[1]).toBeCloseTo(50);
  });
});

describe("sketchBar", () => {
  it("has no fill at 0% and a fill otherwise", () => {
    const opts = { width: 240, height: 18, seedKey: "budget" };
    expect(sketchBar({ ...opts, value: 0 }).fill).toHaveLength(0);
    expect(sketchBar({ ...opts, value: 40 }).fill.length).toBeGreaterThan(0);
  });
});

describe("seedOf", () => {
  it("never returns 0, which rough.js reads as 'random'", () => {
    for (const k of ["", "a", "budget", "00000000-0000-0000-0000-000000000000"]) {
      expect(seedOf(k)).toBeGreaterThan(0);
    }
  });
});
