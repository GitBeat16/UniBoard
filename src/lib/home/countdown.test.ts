import { describe, expect, it } from "vitest";
import { classTiming, formatCountdown, greetingFor } from "./countdown";

const start = "2026-09-22T08:30:00.000Z";
const end = "2026-09-22T10:30:00.000Z";
const at = (iso: string) => new Date(iso);

describe("classTiming", () => {
  it("counts down to a class that has not started", () => {
    expect(classTiming(start, end, at("2026-09-22T06:20:00Z"))).toEqual({
      state: "upcoming",
      minutesUntil: 130,
    });
  });

  it("is live from the first minute, with how much is left and how far in", () => {
    const t = classTiming(start, end, at("2026-09-22T09:30:00Z"));
    expect(t).toEqual({ state: "live", minutesLeft: 60, progress: 50 });
  });

  it("never says zero minutes left while a class is still on", () => {
    const t = classTiming(start, end, at("2026-09-22T10:29:40Z"));
    expect(t).toMatchObject({ state: "live", minutesLeft: 1 });
  });

  it("is ended at the end time exactly", () => {
    expect(classTiming(start, end, at(end)).state).toBe("ended");
  });
});

describe("formatCountdown", () => {
  it("reads naturally at every scale", () => {
    expect(formatCountdown(0)).toBe("1 min");
    expect(formatCountdown(45)).toBe("45 min");
    expect(formatCountdown(120)).toBe("2 h");
    expect(formatCountdown(130)).toBe("2 h 10 min");
  });
  it("gives up past twelve hours, where the date says more", () => {
    expect(formatCountdown(13 * 60)).toBeNull();
  });
});

describe("greetingFor", () => {
  it("follows the day", () => {
    expect(greetingFor(8)).toBe("Good morning,");
    expect(greetingFor(14)).toBe("Good afternoon,");
    expect(greetingFor(19)).toBe("Good evening,");
    expect(greetingFor(2)).toBe("Hello,");
  });
});
