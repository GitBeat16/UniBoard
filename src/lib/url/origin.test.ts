import { describe, expect, it } from "vitest";
import { canonicalOrigin, requestOrigin } from "./origin";

describe("requestOrigin", () => {
  it("uses http for localhost", () => {
    expect(requestOrigin({ host: "localhost:3000" })).toBe("http://localhost:3000");
  });

  it("trusts the forwarded proto and host a proxy sets", () => {
    expect(
      requestOrigin({
        host: "internal:3000",
        forwardedHost: "uniboard-git-x.vercel.app",
        forwardedProto: "https",
      }),
    ).toBe("https://uniboard-git-x.vercel.app");
  });

  it("keeps http for a phone testing against a LAN address", () => {
    expect(requestOrigin({ host: "192.168.1.8:3000", forwardedProto: "http" })).toBe(
      "http://192.168.1.8:3000",
    );
  });

  it("returns null with no host", () => {
    expect(requestOrigin({})).toBeNull();
  });
});

describe("canonicalOrigin", () => {
  const preview = { host: "uniboard-abc123.vercel.app", forwardedProto: "https" };

  it("prefers the explicit site URL, trailing slash trimmed", () => {
    expect(canonicalOrigin({ NEXT_PUBLIC_SITE_URL: "https://uniboard.app/" }, preview)).toBe(
      "https://uniboard.app",
    );
  });

  it("falls back to Vercel's production URL, never the preview", () => {
    expect(
      canonicalOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "uniboard.vercel.app" }, preview),
    ).toBe("https://uniboard.vercel.app");
  });

  it("uses the request when nothing is configured (local dev)", () => {
    expect(canonicalOrigin({}, { host: "localhost:3000" })).toBe("http://localhost:3000");
  });
});
