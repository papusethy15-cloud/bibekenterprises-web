"use client";
/**
 * ServiceSlider — two-panel service showcase
 *
 * Fixes applied:
 *  1. City-aware pricing  — subscribes to CityContext; fetches
 *     /services/{id}/city-prices for every service and re-resolves
 *     the displayed price whenever the customer changes their city.
 *  2. "Book Now" → /booking?service={slug}  (was wrongly going to
 *     the service detail page).
 *  3. "View Details" → /services/{slug}  (correct detail page link).
 *
 * Layout:
 *   LEFT  (lg): Large active card — crossfade image, solid dark info panel.
 *   RIGHT (lg): Scrollable service list — click to switch active card.
 *   MOBILE    : Single-card view with dot navigation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DomainService, ServiceCityPrice } from "@/types";
import { useCity } from "@/context/CityContext";
import { getServiceCityPrices, resolveCityPrice } from "@/lib/domain";
import { serviceHref, slugify } from "@/lib/slug";
import { iconFor } from "@/lib/icons";

interface Props {
  services: DomainService[];
  brand: string;
}

const AUTO_MS = 5000;

// ── per-service city-price cache ──────────────────────────────────────────────
type PriceCache = Record<string, ServiceCityPrice[]>;

export default function ServiceSlider({ services, brand }: Props) {
  const router = useRouter();
  const { selectedCity } = useCity();

  const [active,   setActive]   = useState(0);
  const [prev,     setPrev]     = useState<number | null>(null);
  const [paused,   setPaused]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragX,    setDragX]    = useState(0);
  const [isDrag,   setIsDrag]   = useState(false);

  // City-price cache: { service_id → ServiceCityPrice[] }
  const [priceCache, setPriceCache] = useState<PriceCache>({});

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = services.length;

  // ── Fetch city prices for ALL services once (lazy, background) ─────────────
  useEffect(() => {
    if (!services.length) return;
    services.forEach((svc) => {
      if (priceCache[svc.service_id] !== undefined) return; // already cached
      getServiceCityPrices(svc.service_id).then((prices) => {
        setPriceCache((prev) => ({ ...prev, [svc.service_id]: prices }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  // ── Resolve effective price for a service ──────────────────────────────────
  const effectivePrice = useCallback(
    (svc: DomainService): { price: number; isOverride: boolean; isAvailable: boolean } => {
      const cityPrices = priceCache[svc.service_id] ?? [];
      return selectedCity
        ? resolveCityPrice(svc.base_price, cityPrices, selectedCity.name)
        : { price: svc.base_price, isOverride: false, isAvailable: true };
    },
    [priceCache, selectedCity]
  );

  // ── Navigation ──────────────────────────────────────────────────────────────
  const go = useCallback(
    (idx: number) => {
      const next = ((idx % count) + count) % count;
      setPrev(active);
      setActive(next);
      setProgress(0);
    },
    [active, count]
  );
  const goNext = useCallback(() => go((active + 1) % count), [active, count, go]);
  const goPrev = useCallback(() => go((active - 1 + count) % count), [active, count, go]);

  // ── Auto-advance + progress bar ────────────────────────────────────────────
  useEffect(() => {
    if (paused || count <= 1) { setProgress(0); return; }
    const step = 50;
    setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(progressRef.current!); return 100; }
        return p + (step / AUTO_MS) * 100;
      });
    }, step);
    timerRef.current = setTimeout(goNext, AUTO_MS);
    return () => {
      clearInterval(progressRef.current!);
      clearTimeout(timerRef.current!);
    };
  }, [active, paused, count, goNext]);

  // ── Swipe / drag ───────────────────────────────────────────────────────────
  const onPD = (e: React.PointerEvent) => {
    setIsDrag(true); setDragX(e.clientX); setPaused(true);
  };
  const onPU = (e: React.PointerEvent) => {
    if (!isDrag) return;
    const dx = e.clientX - dragX;
    if (Math.abs(dx) > 44) dx < 0 ? goNext() : goPrev();
    setIsDrag(false);
    setPaused(false);
  };

  if (count === 0) return null;

  const svc   = services[active];
  const icon  = iconFor(svc.category_name);
  const { price, isOverride, isAvailable } = effectivePrice(svc);

  // Booking URL: /booking?service={slug}  — BookingClient reads this param
  const bookingHref  = `/booking?service=${slugify(svc.name)}`;
  const detailHref   = serviceHref(svc);

  return (
    <section
      className="relative overflow-hidden py-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ background: "#0f0f12" }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 55% at 30% 50%, ${brand}18 0%, transparent 70%)`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <span
              className="inline-block text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2"
              style={{ color: brand }}
            >
              Our Services
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
              What We Repair &amp; Maintain
            </h2>
            {selectedCity && (
              <p className="text-sm mt-1" style={{ color: `${brand}cc` }}>
                Showing prices for <strong style={{ color: brand }}>{selectedCity.name}</strong>
              </p>
            )}
          </div>
          {/* Prev / Next */}
          <div className="hidden sm:flex items-center gap-2">
            <NavBtn onClick={goPrev} label="Previous" brand={brand}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </NavBtn>
            <NavBtn onClick={goNext} label="Next" brand={brand}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </NavBtn>
          </div>
        </div>

        {/* ── Two-panel ───────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-5">

          {/* LEFT: big card */}
          <div
            className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{ flex: "1 1 0%" }}
            onPointerDown={onPD}
            onPointerUp={onPU}
            onPointerLeave={onPU}
          >
            <div
              className="relative w-full overflow-hidden rounded-2xl"
              style={{ paddingBottom: "clamp(260px, 42vw, 420px)", height: 0 }}
            >
              {/* Crossfade images */}
              <div className="absolute inset-0">
                {prev !== null && (
                  <ActiveImage key={`p-${prev}`} service={services[prev]} brand={brand} fading />
                )}
                <ActiveImage key={`a-${active}`} service={svc} brand={brand} fading={false} />
              </div>

              {/* ── Info panel on solid dark base ── */}
              <div
                className="absolute bottom-0 left-0 right-0 z-10"
                style={{
                  background: "linear-gradient(0deg,#0f0f12 0%,rgba(15,15,18,0.93) 55%,transparent 100%)",
                  padding: "52px 24px 22px",
                }}
              >
                {/* Badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full text-white"
                    style={{ background: brand }}
                  >
                    {icon} {svc.category_name}
                  </span>
                  {svc.is_featured && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-950">
                      ⭐ Featured
                    </span>
                  )}
                  {selectedCity && isOverride && (
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: `${brand}30`, color: brand }}
                    >
                      📍 {selectedCity.name} price
                    </span>
                  )}
                </div>

                <h3 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white mb-1 leading-snug">
                  {svc.name}
                </h3>
                {svc.description && (
                  <p className="text-sm text-white/60 mb-4 line-clamp-2 max-w-lg">
                    {svc.description}
                  </p>
                )}

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Price */}
                  <div>
                    <span className="text-xs text-white/40 uppercase tracking-wider">Starting from</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold" style={{ color: brand }}>
                        ₹{price?.toLocaleString("en-IN")}
                      </span>
                      {selectedCity && isOverride && svc.base_price !== price && (
                        <span className="text-sm text-white/30 line-through">
                          ₹{svc.base_price?.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    {selectedCity && !isAvailable && (
                      <span className="text-xs text-amber-400 mt-0.5 block">
                        Confirm availability at booking
                      </span>
                    )}
                  </div>

                  {/* Book Now → /booking?service={slug} */}
                  <Link
                    href={bookingHref}
                    draggable={false}
                    onClick={(e) => isDrag && e.preventDefault()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:gap-3 hover:opacity-90 active:scale-95"
                    style={{ background: brand, boxShadow: `0 4px 14px -4px ${brand}80` }}
                  >
                    Book Now
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>

                  {/* View Details → /services/{slug} */}
                  <Link
                    href={detailHref}
                    draggable={false}
                    onClick={(e) => isDrag && e.preventDefault()}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/55 hover:text-white transition-colors"
                  >
                    View Details →
                  </Link>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[3px] z-20"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <div
                  className="h-full transition-none"
                  style={{ width: `${progress}%`, background: brand }}
                />
              </div>

              {/* Counter badge */}
              <div
                className="absolute top-4 right-4 z-10 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.65)", backdropFilter: "blur(8px)" }}
              >
                {active + 1} / {count}
              </div>
            </div>
          </div>

          {/* RIGHT: service list */}
          <div
            className="flex-shrink-0 flex flex-col gap-2 lg:overflow-y-auto"
            style={{ flex: "0 0 300px", maxHeight: "clamp(260px, 42vw, 420px)" }}
          >
            {/* Mobile dots */}
            <div className="flex lg:hidden justify-center gap-1.5 py-2">
              {services.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  aria-label={`Go to ${services[i].name}`}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === active ? 22 : 6,
                    background: i === active ? brand : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>

            {/* Desktop list */}
            {services.map((s, i) => {
              const img    = s.thumbnail_url || s.image_url || null;
              const ico    = iconFor(s.category_name);
              const isAct  = i === active;
              const ep     = effectivePrice(s);
              return (
                <button
                  key={s.service_id}
                  onClick={() => go(i)}
                  className="hidden lg:flex items-center gap-3 rounded-xl p-3 text-left w-full transition-all duration-300"
                  style={{
                    background: isAct ? `${brand}18` : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${isAct ? `${brand}55` : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center text-2xl"
                    style={{
                      background: isAct
                        ? `linear-gradient(135deg,${brand}44,${brand}88)`
                        : "rgba(255,255,255,0.06)",
                    }}
                  >
                    {img ? (
                      <img src={img} alt={s.name} className="w-full h-full object-cover" draggable={false} />
                    ) : (
                      <span>{ico}</span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-bold truncate"
                      style={{ color: isAct ? "#fff" : "rgba(255,255,255,0.7)" }}
                    >
                      {s.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: isAct ? brand : "rgba(255,255,255,0.3)" }}
                      >
                        ₹{ep.price?.toLocaleString("en-IN")}
                      </span>
                      {selectedCity && ep.isOverride && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${brand}25`, color: brand }}
                        >
                          {selectedCity.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active bar */}
                  <div
                    className="flex-shrink-0 w-1.5 h-8 rounded-full transition-all duration-300"
                    style={{ background: isAct ? brand : "transparent" }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Nav button ────────────────────────────────────────────────────────────────
function NavBtn({ onClick, label, brand, children }: {
  onClick: () => void; label: string; brand: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105"
      style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = brand;
        (e.currentTarget as HTMLElement).style.borderColor = brand;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
      }}
    >
      {children}
    </button>
  );
}

// ── Crossfade image tile ──────────────────────────────────────────────────────
function ActiveImage({ service, brand, fading }: {
  service: DomainService; brand: string; fading: boolean;
}) {
  const image = service.thumbnail_url || service.image_url || null;
  const icon  = iconFor(service.category_name);
  return (
    <div
      className="absolute inset-0 transition-opacity duration-700"
      style={{ opacity: fading ? 0 : 1 }}
    >
      {image ? (
        <Image
          src={image}
          alt={service.name}
          fill
          sizes="(max-width:1024px) 100vw, 65vw"
          className="object-cover"
          draggable={false}
          priority
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: `linear-gradient(140deg,#1a1a22 0%,${brand}28 50%,#0f0f12 100%)` }}
        >
          <div className="absolute w-64 h-64 rounded-full opacity-10" style={{ border: `2px solid ${brand}` }} />
          <div className="absolute w-40 h-40 rounded-full opacity-20" style={{ border: `2px solid ${brand}` }} />
          <span className="text-8xl relative z-10 drop-shadow-2xl">{icon}</span>
          <span className="relative z-10 text-sm font-bold uppercase tracking-widest" style={{ color: brand }}>
            {service.category_name}
          </span>
        </div>
      )}
    </div>
  );
}
