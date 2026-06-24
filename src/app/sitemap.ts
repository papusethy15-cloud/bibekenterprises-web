import type { MetadataRoute } from "next";
import { getDomainPageData } from "@/lib/domain";
import { slugify } from "@/lib/slug";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bibekenterprises.com";

/**
 * Dynamic sitemap.xml — automatically includes every visible service linked
 * to this domain in the Admin Dashboard. Regenerated on each request window
 * per the ISR revalidate setting in lib/domain.ts, so new services appear
 * without a redeploy.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getDomainPageData();
  const services = data?.services?.filter((s) => s.is_visible) ?? [];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,              lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE_URL}/services`,      lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${SITE_URL}/booking`,       lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/about`,         lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`,       lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE_URL}/terms`,         lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE_URL}/refund-policy`, lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${SITE_URL}/services/${slugify(s.name)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: s.is_featured ? 0.9 : 0.7,
  }));

  return [...staticRoutes, ...serviceRoutes];
}
