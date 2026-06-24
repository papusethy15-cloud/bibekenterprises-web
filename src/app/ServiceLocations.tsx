"use client";

import { useMemo, useState } from "react";
import { City } from "@/types";
import { useCity } from "@/context/CityContext";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface Props {
  cities: City[];
  brand: string;
}

/**
 * "Where We Serve" — sits right below How It Works on the homepage.
 *
 * Layout: full-bleed section using public/images/city-bg.png as the
 * background (the requested look — left side kept visually empty so the
 * background art reads through; the city list lives on the right). Cities
 * are admin-driven (Admin Dashboard -> Domains -> [domain] -> Cities), so
 * this section quietly disappears if none are linked yet.
 *
 * Clicking a city sets it as the site-wide selected city via CityContext
 * (the same context ServiceCard/Header read from) so pricing elsewhere on
 * the site immediately reflects the chosen city — not just decorative.
 */
export default function ServiceLocations({ cities, brand }: Props) {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: gridRef, isVisible: gridVisible } = useScrollReveal<HTMLDivElement>();
  const { selectedCity, setSelectedCity } = useCity();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Keep the list tidy and scannable — biggest visual impact, no scroll-within-scroll.
  const visibleCities = useMemo(() => cities.slice(0, 12), [cities]);
  const overflowCount = cities.length - visibleCities.length;

  if (!cities.length) return null;

  return (
    <section className="relative overflow-hidden bg-ink-900 min-h-[640px] lg:min-h-[720px] flex items-center py-20">
      {/* Background image — true CSS background (not next/image fill) so it can be
          bg-fixed for the same parallax-on-scroll feel as the Hero banner. Sized to
          cover the full section height (min-h above), so it is never cropped top/bottom. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-scroll lg:bg-fixed"
        style={{ backgroundImage: "url(/images/city-bg.png)" }}
      />
      {/* Subtle left-to-right gradient only -- keeps the image clear and visible on the
          left/center, just enough lift under the text on the right for contrast. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,10,11,0.05) 0%, rgba(10,10,11,0.05) 40%, rgba(10,10,11,0.55) 68%, rgba(10,10,11,0.82) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,11,0.45) 0%, rgba(10,10,11,0) 18%, rgba(10,10,11,0) 75%, rgba(10,10,11,0.6) 100%)",
        }}
      />

      {/* Ambient glow, matches the blob treatment used in ServicesSection */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/3 right-0 w-[26rem] h-[26rem] rounded-full opacity-[0.10] animate-blob"
          style={{ background: brand }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left side — intentionally empty (lets the background artwork breathe) */}
          <div aria-hidden className="hidden lg:block" />

          {/* Right side — heading + city grid */}
          <div>
            <div
              ref={headerRef}
              className={headerVisible ? "animate-fade-in-up" : "opacity-0"}
            >
              <span style={{ color: brand }} className="text-sm font-bold uppercase tracking-wider">
                Where We Serve
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-2 mb-4">
                Our Service Locations
              </h2>
              <p className="text-white/60 max-w-md mb-10 leading-relaxed">
                Doorstep appliance repair across these cities — pick yours to see
                accurate pricing and availability near you.
              </p>
            </div>

            <div
              ref={gridRef}
              className={`flex flex-wrap gap-3 ${gridVisible ? "" : "opacity-0"}`}
            >
              {visibleCities.map((city, i) => {
                const isSelected = selectedCity?.id === city.id;
                const isHovered = hoveredId === city.id;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    onMouseEnter={() => setHoveredId(city.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`group relative flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 hover:-translate-y-1 ${
                      gridVisible ? "animate-fade-in-up" : ""
                    }`}
                    style={{
                      animationDelay: `${(i % 12) * 60}ms`,
                      borderColor: isSelected ? brand : "rgba(255,255,255,0.14)",
                      background: isSelected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                      color: isSelected ? "#fff" : "rgba(255,255,255,0.85)",
                      boxShadow: isHovered ? "0 8px 24px -8px rgba(0,0,0,0.45)" : undefined,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-125"
                      style={{ background: isSelected ? brand : "rgba(255,255,255,0.35)" }}
                    />
                    {city.name}
                    {city.state && (
                      <span className="text-white/35 font-normal text-xs hidden sm:inline">
                        , {city.state}
                      </span>
                    )}
                  </button>
                );
              })}

              {overflowCount > 0 && (
                <span
                  className={`flex items-center px-5 py-3 rounded-xl border border-dashed border-white/15 text-white/40 text-sm font-medium ${
                    gridVisible ? "animate-fade-in-up" : ""
                  }`}
                  style={{ animationDelay: `${visibleCities.length * 60}ms` }}
                >
                  +{overflowCount} more cities
                </span>
              )}
            </div>

            {selectedCity && (
              <p className="mt-6 text-sm text-white/50 animate-fade-in-up">
                <span style={{ color: brand }}>✓</span> Showing service availability for{" "}
                <span className="text-white font-semibold">{selectedCity.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
