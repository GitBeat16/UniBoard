import rough from "roughjs";

/**
 * Sketched chart geometry. Pure — returns path data, draws nothing.
 *
 * rough.js has a DOM-free generator, so the wobble is computed during render.
 * Every shape is seeded from a stable key (a module id, "budget", …), which
 * makes the server and the browser produce the same squiggle — no hydration
 * mismatch, and a ring does not re-wobble every time the page re-renders.
 *
 * Colour is deliberately NOT baked in: the component decides the tone, so one
 * geometry serves the attendance ring, the budget ring and the goal ring.
 */

export type SketchPath = { d: string; strokeWidth: number };
export type Sketch = {
  /** Pencil outline: the empty track. Drawn in ink. */
  track: SketchPath[];
  /** Hatched fill for the value. Drawn in the tone. */
  fill: SketchPath[];
  /** The starting tick, so 0% and 100% are distinguishable at a glance. */
  edge: SketchPath[];
};

const gen = rough.generator();

/** FNV-1a → a positive 31-bit seed. rough.js treats 0 as "random". */
export function seedOf(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2147483646) + 1;
}

const clampPct = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);

const pencil = (seed: number) => ({
  seed,
  roughness: 0.9,
  bowing: 1.2,
  stroke: "#111",
  strokeWidth: 1.3,
});

const hatch = (seed: number, gap: number) => ({
  seed,
  roughness: 0.8,
  bowing: 1.2,
  stroke: "none",
  fill: "#111",
  fillStyle: "hachure" as const,
  hachureAngle: -41,
  hachureGap: gap,
  fillWeight: 1.6,
});

function toPaths(drawable: ReturnType<typeof gen.circle>): SketchPath[] {
  return gen.toPaths(drawable).map((p) => ({ d: p.d, strokeWidth: p.strokeWidth }));
}

/** Points around a ring sector, clockwise from 12 o'clock. */
export function sectorPoints(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  fraction: number,
): Array<[number, number]> {
  const a0 = -Math.PI / 2;
  const a1 = a0 + fraction * 2 * Math.PI;
  const n = Math.max(4, Math.ceil(fraction * 48));
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + rOuter * Math.cos(a), cy + rOuter * Math.sin(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + rInner * Math.cos(a), cy + rInner * Math.sin(a)]);
  }
  return pts;
}

export function sketchRing({
  size,
  thickness,
  value,
  seedKey,
}: {
  size: number;
  thickness: number;
  /** 0–100. Clamped; NaN draws an empty ring. */
  value: number;
  seedKey: string;
}): Sketch {
  const s = seedOf(seedKey);
  const c = size / 2;
  const ro = c - 3; // room for the pencil to wander outside the box
  const ri = ro - thickness;
  const f = clampPct(value) / 100;

  const out: Sketch = { track: [], fill: [], edge: [] };
  out.track.push(...toPaths(gen.circle(c, c, ro * 2, pencil(s))));
  out.track.push(...toPaths(gen.circle(c, c, ri * 2, pencil(s + 1))));

  if (f <= 0.005) return out;

  // Hatching gets denser on small rings, or a thin wedge is just two lines.
  const gap = Math.max(2.2, thickness / 4.6);
  const inset = 1.5;

  if (f >= 0.995) {
    // A full ring: two arcs with opposite winding make a donut the hachure
    // filler can read. A sector with a 360° sweep would collapse to a line.
    const o = ro - inset;
    const i = ri + inset;
    const d =
      `M${c} ${c - o} A${o} ${o} 0 1 1 ${c - 0.01} ${c - o} Z ` +
      `M${c} ${c - i} A${i} ${i} 0 1 0 ${c + 0.01} ${c - i} Z`;
    out.fill.push(...toPaths(gen.path(d, hatch(s + 2, gap))));
  } else {
    const poly = sectorPoints(c, c, ro - inset, ri + inset, f);
    out.fill.push(...toPaths(gen.polygon(poly, hatch(s + 2, gap))));
    out.edge.push(
      ...toPaths(
        gen.linearPath(
          [
            [c, c - ro],
            [c, c - ri],
          ],
          pencil(s + 3),
        ),
      ),
    );
  }
  return out;
}

export function sketchBar({
  width,
  height,
  value,
  seedKey,
}: {
  width: number;
  height: number;
  value: number;
  seedKey: string;
}): Sketch {
  const s = seedOf(seedKey);
  const f = clampPct(value) / 100;
  const out: Sketch = { track: [], fill: [], edge: [] };
  out.track.push(...toPaths(gen.rectangle(2, 2, width - 4, height - 4, pencil(s))));
  if (f > 0.005) {
    out.fill.push(
      ...toPaths(
        gen.rectangle(4, 4, (width - 8) * f, height - 8, hatch(s + 1, Math.max(2.6, height / 5))),
      ),
    );
  }
  return out;
}
