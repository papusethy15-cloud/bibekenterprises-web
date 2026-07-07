import type { Metadata } from "next";
import Link from "next/link";
import { getDomainPageData, DomainPageData } from "@/lib/domain";
import { DomainService, DomainCategory } from "@/types";
import ServicesSection from "./ServicesSection";
import ServiceLocations from "./ServiceLocations";
import HowItWorks from "./HowItWorks";
import WhyChooseUs from "./WhyChooseUs";
import FinalCta from "./FinalCta";
import ServiceSlider from "./ServiceSlider";
import HeroSection from "./HeroSection";
import { serviceHref, slugify } from "@/lib/slug";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bibekenterprises.com";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getDomainPageData();
  const { domain, seo, profile } = data ?? {};
  const siteName = domain?.name ?? "Bibek Enterprises";
  const title = seo?.meta_title ?? domain?.meta_title ?? `${siteName} — Home Appliance Repair & Service`;
  const desc =
    seo?.meta_description ??
    domain?.meta_desc ??
    "Professional home appliance repair and maintenance services. AC, Refrigerator, Washing Machine, Geyser & more — at your doorstep.";
  const ogImage = seo?.og_image_url ?? profile?.og_image_url ?? profile?.banner_url ?? "/og-default.jpg";
  return {
    title,
    description: desc,
    keywords: seo?.meta_keywords,
    alternates: { canonical: SITE_URL },
    openGraph: {
      title: seo?.og_title ?? title,
      description: seo?.og_description ?? desc,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo?.og_title ?? title,
      description: seo?.og_description ?? desc,
      images: ogImage ? [ogImage] : [],
    },
  };
}

// ── Fallback data when backend is unreachable ─────────────────────────────────
const FALLBACK_SERVICES: DomainService[] = [
  { domain_service_id:"f1", service_id:"f1", name:"Air Conditioner Repair",   description:"Installation, service & repair for all AC brands",      category_id:"", category_name:"AC Services",   base_price:499, gst_percent:18, duration_mins:60, is_featured:true,  is_visible:true },
  { domain_service_id:"f2", service_id:"f2", name:"Refrigerator Repair",      description:"Single door, double door & side-by-side models",         category_id:"", category_name:"Refrigeration", base_price:399, gst_percent:18, duration_mins:60, is_featured:true,  is_visible:true },
  { domain_service_id:"f3", service_id:"f3", name:"Washing Machine Repair",   description:"Front load & top load washing machines",                 category_id:"", category_name:"Laundry",       base_price:399, gst_percent:18, duration_mins:60, is_featured:false, is_visible:true },
  { domain_service_id:"f4", service_id:"f4", name:"Geyser Repair",            description:"Electric & gas water heater repair",                     category_id:"", category_name:"Water Heating", base_price:299, gst_percent:18, duration_mins:45, is_featured:false, is_visible:true },
];

export default async function HomePage() {
  const data: DomainPageData | null = await getDomainPageData();

  const domain     = data?.domain;
  const seo        = data?.seo;
  const profile    = data?.profile;
  const services   = data?.services?.length ? data.services   : FALLBACK_SERVICES;
  const categories = data?.categories ?? [];
  const cities     = data?.cities ?? [];

  const siteName    = domain?.name         ?? "Bibek Enterprises";
  const logoUrl     = profile?.logo_url    ?? domain?.logo_url ?? null;
  const brand       = domain?.primary_color ?? "#1A3FA4";
  const description = domain?.description  ?? profile?.about_short ?? "Professional home appliance repair and maintenance services.";
  const tagline     = profile?.tagline;
  const phone       = profile?.support_phone || "+91 80000 00000";
  const phoneHref   = `tel:${phone.replace(/\s/g, "")}`;
  const whatsapp    = profile?.whatsapp_number;
  const bannerUrl   = profile?.banner_url;

  const featured   = services.filter((s) => s.is_featured);
  const allVisible = services.filter((s) => s.is_visible);
  // Slider shows only admin-enabled (is_visible) services
  const sliderServices = allVisible;

  const socialLinks = [
    { url: profile?.facebook_url,  label: "Facebook" },
    { url: profile?.instagram_url, label: "Instagram" },
    { url: profile?.twitter_url,   label: "Twitter" },
    { url: profile?.youtube_url,   label: "YouTube" },
    { url: profile?.linkedin_url,  label: "LinkedIn" },
  ].filter((s) => s.url);

  const title = seo?.meta_title ?? domain?.meta_title ?? `${siteName} — Home Appliance Repair & Service`;
  const desc =
    seo?.meta_description ??
    domain?.meta_desc ??
    "Professional home appliance repair and maintenance services. AC, Refrigerator, Washing Machine, Geyser & more — at your doorstep.";

  // ── JSON-LD: WebPage (homepage) ──────────────────────────────────────────
  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    name: title,
    description: desc,
    url: SITE_URL,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#business` },
    datePublished: new Date().toISOString().split("T")[0],
    inLanguage: "en-IN",
  };

  // ── JSON-LD: ItemList (all visible services listed for Google) ───────────
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Services offered by ${siteName}`,
    description: `Complete list of home appliance repair services by ${siteName}`,
    url: `${SITE_URL}/services`,
    numberOfItems: allVisible.length,
    itemListElement: allVisible.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: `${SITE_URL}/services/${slugify(s.name)}`,
      description: s.description,
    })),
  };

  // ── JSON-LD: BreadcrumbList (homepage) ───────────────────────────────────
  const homeBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeBreadcrumb) }} />

      {/* ══════════════════════════════════════════════════════
          HERO SECTION
          Left: animated copy; Right: appliance illustration grid
          ══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[600px] lg:min-h-[680px] flex items-center">

        {/* ── Background layer ── */}
        {bannerUrl ? (
          <>
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg,rgba(255,255,255,0.97) 0%,rgba(255,255,255,0.90) 32%,rgba(255,255,255,0.45) 58%,rgba(255,255,255,0.0) 80%,rgba(255,255,255,0) 100%)",
              }}
            />
          </>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(140deg, #090f2a 0%, #1A3FA4 55%, #142d7a 100%)" }}
          />
        )}

        {/* ── Decorative animated blobs (no-banner state) ── */}
        {!bannerUrl && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute top-[-80px] right-[5%] w-[420px] h-[420px] rounded-full opacity-[0.08] animate-blob"
              style={{ background: "#F26522" }}
            />
            <div
              className="absolute bottom-[-60px] right-[30%] w-[280px] h-[280px] rounded-full opacity-[0.06] animate-blob"
              style={{ background: "#F26522", animationDelay: "5s" }}
            />
          </div>
        )}

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* ── LEFT: Hero copy — all animations in HeroSection (client component) ── */}
            <div>
              <HeroSection
                brand={brand}
                bannerUrl={bannerUrl ?? null}
                tagline={tagline || description}
                phone={phone}
                phoneHref={phoneHref}
                featured={featured}
              />
            </div>

            {/* ── RIGHT: Appliance illustration grid (shown when no banner) ── */}
            {!bannerUrl && (
              <div className="hidden lg:block relative" aria-hidden>
                {/* Outer glow */}
                <div
                  className="absolute inset-0 rounded-3xl blur-3xl opacity-20"
                  style={{ background: "#F26522" }}
                />

                {/* 2×2 appliance icon grid */}
                <div className="relative grid grid-cols-2 gap-4 p-2">
                  {[
                    { icon: "❄️", label: "Air Conditioner", delay: "200ms" },
                    { icon: "🌡️", label: "Refrigerator",    delay: "350ms" },
                    { icon: "🫧", label: "Washing Machine",  delay: "500ms" },
                    { icon: "🚿", label: "Geyser / Water",  delay: "650ms" },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      className="relative rounded-2xl p-6 flex flex-col items-center justify-center gap-3 border border-white/10 backdrop-blur-sm animate-fade-in-up hover:-translate-y-1 transition-transform duration-300 group"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        animationDelay: item.delay,
                      }}
                    >
                      <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                        {item.icon}
                      </span>
                      <span className="text-xs font-semibold text-white/60 text-center leading-snug">
                        {item.label}
                      </span>
                      {/* Corner accent */}
                      <div
                        className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full opacity-60"
                        style={{ background: "#F26522" }}
                      />
                    </div>
                  ))}
                </div>

                {/* Floating "Live" badge */}
                <div
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold shadow-lg animate-float"
                  style={{ background: "#F26522" }}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Technicians Online Now
                </div>
              </div>
            )}

          </div>{/* /grid */}
        </div>{/* /container */}
      </section>



      {/* ── Services grid (SSR, SEO-crawlable, category tabs) ── */}
      <ServicesSection services={allVisible} categories={categories} brand={brand} siteName={siteName} />

      {/* ── How It Works ── */}
      <HowItWorks brand={brand} />

      {/* ── Service Slider (replaces AMC) — shows admin-enabled services only ── */}
      <ServiceSlider services={sliderServices} brand={brand} />

      {/* ── Service Locations ── */}
      <ServiceLocations cities={cities} brand={brand} />

      {/* ── Why Choose Us ── */}
      <WhyChooseUs brand={brand} siteName={siteName} />

      {/* ── Final CTA ── */}
      <FinalCta brand={brand} phone={phone} phoneHref={phoneHref} />
    </div>
  );
}
