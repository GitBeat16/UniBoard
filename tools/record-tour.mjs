/**
 * Records the landing page's tour video from the real app.
 *
 *   npm run dev            # in another terminal
 *   node tools/record-tour.mjs [http://localhost:3000]
 *
 * Needs Playwright (`npx playwright install chromium` once) and ffmpeg on PATH.
 * Writes public/media/uniboard-tour.{mp4,webm,jpg}, then prints the numbers
 * for TOUR_VIDEO in src/lib/tour.ts — paste them in.
 *
 * How it gets a clean loop: it lets the tour play once to warm up (a screen
 * rendering for the first time costs real seconds and would stretch the
 * video), watches the caption from inside the page to see exactly when each
 * scene starts, and keeps the second loop — from one "Timetable in" to the
 * next. The chapter marks are then measured from the finished file, never
 * computed from the script.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const out = "public/media/uniboard-tour";
const FIRST = "Timetable in";
const SIZE = { width: 780, height: 1688 };

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is not installed here: npx playwright install chromium, and npm i -D playwright");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "tour-rec-"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir, size: SIZE } });
const page = await context.newPage();
const origin = Date.now(); // the video starts with the page

await page.goto(`${base}/preview/tour`, { waitUntil: "networkidle" });

// Watch the caption: every change of title is a scene starting.
const starts = [];
let last = "";
for (let i = 0; i < 2400 && starts.filter((s) => s.title === FIRST).length < 3; i++) {
  const title = await page.evaluate(() => {
    const all = document.querySelectorAll(".z-30 p.text-h2");
    return all.length ? all[all.length - 1].textContent : "";
  });
  if (title && title !== last) {
    starts.push({ title, at: (Date.now() - origin) / 1000 });
    last = title;
  }
  await page.waitForTimeout(40);
}

const loops = starts.filter((s) => s.title === FIRST);
if (loops.length < 3) {
  console.error("Did not see two full loops. Starts seen:", starts);
  process.exit(1);
}
const [, from, to] = loops;
const raw = await page.video().path();
await context.close();
await browser.close();

const window = ["-ss", from.at.toFixed(2), "-to", to.at.toFixed(2)];
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, ...window, "-an",
  "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  `${out}.mp4`]);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, ...window, "-an",
  "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", `${out}.webm`]);
// The poster: a moment into the first scene, once its screen has settled.
execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "1.4", "-i", `${out}.mp4`, "-frames:v", "1", "-q:v", "3", `${out}.jpg`]);

const seconds = Number(
  execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${out}.mp4`])
    .toString()
    .trim(),
);
rmSync(dir, { recursive: true, force: true });

console.log(`Loop kept: ${from.at.toFixed(2)}s → ${to.at.toFixed(2)}s of the raw recording.`);
console.log(`seconds: ${Math.round(seconds * 10) / 10}`);
console.log("Now measure the chapters from the file: node tools/measure-tour.mjs");
