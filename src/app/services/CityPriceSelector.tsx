"use client";

import { useState } from "react";
import { ServiceCityPrice, City } from "@/types";
import { resolveCityPrice } from "@/lib/domain";
import { useCity } from "@/context/CityContext";

interface Props {
  serviceName: string;
  basePrice: number;
  gstPercent: number;
  cityPrices: ServiceCityPrice[];
  cities: City[];
  brand: string;
  defaultCityName?: string;
}

export default function CityPriceSelector({
  serviceName,
  basePrice,
  gstPercent,
  cityPrices,
  cities,
  brand,
  defaultCityName,
}: Props) {
  const { selectedCity: globalCity } = useCity();
  const initialCity =
    cityPrices.find((c) => c.city_name === globalCity?.name)?.city_name ??
    globalCity?.name ??
    cityPrices.find((c) => c.city_name === defaultCityName)?.city_name ??
    defaultCityName ??
    cityPrices[0]?.city_name ??
    cities[0]?.name ??
    "";

  const [selectedCity, setSelectedCity] = useState(initialCity);

  const { price, isOverride, isAvailable } = resolveCityPrice(basePrice, cityPrices, selectedCity);
  const gstAmount = Math.round((price * gstPercent) / 100);
  const totalPrice = price + gstAmount;

  const cityOptions = cities.length ? cities.map((c) => c.name) : cityPrices.map((c) => c.city_name);

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
      {/* ── Card header ── */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: `linear-gradient(135deg, ${brand}0d 0%, ${brand}1a 100%)` }}
      >
        {/* City selector row */}
        {cityOptions.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Your city</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs font-bold border border-ink-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 bg-white cursor-pointer transition-all hover:border-ink-300"
              style={{ accentColor: brand }}
            >
              {cityOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Price block */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-1">Starting at</p>
            <div className="flex items-end gap-1.5">
              <span className="text-4xl font-extrabold text-ink-900 leading-none">
                ₹{price.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-ink-400 mb-1 font-medium">+{gstPercent}% GST</span>
            </div>
          </div>
          {isOverride && selectedCity && (
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{ background: `${brand}1a`, color: brand }}
            >
              📍 {selectedCity}
            </span>
          )}
        </div>

        {/* Total */}
        <div className="mt-2 flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: `${brand}1a`, color: brand }}
          >
            Total incl. GST: ₹{totalPrice.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* ── Unavailable warning ── */}
      {!isAvailable && (
        <div className="mx-5 mt-4 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>This service may be unavailable in <strong>{selectedCity}</strong>. Showing base pricing — please confirm at booking.</span>
        </div>
      )}

      {/* ── CTA ── */}
      <div className="px-5 py-4">
        <a
          href={`/booking?service=${encodeURIComponent(serviceName)}&city=${encodeURIComponent(selectedCity)}`}
          style={{ background: brand, boxShadow: `0 10px 28px -10px ${brand}70` }}
          className="flex items-center justify-center gap-2 w-full text-white font-bold py-3.5 rounded-xl hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-sm"
        >
          <span>Book This Service</span>
          <span className="text-base">→</span>
        </a>

        {/* Quick trust line below CTA */}
        <p className="text-center text-[10px] text-ink-400 mt-2.5 flex items-center justify-center gap-1">
          <span>✅</span> Free cancellation · Pay after service
        </p>
      </div>

      {/* ── Mini social proof ── */}
      <div className="px-5 pb-4 pt-1 border-t border-ink-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {["🧑‍🔧", "👩‍🔧", "🧑‍🔧"].map((e, i) => (
                <span
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] bg-ink-100"
                >
                  {e}
                </span>
              ))}
            </div>
            <span className="text-[10px] text-ink-500 font-medium">Verified experts</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className="text-orange-400 text-[10px]">★</span>
            ))}
            <span className="text-[10px] text-ink-400 ml-0.5">4.8</span>
          </div>
        </div>
      </div>
    </div>
  );
}
