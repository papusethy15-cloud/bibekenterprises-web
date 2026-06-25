import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getServicePageData } from "@/lib/domain";
import { slugify } from "@/lib/slug";
import { iconFor } from "@/lib/icons";
import CityPriceSelector from "../CityPriceSelector";
import ServiceDetailContent from "./ServiceDetailContent";

interface Props {
  params: { slug: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bibekenterprises.com";
const DEFAULT_CITY = process.env.NEXT_PUBLIC_DEFAULT_CITY || undefined;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getServicePageData(params.slug);
  if (!data) return { title: "Service Not Found" };

  const { domain, service, override } = data;
  const siteName = domain.name;

  const title =
    override?.meta_title ?? `${service.name} in ${domain.description ? domain.name : siteName} | ${siteName}`;
  const description =
    override?.meta_description ??
    service.description ??
    `Book professional ${service.name} with ${siteName}. Transparent pricing, certified technicians, doorstep service.`;
  const ogImage = override?.og_image_url ?? override?.image_url ?? domain.logo_url ?? undefined;
  const canonical = `${SITE_URL}/services/${slugify(service.name)}`;

  return {
    title,
    description,
    keywords: override?.meta_keywords ?? `${service.name}, ${service.category_name}, ${siteName}, appliance repair`,
    alternates: { canonical },
    openGraph: {
      title: override?.og_title ?? title,
      description: override?.og_description ?? description,
      siteName,
      type: "website",
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: override?.og_title ?? title,
      description: override?.og_description ?? description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const data = await getServicePageData(params.slug);
  if (!data) notFound();

  const { domain, profile, service, override, cityPrices, cities } = data;

  const canonicalSlug = slugify(service.name);
  if (params.slug !== canonicalSlug) {
    redirect(`/services/${canonicalSlug}`);
  }

  const brand = domain.primary_color || "#1A3FA4";
  const phone = profile?.support_phone || "+91 80000 00000";
  const phoneHref = `tel:${phone.replace(/\s/g, "")}`;
  const whatsapp = profile?.whatsapp_number ?? null;
  const siteName = domain.name;
  const image = override?.image_url || profile?.banner_url;
  const icon = iconFor(service.category_name);
  const includes = override?.includes ?? [];
  const excludes = override?.excludes ?? [];
  const faqs = override?.faqs ?? [];

  // ── JSON-LD ────────────────────────────────────────────────────────────
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: service.name,
    name: service.name,
    description: service.description || override?.meta_description,
    provider: {
      "@type": "LocalBusiness",
      name: siteName,
      image: profile?.logo_url,
      telephone: profile?.support_phone,
    },
    areaServed: cities.map((c) => ({ "@type": "City", name: c.name })),
    offers: {
      "@type": "Offer",
      price: service.base_price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };

  // AggregateRating — only added when real data exists (no fabricated ratings).
  if (profile?.avg_rating && profile?.review_count) {
    (serviceSchema as any).aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: profile.avg_rating.toFixed(1),
      reviewCount: profile.review_count,
      bestRating: "5",
      worstRating: "1",
    };
  }

  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  // BreadcrumbList — mirrors the visible breadcrumb nav below, so search
  // engines can render breadcrumb rich results in SERPs.
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "All Services", item: `${SITE_URL}/services` },
      { "@type": "ListItem", position: 3, name: service.category_name, item: `${SITE_URL}/services` },
      { "@type": "ListItem", position: 4, name: service.name, item: `${SITE_URL}/services/${canonicalSlug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-50/60 to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── Breadcrumb ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-ink-400 animate-fade-in-up flex-wrap">
          <Link href="/" className="hover:text-ink-700 transition-colors">Home</Link>
          <span className="text-ink-200">›</span>
          <Link href="/services" className="hover:text-ink-700 transition-colors">All Services</Link>
          <span className="text-ink-200">›</span>
          <Link href="/services" className="hover:text-ink-700 transition-colors">{service.category_name}</Link>
          <span className="text-ink-200">›</span>
          <span className="text-ink-600 font-medium truncate max-w-[200px]">{service.name}</span>
        </nav>
      </div>

      {/* ── Hero section ── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-14">
        {/* Decorative glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-3xl"
          style={{ background: brand }}
        />

        {/* ── 2-col grid: left content | right sticky sidebar ── */}
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">

          {/* ══ LEFT COL ══ */}
          <div className="min-w-0">
            {/* Service image */}
            <div
              className="group relative w-full rounded-2xl mb-8 overflow-hidden border border-ink-100 shadow-sm animate-fade-in-up bg-ink-50"
              style={{ aspectRatio: "4/3" }}
            >
              {image ? (
                <Image
                  src={image}
                  alt={service.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-contain object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center text-8xl transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${brand}12 0%, ${brand}28 100%)` }}
                >
                  {icon}
                </div>
              )}
              {/* Category badge on image */}
              <span
                className="absolute bottom-3 left-3 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm"
                style={{ background: "#F26522ee", color: "#fff" }}
              >
                {icon} {service.category_name}
              </span>
            </div>

            {/* Title + description */}
            <h1
              className="text-3xl md:text-4xl font-extrabold text-ink-900 mb-3 animate-fade-in-up leading-tight"
              style={{ animationDelay: "80ms" }}
            >
              {service.name}
            </h1>
            <p
              className="text-ink-500 text-base leading-relaxed mb-7 animate-fade-in-up max-w-2xl"
              style={{ animationDelay: "140ms" }}
            >
              {service.description ||
                `Professional ${service.name} by certified technicians, with transparent pricing and a service warranty.`}
            </p>

            {/* Trust badges */}
            <div
              className="flex flex-wrap gap-2.5 mb-10 animate-fade-in-up"
              style={{ animationDelay: "200ms" }}
            >
              {[
                { icon: "⏱", label: `~${service.duration_mins} min visit` },
                { icon: "🛡️", label: "30-day warranty" },
                { icon: "✅", label: "Verified technicians" },
                { icon: "📍", label: `${cities.length || cityPrices.length || 1} ${(cities.length || cityPrices.length) === 1 ? "city" : "cities"}` },
              ].map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 bg-white border border-ink-100 rounded-full px-3 py-1.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span>{b.icon}</span> {b.label}
                </div>
              ))}
            </div>

            {/* Includes / Excludes / FAQ */}
            <ServiceDetailContent brand={brand} includes={includes} excludes={excludes} faqs={faqs} />
          </div>

          {/* ══ RIGHT COL — truly sticky ══
              • sticky + top-6 on the column itself (not a child div)
              • self-start prevents the column from stretching to grid height
              • max-h + overflow-y-auto lets it scroll internally if content
                is taller than the viewport (e.g. long city list) */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-[88px] self-start max-h-[calc(100vh-100px)] overflow-y-auto">

            {/* ── Pricing card ── */}
            <CityPriceSelector
              serviceName={service.name}
              basePrice={service.base_price}
              gstPercent={service.gst_percent}
              cityPrices={cityPrices}
              cities={cities}
              brand={brand}
              defaultCityName={DEFAULT_CITY}
            />

            {/* ── Trust & Terms card ── */}
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div
                className="px-5 py-3.5 flex items-center gap-2.5 border-b border-ink-100"
                style={{ background: `linear-gradient(135deg, ${brand}08 0%, ${brand}14 100%)` }}
              >
                <span className="text-lg">🔒</span>
                <div>
                  <p className="text-xs font-bold text-ink-800 leading-tight">Safe & Transparent Booking</p>
                  <p className="text-[10px] text-ink-400 mt-0.5">Read before you confirm</p>
                </div>
              </div>

              {/* Terms list */}
              <ul className="px-5 py-4 space-y-3">
                {[
                  { icon: "🗓️", title: "Free cancellation", desc: "Cancel up to 2 hours before the visit, no charge." },
                  { icon: "💳", title: "Pay after service", desc: "You're only billed once the job is done to your satisfaction." },
                  { icon: "🛡️", title: "30-day warranty", desc: "Any issue within 30 days? We'll fix it free of cost." },
                  { icon: "📋", title: "Transparent pricing", desc: "The price shown is final — no hidden charges added on-site." },
                  { icon: "👷", title: "Background-checked staff", desc: "All technicians are verified, trained, and insured." },
                  { icon: "📞", title: "24/7 customer support", desc: "Reach us anytime via call, WhatsApp, or chat." },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3 group">
                    <span className="text-base mt-0.5 shrink-0 transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink-800 leading-tight">{item.title}</p>
                      <p className="text-[11px] text-ink-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Footer note */}
              <div className="px-5 pb-4 pt-1">
                <p className="text-[10px] text-ink-300 leading-relaxed border-t border-ink-100 pt-3">
                  By booking you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-ink-500 transition-colors">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="underline hover:text-ink-500 transition-colors">Privacy Policy</Link>.
                  Prices are inclusive of applicable GST.
                </p>
              </div>
            </div>

            {/* ── Need help? card ── */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: `${brand}08`, borderColor: `${brand}20` }}
            >
              <p className="text-xs font-bold text-ink-800 mb-1">Not sure which service you need?</p>
              <p className="text-[11px] text-ink-500 mb-3 leading-relaxed">
                Our support team will help you pick the right service and slot.
              </p>
              <a
                href={phoneHref}
                className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl border transition-all duration-200 hover:opacity-80"
                style={{ borderColor: `${brand}40`, color: brand, background: `${brand}10` }}
              >
                📞 {phone}
              </a>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl border transition-all duration-200 hover:opacity-80 mt-2"
                  style={{ borderColor: "#25D36620", color: "#25D366", background: "#25D36610" }}
                >
                  💬 WhatsApp Us
                </a>
              )}
            </div>

          </aside>
        </div>
      </section>

      {/* ── Mobile sticky booking bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-sm border-t border-ink-100 px-4 py-3 flex items-center justify-between gap-4 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.15)]">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-ink-300 font-bold">Starting at</div>
          <div className="text-xl font-extrabold truncate" style={{ color: brand }}>
            ₹{service.base_price.toLocaleString("en-IN")}
          </div>
        </div>
        <a
          href={`/booking?service=${encodeURIComponent(service.name)}`}
          style={{ background: "#F26522", boxShadow: "0 8px 20px -8px rgba(242,101,34,0.55)" }}
          className="shrink-0 text-white font-bold px-7 py-3 rounded-xl hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300"
        >
          Book Now →
        </a>
      </div>
    </div>
  );
}
