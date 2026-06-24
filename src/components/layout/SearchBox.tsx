"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTypewriter } from "@/hooks/useTypewriter";
import { serviceHref } from "@/lib/slug";

export interface SearchableService {
  domain_service_id: string;
  name: string;
  category_name?: string;
}

interface Props {
  services: SearchableService[];
  brand: string;
  className?: string;
}

// Shown only if the domain has no services configured yet, so the search
// box still has something appliance-relevant to animate through.
const FALLBACK_TERMS = [
  "AC Repair",
  "Refrigerator Repair",
  "Washing Machine Repair",
  "Microwave Repair",
  "Geyser Repair",
  "RO Water Purifier Service",
];

/** Header search box: animated "Search for <service>…" placeholder that
 *  types itself out, plus a live dropdown of matching services as the
 *  visitor types — clicking (or Enter) jumps straight to that service. */
export default function SearchBox({ services, brand, className = "" }: Props) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const words = useMemo(() => {
    const names = services.map((s) => s.name);
    return (names.length ? names : FALLBACK_TERMS).slice(0, 12);
  }, [services]);

  const typed = useTypewriter(words);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return services.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, services]);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function goToService(service: SearchableService) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(serviceHref(service));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results.length > 0) goToService(results[0]);
  }

  const showAnimatedPlaceholder = query.length === 0;

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative" role="search">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-300">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(query.length > 0)}
          // No native `placeholder` here on purpose — the animated overlay
          // below is the only placeholder text. Having both rendered the
          // grey native placeholder and the orange typed text on top of
          // each other at once.
          aria-label="Search for an appliance service"
          autoComplete="off"
          className="w-full pl-11 pr-4 py-2.5 rounded-full border border-ink-100 bg-ink-50/70 text-sm text-ink-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition-colors"
        />

        {showAnimatedPlaceholder && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-11 right-4 flex items-center text-sm overflow-hidden whitespace-nowrap"
          >
            <span className="hidden sm:inline text-ink-300 mr-1">Search&nbsp;</span>
            <span className="font-semibold truncate" style={{ color: brand }}>
              {typed}
            </span>
            <span
              className="ml-0.5 w-px h-4 shrink-0 animate-pulse"
              style={{ background: brand }}
            />
          </div>
        )}
      </form>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-ink-100 rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in-up">
          {results.map((s) => (
            <Link
              key={s.domain_service_id}
              href={serviceHref(s)}
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-50 transition-colors text-sm border-b border-ink-50 last:border-b-0"
            >
              <span className="font-medium text-ink-800">{s.name}</span>
              {s.category_name && (
                <span className="text-xs text-ink-300 shrink-0">{s.category_name}</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {open && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-ink-100 rounded-2xl shadow-xl px-4 py-3 text-sm text-ink-400 z-50 animate-fade-in-up">
          No services match &ldquo;{query}&rdquo;. Try &ldquo;AC&rdquo; or &ldquo;Washing Machine&rdquo;.
        </div>
      )}
    </div>
  );
}
