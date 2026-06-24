"use client";

import { useState } from "react";
import { City } from "@/types";

interface Props {
  cities: City[];
  brand: string;
  onSelect: (city: City) => void;
  /** Provided only when a city is already saved — lets the customer dismiss
   *  without changing it. First-time visitors must pick one. */
  onClose?: () => void;
}

export default function CitySelectModal({ cities, brand, onSelect, onClose }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select your city"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl">
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-ink-400 hover:text-ink-700 transition-colors text-lg"
          >
            ✕
          </button>
        )}

        <div className="text-4xl mb-3 text-center">📍</div>
        <h2 className="text-xl font-bold text-ink-900 text-center mb-1">Select Your City</h2>
        <p className="text-sm text-ink-400 text-center mb-6">
          We&apos;ll show accurate pricing and availability for your area.
        </p>

        <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto">
          {cities.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="border rounded-xl py-3 px-4 text-sm font-semibold text-ink-700 text-left transition-colors"
              style={{
                borderColor: hoveredId === c.id ? brand : "#d9d9dd",
                background: hoveredId === c.id ? `${brand}10` : "white",
              }}
            >
              {c.name}
              {c.state && <span className="block text-xs font-normal text-ink-400 mt-0.5">{c.state}</span>}
            </button>
          ))}
        </div>

        <p className="text-xs text-ink-300 text-center mt-6">
          You can change your city anytime from the top of the page.
        </p>
      </div>
    </div>
  );
}
