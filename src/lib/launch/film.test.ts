import { describe, expect, it } from "vitest";
import {
  SCENES,
  SCENE_START,
  TOTAL_FRAMES,
  countUp,
  interp,
  rand,
  sceneAt,
  spring,
  typed,
} from "./film";

describe("the film's timeline", () => {
  it("adds up to the length of every scene", () => {
    expect(TOTAL_FRAMES).toBe(SCENES.reduce((n, s) => n + s.frames, 0));
  });

  it("puts each frame in the right scene", () => {
    expect(sceneAt(0)).toMatchObject({ id: "night", local: 0 });
    const intro = SCENE_START.intro;
    expect(sceneAt(intro)).toMatchObject({ id: "intro", local: 0 });
    expect(sceneAt(intro - 1)).toMatchObject({ id: "whatif" });
    expect(sceneAt(TOTAL_FRAMES + 50)).toMatchObject({ id: "end" });
    expect(sceneAt(-4)).toMatchObject({ id: "night", local: 0 });
  });

  it("marks the scenes that open on a flash", () => {
    expect(sceneAt(SCENE_START.f1).wipe).toBe(true);
    expect(sceneAt(SCENE_START.night).wipe).toBeFalsy();
  });
});

describe("motion helpers", () => {
  it("interpolates and clamps", () => {
    expect(interp(5, 0, 10, 0, 100)).toBe(50);
    expect(interp(-5, 0, 10, 0, 100)).toBe(0);
    expect(interp(50, 0, 10, 0, 100)).toBe(100);
  });

  it("types a string out at a steady pace", () => {
    expect(typed("hello", 0, 10)).toBe("");
    expect(typed("hello", 12, 10, 1)).toBe("he");
    expect(typed("hello", 100, 10, 1)).toBe("hello");
  });

  it("counts up to the exact figure", () => {
    expect(countUp(0, 0, 30, 82)).toBe(0);
    expect(countUp(30, 0, 30, 82)).toBe(82);
    expect(countUp(99, 0, 30, 82)).toBe(82);
  });

  it("springs from 0 and settles at 1", () => {
    expect(spring(0, 0)).toBe(0);
    expect(Math.abs(spring(200, 0) - 1)).toBeLessThan(0.01);
  });

  it("scatters the same way every time", () => {
    expect(rand(3)).toBe(rand(3));
    expect(rand(3)).not.toBe(rand(4));
    expect(rand(3)).toBeGreaterThanOrEqual(0);
    expect(rand(3)).toBeLessThan(1);
  });
});
