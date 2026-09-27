/**
 * Captures the landing page's tour stills from the real app.
 *
 *   npm run dev            # in another terminal
 *   node tools/capture-tour.mjs [http://localhost:3000]
 *
 * Needs Playwright (`npx playwright install chromium` once) and ffmpeg on PATH.
 * For each scene in src/lib/tour.ts it opens /preview/tour?scene=<id>, lets
 * the entrances finish, photographs the phone at 2× and writes
 * public/media/tour/<id>.webp — the images the circular gallery shows.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const outDir = "public/media/tour";

// The scene ids, read from the one list rather than repeated here.
const ids = [...readFileSync("src/lib/tour.ts", "utf8").matchAll(/^\s*id: "([a-z-]+)",$/gm)].map((m) => m[1]);
if (!ids.length) {
  console.error("No scenes found in src/lib/tour.ts");
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is not installed here: npx playwright install chromium, and npm i -D playwright");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "tour-stills-"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 2 });

for (const id of ids) {
  await page.goto(`${base}/preview/tour?scene=${id}`, { waitUntil: "networkidle" });
  const still = page.locator(`[data-tour-still="${id}"]`);
  await still.waitFor();
  await page.waitForTimeout(2500); // entrances, count-ups and pins settle
  const png = join(tmp, `${id}.png`);
  await still.screenshot({ path: png });
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-c:v", "libwebp", "-quality", "82", join(outDir, `${id}.webp`)]);
  console.log(`${outDir}/${id}.webp`);
}

await browser.close();
rmSync(tmp, { recursive: true, force: true });
