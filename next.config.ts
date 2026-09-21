import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // Shown on Me, so "which build am I looking at?" has an answer on the phone.
  // The commit is Vercel's; locally there is none, and the footer says "dev".
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },

  // Keeps the dev badge out of design screenshots.
  devIndicators: false,

  // There is a stray package-lock.json in the home directory; without this,
  // Turbopack walks up and guesses the wrong workspace root.
  turbopack: {
    root: __dirname,
  },

  experimental: {
    serverActions: {
      // Timetable photos and PDFs go through a Server Action, whose default
      // body limit is 1 MB — a phone photo is 2–4 MB. The ceiling that actually
      // binds is Vercel's 4.5 MB request limit, so: 4 MB of file (MAX_UPLOAD in
      // timetable/actions.ts) plus room for the multipart framing.
      bodySizeLimit: "4.4mb",
    },
  },
};

export default nextConfig;
