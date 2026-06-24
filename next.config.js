/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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

  // ── API Proxy Rewrites ──────────────────────────────────────────────────────
  // All /api/v1/* requests from the browser are rewritten through Next.js to
  // the FastAPI backend. This means the browser always talks to the SAME origin
  // (Next.js dev server / production domain) — no CORS issues whatsoever.
  // Set BACKEND_URL in .env.local for production (e.g. https://api.yourdomain.com)
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
      "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
