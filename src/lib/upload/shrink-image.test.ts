import { describe, expect, it } from "vitest";
import { targetSize } from "./shrink-image";

describe("targetSize", () => {
  it("scales a 12 MP portrait photo to a 2400 long edge", () => {
    expect(targetSize(3024, 4032)).toEqual({ width: 1800, height: 2400 });
  });

  it("never upscales a small screenshot", () => {
    expect(targetSize(1170, 800)).toEqual({ width: 1170, height: 800 });
  });
});
