import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
