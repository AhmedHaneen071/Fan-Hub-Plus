import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The seed data uses simple SVG placeholder covers (see /public/seed).
    // Enabling SVG optimization is safe here because every SVG is a local,
    // hand-written asset — no user input ever becomes an <Image> src.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;