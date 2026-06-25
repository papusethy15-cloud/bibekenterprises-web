"use client";

import { useMemo, useState } from "react";
import { DomainService, DomainCategory } from "@/types";
import ServiceCard from "./ServiceCard";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { iconFor } from "@/lib/icons";

interface Props {
  services: DomainService[];
  categories: DomainCategory[];
  brand: string;
  siteName: string;
}

/**
 * Modern "Our Services" section — admin-driven category tabs, an
 * animated/scroll-revealed heading, and a staggered card grid that pulls
 * real images from the per-domain service override (Admin Dashboard →
 * Domains → [domain] → Services → [service] → Image).
 *
 * Client component so the tab filtering and scroll-reveal can be
 * interactive, but the data itself is still fetched server-side in
 * page.tsx and passed in as props — the "All Services" tab (the default,
 * server-rendered state) always lists every service, so search engines
 * still see the full catalog in the initial HTML.
 */
export default function ServicesSection({ services, categories, brand, siteName }: Props) {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 8;

  // Only show tabs for categories that actually have a visible service —
  // no point offering an empty filter.
  const tabs = useMemo(
    () =>
      categories.filter((cat) =>
        services.some((s) => s.category_id === cat.category_id || s.category_name === cat.name)
      ),
    [categories, services]
  );

  const filtered = useMemo(() => {
    if (activeCategory === "all") return services;
    return services.filter(
      (s) => s.category_id === activeCategory || s.category_name === activeCategory
    );
  }, [services, activeCategory]);

  return (
    <section id="services" className="relative py-20 bg-white overflow-hidden">
      {/* Decorative background blobs — purely visual, sit behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full opacity-[0.06] animate-blob"
          style={{ background: "#1A3FA4" }}
        />
        <div
          className="absolute -bottom-32 -left-24 w-[24rem] h-[24rem] rounded-full opacity-[0.05] animate-blob"
          style={{ background: "#F26522", animationDelay: "4s" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`text-center mb-10 ${headerVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "#F26522" }}>
            What We Offer
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-ink-900 mt-2 mb-4">
            Our Services
          </h2>
          <p className="text-ink-400 max-w-xl mx-auto">
            Expert repair and maintenance for home appliances — configured specifically for{" "}
            {siteName}.
          </p>
        </div>

        {tabs.length > 1 && (
          <div
            className={`flex flex-wrap justify-center gap-2 mb-10 ${
              headerVisible ? "animate-fade-in-up" : "opacity-0"
            }`}
            style={{ animationDelay: "150ms" }}
          >
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className="px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-300 hover:-translate-y-0.5"
              style={
                activeCategory === "all"
                  ? { background: brand, borderColor: brand, color: "#fff" }
                  : { borderColor: "#e5e5e8", color: "#4a4a54", background: "#fff" }
              }
            >
              All Services
            </button>
            {tabs.map((cat) => (
              <button
                type="button"
                key={cat.domain_category_id}
                onClick={() => setActiveCategory(cat.category_id)}
                className="px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-1.5"
                style={
                  activeCategory === cat.category_id
                    ? { background: "#1A3FA4", borderColor: "#1A3FA4", color: "#fff" }
                    : { borderColor: "#d1d5db", color: "#374151", background: "#fff" }
                }
              >
                <span>{cat.icon || iconFor(cat.name)}</span>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(showAll ? filtered : filtered.slice(0, LIMIT)).map((svc, i) => (
                <ServiceCard
                  key={svc.domain_service_id}
                  service={svc}
                  brand={brand}
                  icon={iconFor(svc.category_name)}
                  index={i}
                />
              ))}
            </div>
            {filtered.length > LIMIT && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowAll((s) => !s)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 font-semibold text-sm transition-all hover:-translate-y-0.5"
                  style={{ borderColor: "#1A3FA4", color: "#1A3FA4", background: "white" }}
                >
                  {showAll ? "Show Less ↑" : `Show ${filtered.length - LIMIT} More Services ↓`}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-ink-400 py-12">No services found in this category yet.</p>
        )}

        {/* ── All Services CTA ── */}
        <div className="mt-12 text-center">
          <a
            href="/services"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300 shadow-lg"
            style={{ background: "#F26522", boxShadow: "0 12px 28px -12px rgba(242,101,34,0.55)" }}
          >
            View All Services
            <span className="text-lg">→</span>
          </a>
          <p className="text-sm text-ink-400 mt-3">
            Browse our complete service catalog — book instantly online
          </p>
        </div>
      </div>
    </section>
  );
}
