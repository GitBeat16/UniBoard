import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the dev badge out of design screenshots.
  devIndicators: false,

  // There is a stray package-lock.json in the home directory; without this,
  // Turbopack walks up and guesses the wrong workspace root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
