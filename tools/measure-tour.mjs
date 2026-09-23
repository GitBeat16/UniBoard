/**
 * Measures where each scene starts in the recorded tour video, by looking for
 * the frames where the caption bar changes. Paste the numbers into
 * TOUR_VIDEO in src/lib/tour.ts.
 *
 *   node tools/measure-tour.mjs [public/media/uniboard-tour.mp4]
 *
 * Needs ffmpeg on PATH. Recording itself is done with Playwright against
 * /preview/tour — see README, "The landing page tour".
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const file = process.argv[2] ?? "public/media/uniboard-tour.mp4";
const dir = mkdtempSync(join(tmpdir(), "tour-"));
const FPS = 20;

try {
  // Grey PGMs of the caption bar only: no image library needed.
  execFileSync("ffmpeg", [
    "-v", "error", "-i", file,
    "-vf", `fps=${FPS},crop=740:150:0:0,scale=160:-1,format=gray`,
    join(dir, "%04d.pgm"),
  ]);

  const frames = readdirSync(dir)
    .sort()
    .map((f) => readFileSync(join(dir, f)).subarray(-160 * 30));

  const changes = [];
  for (let i = 1; i < frames.length; i++) {
    let diff = 0;
    for (let p = 0; p < frames[i].length; p++) diff += Math.abs(frames[i][p] - frames[i - 1][p]);
    if (diff / frames[i].length > 6 && (changes.length === 0 || i - changes.at(-1) > FPS)) {
      changes.push(i);
    }
  }

  const at = [0, ...changes.map((f) => Math.round((f / FPS - 0.3) * 10) / 10)];
  console.log("chapterAt:", JSON.stringify(at));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
