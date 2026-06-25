"use client";

import { useState, useMemo } from "react";
import { City } from "@/types";

interface Props {
  cities: City[];
  brand: string;
  onSelect: (city: City) => void;
  onClose?: () => void;
}

export default function CitySelectModal({ cities, brand, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.state?.toLowerCase().includes(q) ?? false)
    );
  }, [cities, search]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(10,12,30,0.65)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Select your city"
    >
      {/* Card */}
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up"
        style={{ animationDuration: "0.22s" }}
      >
        {/* ── Header ── */}
        <div
          className="relative px-6 pt-7 pb-6"
          style={{
            background: `linear-gradient(135deg, ${brand}12 0%, ${brand}26 100%)`,
            borderBottom: `1px solid ${brand}20`,
          }}
        >
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-ink-400 hover:text-ink-700 hover:bg-white/60 transition-all text-sm font-bold"
            >
              ✕
            </button>
          )}

          {/* Pin icon with brand glow */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm"
            style={{ background: "#F2652215", border: "1.5px solid #F2652130" }}
          >
            📍
          </div>

          <h2 className="text-xl font-extrabold text-ink-900 mb-1">
            Where are you located?
          </h2>
          <p className="text-sm text-ink-400 leading-snug">
            We&apos;ll show you accurate pricing and availability for your area.
          </p>
        </div>

        {/* ── Search ── */}
        <div className="px-6 pt-5 pb-3">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 text-sm pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-ink-100 bg-ink-50 text-sm text-ink-700 placeholder:text-ink-300 outline-none transition-all"
              onFocus={(e) => { e.target.style.borderColor = brand; e.target.style.boxShadow = `0 0 0 3px ${brand}25`; }}
              onBlur={(e) => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
              autoFocus
            />
          </div>
        </div>

        {/* ── City grid ── */}
        <div className="px-6 pb-3 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-ink-300 text-sm">
              No city found for &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filtered.map((c) => {
                const isHov = hoveredId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group relative flex flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-left transition-all duration-200 border"
                    style={{
                      borderColor: isHov ? brand : "#e8e8ef",
                      background: isHov ? `${brand}0e` : "#fafafa",
                      transform: isHov ? "translateY(-1px)" : "translateY(0)",
                      boxShadow: isHov ? `0 4px 14px -4px ${brand}30` : "none",
                    }}
                  >
                    <span
                      className="text-sm font-bold leading-tight"
                      style={{ color: isHov ? brand : "#1e1e28" }}
                    >
                      {c.name}
                    </span>
                    {c.state && (
                      <span className="text-[10px] font-normal text-ink-400">
                        {c.state}
                      </span>
                    )}
                    {isHov && (
                      <span
                        className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "#F26522", color: "#fff" }}
                      >
                        Select ›
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-between">
          <p className="text-[11px] text-ink-300">
            {cities.length} cit{cities.length === 1 ? "y" : "ies"} available
          </p>
          <p className="text-[11px] text-ink-300">
            You can change this anytime from the top bar.
          </p>
        </div>
      </div>
    </div>
  );
}
