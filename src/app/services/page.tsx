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
  };
}

export default async function AllServicesPage() {
  const data = await getDomainPageData();
  if (!data) notFound();

  const { domain, profile, services, categories, cities } = data;
  const brand = domain.primary_color || "#1A3FA4";
  const siteName = domain.name;
  const phone = profile?.support_phone || "+91 80000 00000";

  return (
    <AllServicesClient
      services={services.filter((s) => s.is_visible)}
      categories={categories}
      cities={cities}
      brand={brand}
      siteName={siteName}
      phone={phone}
      domainId={domain.id}
    />
  );
}
