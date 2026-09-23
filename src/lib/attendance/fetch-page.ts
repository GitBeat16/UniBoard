import { assertPublicUrl, IcsFetchError, readCapped } from "@/lib/ics/fetch";

const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

/**
 * Fetch an attendance page and reduce it to readable text.
 *
 * Most portals sit behind a login, so this usually comes back as a sign-in
 * form. That is said plainly rather than handed to a model to hallucinate
 * numbers out of — the screenshot route is the one that actually works, and
 * the message says so.
 *
 * The same SSRF guards as the calendar import apply: the URL is the student's
 * to choose, and the fetch happens on our server.
 */
export async function fetchPageText(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new IcsFetchError("That does not look like a URL.");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);

    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "text/html, text/plain;q=0.9, */*;q=0.5" },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new IcsFetchError("That link redirected nowhere.");
      url = new URL(location, url);
      continue;
    }

    if (!response.ok) {
      throw new IcsFetchError(
        `That page returned ${response.status}. Portals usually need a login — a screenshot works instead.`,
      );
    }

    return toText(await readCapped(response));
  }

  throw new IcsFetchError("That link redirected too many times.");
}

/** HTML down to the text a reader would see, tables included. */
export function toText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(tr|p|div|h[1-6]|li)>/gi, "\n")
    // Cells keep a separator, so "32 40" does not become "3240".
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n")
    .trim();
}

/** A page that is really a login form has no attendance on it. */
export function looksLikeSignIn(text: string): boolean {
  const head = text.slice(0, 2000).toLowerCase();
  const signals = ["password", "sign in", "log in", "login", "username"];
  const hits = signals.filter((s) => head.includes(s)).length;
  return hits >= 2 && !/\battendance\b/i.test(head);
}
