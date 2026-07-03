import { getDomainPageData } from "@/lib/domain";
import { notFound } from "next/navigation";
import AllServicesClient from "./AllServicesClient";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bibekenterprises.com";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getDomainPageData();
  if (!data) return { title: "All Services" };
  const { domain } = data;
  const title = `All Services | ${domain.name}`;
  const description = `Browse all home appliance repair and maintenance services offered by ${domain.name}. Book instantly online.`;
  return {
    title,
    description,
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
