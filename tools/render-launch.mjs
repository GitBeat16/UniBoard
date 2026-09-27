/**
 * Renders the launch film from the real app, frame by frame.
 *
 *   npm run dev            # in another terminal
 *   node tools/render-launch.mjs [--base http://localhost:3000] [--out public/media/launch/uniboard-launch]
 *                                [--from 0] [--to <last>] [--half] [--audio <file.wav>]
 *                                [--stills 30,200,480]   # just PNGs of those frames, for checking
 *
 * Needs Playwright (`npx playwright install chromium` once) and ffmpeg on PATH.
 *
 * How it stays exact: the page runs on Playwright's fake clock. For every
 * frame the script sets the frame number, then advances the clock by exactly
 * one frame's time — so the app's own animations (Flora, pins, the logo),
 * which run on timers, move in step with the film however long a screenshot
 * takes. Frames are piped straight into ffmpeg; nothing large lands on disk.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const base = opt("base", "http://localhost:3000");
const out = opt("out", "public/media/launch/uniboard-launch");
const audio = opt("audio", null);
const half = flag("half");
const stills = opt("stills", null);

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is not installed here: npx playwright install chromium, and npm i -D playwright");
  process.exit(1);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--font-render-hinting=none", "--disable-lcd-text"],
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: half ? 0.5 : 1,
});

await page.clock.install({ time: new Date("2026-09-28T00:00:00") });
await page.goto(`${base}/preview/launch?render=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__film));
await page.evaluate(() => document.fonts.ready);
// Warm the image cache, so a scene's screenshots are there on its first frame.
await page.evaluate(async () => {
  const ids = ["import", "attendance", "advisor", "board", "money"];
  await Promise.all(
    ids.map(
      (id) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve(null);
          img.src = `/media/tour/${id}.webp`;
        }),
    ),
  );
});
await page.clock.pauseAt(new Date("2026-09-28T00:00:05"));

const { total, fps } = await page.evaluate(() => ({ total: window.__film.total, fps: window.__film.fps }));
const frameMs = 1000 / fps;
const film = page.locator("[data-film]");

async function draw(n) {
  await page.evaluate((f) => window.__film.setFrame(f), n);
  await page.clock.runFor(frameMs);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => null))));
}

if (stills) {
  // Checking mode: play up to each requested frame, save it as a PNG.
  const wanted = stills.split(",").map(Number).sort((a, b) => a - b);
  mkdirSync("launch-stills", { recursive: true });
  let f = 0;
  for (const w of wanted) {
    // Start a few frames early so that scene's own entrances have run.
    for (f = Math.max(f, w - 45); f <= w; f++) await draw(f);
    await film.screenshot({ path: `launch-stills/${String(w).padStart(4, "0")}.png` });
    console.log(`launch-stills/${String(w).padStart(4, "0")}.png`);
  }
  await browser.close();
  process.exit(0);
}

const from = Number(opt("from", 0));
const to = Math.min(total - 1, Number(opt("to", total - 1)));
mkdirSync(dirname(out), { recursive: true });

const ffArgs = [
  "-v", "error", "-y",
  "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
  ...(audio ? ["-ss", String(from / fps), "-i", audio, "-shortest", "-c:a", "aac", "-b:a", "192k"] : ["-an"]),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  `${out}.mp4`,
];
const ff = spawn("ffmpeg", ffArgs, { stdio: ["pipe", "inherit", "inherit"] });
const finished = new Promise((resolve, reject) => ff.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg exited ${c}`)))));

const started = Date.now();
for (let n = from; n <= to; n++) {
  await draw(n);
  const png = await film.screenshot({ type: "png" });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  if (n % 60 === 0) {
    const rate = (n - from + 1) / ((Date.now() - started) / 1000);
    console.log(`frame ${n}/${to} · ${rate.toFixed(1)} fps`);
  }
}
ff.stdin.end();
await finished;
await browser.close();
console.log(`${out}.mp4`);
