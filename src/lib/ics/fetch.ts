import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — a term of classes is a few hundred KB
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 12_000;

export class IcsFetchError extends Error {}

/**
 * Private, loopback, link-local and carrier-grade-NAT ranges.
 * A calendar URL is attacker-controlled input that we fetch from the server, so
 * without this check the import endpoint is an SSRF hole pointed at whatever
 * the deployment can reach — cloud metadata endpoints included.
 */
function isBlockedAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  const ip = address.toLowerCase();
  if (ip === "::" || ip === "::1") return true;
  if (ip.startsWith("fe80") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  if (ip.startsWith("::ffff:")) return isBlockedAddress(ip.slice(7));
  return false;
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new IcsFetchError("Only http and https calendar links are supported.");
  }

  // webcal:// links are common on uni portals; callers normalise before here.
  let addresses;
  try {
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new IcsFetchError(`Could not resolve ${url.hostname}.`);
  }

  if (addresses.some((a) => isBlockedAddress(a.address))) {
    throw new IcsFetchError("That link points to a private address.");
  }
}

/** Accepts the webcal:// scheme universities love and normalises it. */
export function normaliseCalendarUrl(input: string): URL {
  const trimmed = input.trim();
  const swapped = trimmed.replace(/^webcal:\/\//i, "https://");
  try {
    return new URL(swapped);
  } catch {
    throw new IcsFetchError("That does not look like a URL.");
  }
}

export async function fetchIcs(rawUrl: string): Promise<string> {
  let url = normaliseCalendarUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Re-validated every hop: checking only the first URL is defeated by a
    // public host that 302s to 169.254.169.254.
    await assertPublicUrl(url);

    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "text/calendar, text/plain;q=0.9, */*;q=0.5" },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new IcsFetchError("The calendar link redirected nowhere.");
      url = new URL(location, url);
      continue;
    }

    if (!response.ok) {
      throw new IcsFetchError(
        `The calendar link returned ${response.status}. Check it is publicly reachable.`,
      );
    }

    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      throw new IcsFetchError("That calendar is too large to import.");
    }

    const text = await readCapped(response);
    if (!/BEGIN:VCALENDAR/i.test(text)) {
      throw new IcsFetchError(
        "That link did not return a calendar. Look for an “iCal”, “ICS” or “Subscribe” export in your portal.",
      );
    }
    return text;
  }

  throw new IcsFetchError("The calendar link redirected too many times.");
}

/** Content-Length can lie, so cap while streaming too. */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new IcsFetchError("That calendar is too large to import.");
    }
    chunks.push(value as Uint8Array<ArrayBuffer>);
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}
