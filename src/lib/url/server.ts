import { headers } from "next/headers";
import { canonicalOrigin, requestOrigin, type OriginHeaders } from "./origin";

async function read(): Promise<OriginHeaders> {
  const h = await headers();
  return {
    host: h.get("host"),
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
  };
}

/** Where this request came from. For auth redirects. */
export async function getRequestOrigin() {
  return requestOrigin(await read()) ?? "http://localhost:3000";
}

/** The stable production address. For links that outlive the request. */
export async function getCanonicalOrigin() {
  return (
    canonicalOrigin(
      {
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      },
      await read(),
    ) ?? "http://localhost:3000"
  );
}
