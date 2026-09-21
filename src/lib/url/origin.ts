/**
 * Where the app lives. Pure, so the precedence rules are testable.
 *
 * Two different questions, deliberately kept apart:
 *
 *  - `requestOrigin` — where THIS request came from. Magic links use it, so
 *    signing in on a Vercel preview lands you back on that preview.
 *  - `canonicalOrigin` — the stable production address. The calendar feed uses
 *    it, because a student pastes that link into Google Calendar once and it has
 *    to keep working after the preview deployment it was copied from is gone.
 */
export type OriginEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
};

export type OriginHeaders = {
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
};

export function requestOrigin(h: OriginHeaders): string | null {
  const host = (h.forwardedHost ?? h.host)?.split(",")[0]?.trim();
  if (!host) return null;
  const proto =
    h.forwardedProto?.split(",")[0]?.trim() ||
    (isLocal(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export function canonicalOrigin(env: OriginEnv, h: OriginHeaders): string | null {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const prod = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod.replace(/\/+$/, "")}`;
  return requestOrigin(h);
}

function isLocal(host: string) {
  return /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/.test(host);
}
