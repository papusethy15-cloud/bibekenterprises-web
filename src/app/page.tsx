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
import { serviceHref } from "@/lib/slug";

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
  const profile    = data?.profile;
  const services   = data?.services?.length ? data.services   : FALLBACK_SERVICES;
  const categories = data?.categories ?? [];
  const cities     = data?.cities ?? [];

  const siteName    = domain?.name         ?? "Bibek Enterprises";
  const logoUrl     = profile?.logo_url    ?? domain?.logo_url ?? null;
  const brand       = domain?.primary_color ?? "#D97706";
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

  return (
    <div className="min-h-screen bg-white">

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
              className="absolute inset-0 bg-cover bg-right lg:bg-center"
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg,rgba(255,255,255,0.98) 0%,rgba(255,255,255,0.94) 30%,rgba(255,255,255,0.55) 55%,rgba(255,255,255,0.05) 78%,rgba(255,255,255,0) 100%)",
              }}
            />
          </>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(140deg,#0a0a0b 0%,#1c1c21 55%,${brand}22 100%)` }}
          />
        )}

        {/* ── Decorative animated blobs (no-banner state) ── */}
        {!bannerUrl && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute top-[-80px] right-[5%] w-[420px] h-[420px] rounded-full opacity-[0.08] animate-blob"
              style={{ background: brand }}
            />
            <div
              className="absolute bottom-[-60px] right-[30%] w-[280px] h-[280px] rounded-full opacity-[0.06] animate-blob"
              style={{ background: brand, animationDelay: "5s" }}
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
                  style={{ background: brand }}
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
                        style={{ background: brand }}
                      />
                    </div>
                  ))}
                </div>

                {/* Floating "Live" badge */}
                <div
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold shadow-lg animate-float"
                  style={{ background: brand }}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Technicians Online Now
                </div>
              </div>
            )}

          </div>{/* /grid */}
        </div>{/* /container */}
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-ink-900 text-white py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10,000+", label: "Happy Customers" },
              { value: "500+",    label: "Certified Technicians" },
              { value: "50+",     label: "Cities Covered" },
              { value: "4.8★",   label: "Average Rating" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl md:text-3xl font-bold" style={{ color: brand }}>
                  {s.value}
                </div>
                <div className="text-sm text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
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
