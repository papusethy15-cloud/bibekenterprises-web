import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bibekenterprises.com";

/**
 * robots.txt — Allows full crawl of public marketing/service pages.
 * Disallows private/customer-account areas, auth flows, and API routes so
 * search engines never index logged-in customer data, bookings, or PII.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/login",
          "/api/",
          "/customer/",      // customer dashboard, bookings, addresses, profile — private
          "/customer",
          "/booking",         // booking flow — dynamic, do not index
          "/booking/success", // post-payment confirmation, contains order data
          "/*?*token=*",      // any tokenised/auth deep-links
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
