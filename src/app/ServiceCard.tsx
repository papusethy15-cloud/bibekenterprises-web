"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DomainService, ServiceCityPrice } from "@/types";
import { useCity } from "@/context/CityContext";
import { getServiceCityPrices, resolveCityPrice } from "@/lib/domain";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { serviceHref } from "@/lib/slug";

interface Props {
  service: DomainService;
  brand: string;
  icon: string;
  /** Position within the grid — used only to stagger the scroll-reveal timing. */
  index?: number;
}

export default function ServiceCard({ service, brand, icon, index = 0 }: Props) {
  const [hovered, setHovered] = useState(false);
  const { selectedCity } = useCity();
  const [cityPrices, setCityPrices] = useState<ServiceCityPrice[]>([]);
  const { ref, isVisible } = useScrollReveal<HTMLAnchorElement>();

  // Once a city is selected (from localStorage or the picker), fetch this
  // service's city-wise price overrides and use them instead of base_price.
  useEffect(() => {
    if (!selectedCity) {
      setCityPrices([]);
      return;
    }
    let cancelled = false;
    getServiceCityPrices(service.service_id).then((prices) => {
      if (!cancelled) setCityPrices(prices);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCity, service.service_id]);

  const { price, isOverride, isAvailable } = selectedCity
    ? resolveCityPrice(service.base_price, cityPrices, selectedCity.name)
    : { price: service.base_price, isOverride: false, isAvailable: true };

  // Admin-uploaded, domain-specific override image (Admin Dashboard ->
  // Domains -> [domain] -> Services -> [service] -> Image). Falls back to
  // a branded icon panel when the admin hasn't set one yet.
  const image = service.thumbnail_url || service.image_url || null;
  // Stagger the scroll-reveal by grid column so cards cascade in rather
  // than popping together — capped low so hover response never feels laggy.
  const revealDelay = (index % 4) * 70;

  return (
    <Link
      ref={ref}
      href={serviceHref(service)}
      className={`group relative flex flex-col bg-white rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1.5 ${
        isVisible ? "animate-fade-in-up" : "opacity-0"
      }`}
      style={{
        animationDelay: `${revealDelay}ms`,
        borderColor: hovered ? `${brand}55` : "#eeeef0",
        boxShadow: hovered ? `0 20px 40px -16px ${brand}40` : "0 1px 3px 0 rgba(0,0,0,0.04)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image / icon header ── */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-ink-50">
        {image ? (
          <Image
            src={image}
            alt={service.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-5xl transition-transform duration-700 ease-out group-hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${brand}14 0%, ${brand}29 100%)` }}
          >
            {icon}
          </div>
        )}
        {/* Scrim so the badges stay legible over bright photos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {service.is_featured && (
          <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 shadow-sm">
            ⭐ Featured
          </span>
        )}
        <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-ink-700 shadow-sm">
          {icon} {service.category_name}
        </span>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-5">
        <h3
          className="font-bold text-ink-900 mb-1 transition-colors line-clamp-1"
          style={{ color: hovered ? brand : undefined }}
        >
          {service.name}
        </h3>
        {service.description && (
          <p className="text-sm text-ink-400 mb-4 line-clamp-2 flex-1">{service.description}</p>
        )}

        <div className="flex items-end justify-between mt-auto pt-1">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-300 font-semibold mb-0.5">
              Starting at
            </div>
            <span className="text-lg font-extrabold" style={{ color: brand }}>
              ₹{price?.toLocaleString("en-IN")}
            </span>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5"
            style={{ background: hovered ? brand : `${brand}14`, color: hovered ? "#fff" : brand }}
          >
            →
          </div>
        </div>

        {selectedCity && isOverride && (
          <div className="mt-2 text-xs font-medium" style={{ color: brand }}>
            ● {selectedCity.name} pricing
          </div>
        )}
        {selectedCity && !isAvailable && (
          <div className="mt-2 text-xs text-amber-700">
            Confirm availability in {selectedCity.name} at booking
          </div>
        )}
      </div>
    </Link>
  );
}
