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
};

module.exports = nextConfig;
