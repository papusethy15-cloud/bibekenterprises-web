/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Standalone output — self-contained bundle for VPS (no node_modules copy needed).
  // PM2 / systemd starts: node .next/standalone/server.js
  output: "standalone",

  // Suppress fetch-failed noise during `npm run build` when backend is offline.
  // Set SKIP_API_DURING_BUILD=true in .env.local for local builds without a running backend.
  // On VPS the backend is always up before build so this stays unset (default: fetch runs).
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // Allow external images (logo_url, og_image_url, banner_url — Cloudinary/MinIO/CDN)
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },

  // Pass domain identity as a server-side env var for ISR cache keys
  env: {
    NEXT_PUBLIC_DOMAIN_SLUG: process.env.NEXT_PUBLIC_DOMAIN_SLUG || "bibekenterprises",
    NEXT_PUBLIC_DOMAIN_ID:   process.env.NEXT_PUBLIC_DOMAIN_ID   || "",
  },
};

module.exports = nextConfig;
