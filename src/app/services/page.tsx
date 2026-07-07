import { getDomainPageData } from "@/lib/domain";
import { notFound } from "next/navigation";
import AllServicesClient from "./AllServicesClient";
import type { Metadata } from "next";
import { slugify } from "@/lib/slug";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bibekenterprises.com";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getDomainPageData();
  if (!data) return { title: "All Services" };
  const { domain, seo } = data;
  const title = `All Services | ${domain.name}`;
  const description =
    seo?.meta_description ??
    `Browse all home appliance repair and maintenance services offered by ${domain.name}. AC, refrigerator, washing machine, geyser repair and more — book online instantly.`;
  const keywords =
    seo?.meta_keywords ??
    `home appliance repair, AC repair, refrigerator repair, washing machine repair, ${domain.name}`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: `${SITE_URL}/services` },
    openGraph: { title, description, siteName: domain.name, type: "website", url: `${SITE_URL}/services` },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function AllServicesPage() {
  const data = await getDomainPageData();
  if (!data) notFound();

  const { domain, profile, services, categories, cities } = data;
  const brand = domain.primary_color || "#1A3FA4";
  const siteName = domain.name;
  const phone = profile?.support_phone || "+91 80000 00000";

  // ── JSON-LD: ItemList — all visible services for Google ─────────────────
  const visibleServices = services.filter((s) => s.is_visible);
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/services#list`,
    name: `All Services — ${siteName}`,
    numberOfItems: visibleServices.length,
    itemListElement: visibleServices.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: `${SITE_URL}/services/${slugify(s.name)}`,
      description: s.description,
    })),
  };

  // ── JSON-LD: WebPage + BreadcrumbList for /services ──────────────────────
  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/services#webpage`,
    name: `All Services | ${siteName}`,
    description: `Browse all home appliance repair and maintenance services offered by ${siteName}. Book instantly online.`,
    url: `${SITE_URL}/services`,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "All Services", item: `${SITE_URL}/services` },
      ],
    },
    provider: {
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#business`,
      name: siteName,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <AllServicesClient
      services={services.filter((s) => s.is_visible)}
      categories={categories}
      cities={cities}
      brand={brand}
      siteName={siteName}
      phone={phone}
      domainId={domain.id}
    />
    </>
  );
}
