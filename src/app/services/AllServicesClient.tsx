"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { DomainService, DomainCategory, City, ServiceCityPrice } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCity } from "@/context/CityContext";
import { iconFor } from "@/lib/icons";
import { serviceHref } from "@/lib/slug";
import { resolveCityPrice } from "@/lib/domain";
import { api } from "@/lib/api";
import InlineBookingPanel from "./InlineBookingPanel";

interface Props {
  services: DomainService[];
  categories: DomainCategory[];
  cities: City[];
  brand: string;
  siteName: string;
  phone: string;
  domainId: string;
}

interface CityPriceCache {
  [serviceId: string]: ServiceCityPrice[];
}

type RightPanelMode =
  | { mode: "idle" }
  | { mode: "booking"; service: DomainService }
  | { mode: "done"; bookingNumber: string; serviceName: string };

const PAGE_SIZE = 10;

/** Fisher-Yates shuffle — returns a new randomly-ordered array. */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export default function AllServicesClient({ services, categories, brand, cities, domainId }: Props) {
  const { isLoggedIn, hydrated, customer } = useAuth();
  const { selectedCity, openCityModal } = useCity();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [panel, setPanel] = useState<RightPanelMode>({ mode: "idle" });
  const [priceCache, setPriceCache] = useState<CityPriceCache>({});
  const [loadingPrices, setLoadingPrices] = useState<Set<string>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const col2Ref = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);

  // Randomly shuffle services on every page load so customers discover
  // different services each visit (featured services are already highlighted).
  const shuffledServices = useMemo(() => shuffleArray(services), [services]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setHeaderVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Reset to page 1 whenever the category filter changes.
  useEffect(() => { setCurrentPage(1); }, [activeCategory]);

  // ── Category tabs ─────────────────────────────────────────────────────────
  const tabs = useMemo(
    () => categories.filter((cat) =>
      shuffledServices.some((s) => s.category_id === cat.category_id || s.category_name === cat.name)
    ),
    [categories, shuffledServices]
  );

  const filtered = useMemo(() => {
    if (activeCategory === "all") return shuffledServices;
    return shuffledServices.filter(
      (s) => s.category_id === activeCategory || s.category_name === activeCategory
    );
  }, [shuffledServices, activeCategory]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const scrollToServiceList = () => {
    col2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    scrollToServiceList();
  };

  // ── City price fetching ───────────────────────────────────────────────────
  const fetchCityPrices = useCallback(async (serviceId: string) => {
    if (priceCache[serviceId] !== undefined || loadingPrices.has(serviceId)) return;
    setLoadingPrices((prev) => new Set(prev).add(serviceId));
    try {
      const res = await api.get(`/services/${serviceId}/city-prices`);
      setPriceCache((prev) => ({ ...prev, [serviceId]: res.data?.data ?? [] }));
    } catch {
      setPriceCache((prev) => ({ ...prev, [serviceId]: [] }));
    } finally {
      setLoadingPrices((prev) => { const s = new Set(prev); s.delete(serviceId); return s; });
    }
  }, [priceCache, loadingPrices]);

  useEffect(() => {
    if (!selectedCity) return;
    shuffledServices.forEach((s) => fetchCityPrices(s.service_id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity?.name]);

  const resolvePrice = (svc: DomainService) =>
    resolveCityPrice(svc.base_price, priceCache[svc.service_id] ?? [], selectedCity?.name);

  // ── Book button handler ───────────────────────────────────────────────────
  const handleBook = (svc: DomainService) => {
    if (!isLoggedIn) {
      window.location.href = `/login?redirect=${encodeURIComponent(
        `/services#book-${encodeURIComponent(svc.name)}`
      )}`;
      return;
    }
    fetchCityPrices(svc.service_id);
    setPanel({ mode: "booking", service: svc });
    setTimeout(() => {
      document.getElementById("right-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // ── Handle redirect-back-after-login ─────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !hydrated) return;
    const hash = window.location.hash;
    const match = hash.match(/^#book-(.+)$/);
    if (match) {
      const target = decodeURIComponent(match[1]);
      const svc =
        shuffledServices.find((s) => s.domain_service_id === target) ??
        shuffledServices.find((s) => s.name === target);
      if (svc) {
        setPanel({ mode: "booking", service: svc });
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [isLoggedIn, hydrated, shuffledServices]);

  // ── Right-panel body ──────────────────────────────────────────────────────
  const renderPanelBody = () => {
    if (!hydrated) {
      return (
        <div className="flex items-center justify-center h-full py-16">
          <div
            className="w-8 h-8 border-[3px] rounded-full animate-spin"
            style={{ borderColor: `${brand}30`, borderTopColor: brand }}
          />
        </div>
      );
    }

    if (panel.mode === "done") {
      return (
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl animate-fade-in-up" style={{ background: `${brand}18` }}>✅</div>
          <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            <p className="font-bold text-ink-800 text-base">Booking Confirmed!</p>
            <p className="text-xs text-ink-400 mt-1">{panel.serviceName}</p>
          </div>
          <div className="rounded-xl px-6 py-3 w-full animate-fade-in-up" style={{ background: `${brand}0d`, border: `1px solid ${brand}30`, animationDelay: "160ms" }}>
            <p className="text-xs text-ink-400 mb-1">Booking Number</p>
            <p className="text-xl font-extrabold" style={{ color: brand }}>{panel.bookingNumber}</p>
          </div>
          <p className="text-xs text-ink-500 animate-fade-in-up" style={{ animationDelay: "220ms" }}>
            Technician assigned within 30 min. Confirmation via SMS &amp; WhatsApp.
          </p>
          <button onClick={() => setPanel({ mode: "idle" })} className="text-xs font-semibold underline transition-opacity hover:opacity-70" style={{ color: brand }}>
            Book another service
          </button>
          <Link href="/customer/bookings" className="text-xs text-ink-400 hover:text-ink-700 underline transition-colors">
            View my bookings →
          </Link>
        </div>
      );
    }

    if (panel.mode === "booking" && isLoggedIn && customer) {
      return (
        <InlineBookingPanel
          key={panel.service.domain_service_id}
          brand={brand}
          service={panel.service}
          customer={customer}
          cityPrices={priceCache[panel.service.service_id] ?? []}
          cities={cities}
          domainId={domainId}
          onBookingDone={(bn) =>
            setPanel({ mode: "done", bookingNumber: bn, serviceName: panel.service.name })
          }
        />
      );
    }

    if (isLoggedIn) {
      return (
        <div className="flex flex-col items-center text-center gap-5 py-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: `${brand}10` }}>🛠️</div>
          <div>
            <p className="font-bold text-ink-800">Ready to book?</p>
            <p className="text-sm text-ink-400 mt-1">
              Welcome back, <span className="font-semibold text-ink-700">{customer?.name?.split(" ")[0] ?? "there"}</span>!
              <br />Click <strong>Book Now</strong> on any service.
            </p>
          </div>
          <div className="mt-2 pt-5 border-t border-ink-100 w-full space-y-2 text-xs text-ink-500">
            {["✅ 30-day service warranty", "🛡️ Verified & insured technicians", "📍 Doorstep service at your schedule"].map((b) => (
              <p key={b} className="flex items-start gap-1.5 text-left">{b}</p>
            ))}
          </div>
          <Link href="/customer/bookings" className="text-xs text-ink-400 hover:text-ink-700 underline transition-colors mt-2">
            My bookings →
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center text-center gap-5 py-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: `${brand}10` }}>👋</div>
        <div>
          <p className="font-bold text-ink-800 text-base">Login to book a service</p>
          <p className="text-sm text-ink-400 mt-1">Select any service and click <strong>Book Now</strong> to get started.</p>
        </div>
        <Link
          href="/login"
          className="text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300 text-sm"
          style={{ background: brand, boxShadow: `0 8px 20px -8px ${brand}80` }}
        >
          Login / Sign Up →
        </Link>
        <div className="mt-2 pt-5 border-t border-ink-100 w-full space-y-2 text-xs text-ink-500">
          {["✅ 30-day service warranty", "🛡️ Verified technicians", "📍 Doorstep service"].map((b) => (
            <p key={b}>{b}</p>
          ))}
        </div>
        <p className="text-[11px] text-ink-300 pt-4 border-t border-ink-100 w-full">
          By booking you agree to our{" "}
          <Link href="/terms" className="underline hover:text-ink-500">Terms</Link> &{" "}
          <Link href="/privacy" className="underline hover:text-ink-500">Privacy Policy</Link>.
        </p>
      </div>
    );
  };

  const panelTitle = () => {
    if (!hydrated) return "Loading…";
    if (panel.mode === "done") return "Booking Confirmed 🎉";
    if (panel.mode === "booking") return panel.service.name;
    if (isLoggedIn) return "Book a Service";
    return "Your Account";
  };

  // ── Pagination controls ───────────────────────────────────────────────────
  const PaginationBar = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-ink-400">
          Showing{" "}
          <span className="font-semibold text-ink-700">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
          </span>{" "}
          of <span className="font-semibold text-ink-700">{filtered.length}</span> services
        </p>

        <div className="flex items-center gap-1.5">
          {/* Prev */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink-50"
            style={{ borderColor: "#e5e5e8", color: "#4a4a54" }}
          >
            ‹
          </button>

          {/* Page numbers with ellipsis */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            const isActive = page === currentPage;
            const near = Math.abs(page - currentPage) <= 1;
            const isFirst = page === 1;
            const isLast = page === totalPages;
            const showEllipsisBefore = page === currentPage - 2 && currentPage - 2 > 1;
            const showEllipsisAfter = page === currentPage + 2 && currentPage + 2 < totalPages;

            if (showEllipsisBefore || showEllipsisAfter) {
              return <span key={`ell-${page}`} className="w-6 text-center text-ink-300 text-sm select-none">…</span>;
            }
            if (!isFirst && !isLast && !near) return null;

            return (
              <button
                key={page}
                onClick={() => goToPage(page)}
                aria-label={`Page ${page}`}
                aria-current={isActive ? "page" : undefined}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border transition-all"
                style={
                  isActive
                    ? { background: brand, borderColor: brand, color: "#fff", boxShadow: `0 4px 12px -4px ${brand}60` }
                    : { borderColor: "#e5e5e8", color: "#4a4a54", background: "#fff" }
                }
              >
                {page}
              </button>
            );
          })}

          {/* Next */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink-50"
            style={{ borderColor: "#e5e5e8", color: "#4a4a54" }}
          >
            ›
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Branded hero / page header ───────────────────────────────────── */}
      <div
        ref={headerRef}
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${brand}0f 0%, ${brand}1c 60%, ${brand}08 100%)`,
          borderBottom: `1px solid ${brand}22`,
        }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-[0.07] blur-3xl" style={{ background: brand }} />
          <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full opacity-[0.05] blur-2xl" style={{ background: brand }} />
        </div>

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-7">
          <nav
            className={`text-xs text-ink-400 mb-5 flex items-center gap-1.5 transition-all duration-500 ${headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-ink-700 transition-colors">Home</Link>
            <span className="text-ink-200" aria-hidden>›</span>
            <span className="font-medium" style={{ color: brand }}>All Services</span>
          </nav>

          <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 transition-all duration-500 delay-100 ${headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3 text-white" style={{ background: "#F26522" }}>
                🔧 Professional Home Services
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-ink-900 leading-tight">All Services</h1>
              {selectedCity ? (
                <p className="text-sm text-ink-500 mt-1.5">
                  Showing prices for{" "}
                  <button onClick={openCityModal} className="font-bold transition-all hover:opacity-80 underline underline-offset-2 decoration-dotted" style={{ color: brand }}>
                    📍 {selectedCity.name}
                  </button>
                  <span className="text-ink-300 mx-1.5">·</span>
                  <button onClick={openCityModal} className="text-ink-400 hover:text-ink-700 transition-colors text-xs underline">Change city</button>
                </p>
              ) : (
                <p className="text-sm text-ink-400 mt-1.5">
                  <button onClick={openCityModal} className="font-semibold underline underline-offset-2 decoration-dotted transition-colors hover:opacity-80" style={{ color: brand }}>
                    📍 Select your city
                  </button>
                  {" "}to see accurate local pricing
                </p>
              )}
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className="text-sm font-extrabold px-4 py-2 rounded-xl text-white" style={{ background: "#F26522", boxShadow: "0 4px 14px -4px rgba(242,101,34,0.45)" }}>
                {filtered.length} Service{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-3 text-[10px] font-semibold">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-blue-100 text-blue-800">✅ Verified technicians</span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-blue-100 text-blue-800">🛡️ 30-day warranty</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile category strip ─────────────────────────────────────────── */}
      <div className="md:hidden sticky top-[73px] z-30 bg-white/95 backdrop-blur-sm border-b border-ink-100 shadow-sm">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
          <button
            onClick={() => setActiveCategory("all")}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all"
            style={activeCategory === "all" ? { background: brand, borderColor: brand, color: "#fff" } : { borderColor: "#e5e5e8", color: "#4a4a54", background: "#fff" }}
          >
            All ({shuffledServices.length})
          </button>
          {tabs.map((cat) => (
            <button
              key={cat.domain_category_id}
              onClick={() => setActiveCategory(cat.category_id)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all flex items-center gap-1.5"
              style={activeCategory === cat.category_id ? { background: brand, borderColor: brand, color: "#fff" } : { borderColor: "#e5e5e8", color: "#4a4a54", background: "#fff" }}
            >
              {cat.icon || iconFor(cat.name)} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3-column layout ──────────────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-6">
        <div className="flex gap-6 items-start">

          {/* ── Col 1: Categories sidebar (desktop, sticky) ── */}
          <aside className="hidden md:block w-56 flex-shrink-0 sticky top-[88px]">
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest border-b border-ink-100" style={{ color: brand }}>
                Categories
              </div>
              <nav className="py-2" aria-label="Service categories">
                <button
                  onClick={() => setActiveCategory("all")}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 flex items-center gap-2.5"
                  style={activeCategory === "all" ? { background: `${brand}12`, color: brand, fontWeight: 700 } : { color: "#4a4a54" }}
                >
                  <span className="text-base">🔧</span>
                  <span className="flex-1">All Services</span>
                  <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold" style={{ background: activeCategory === "all" ? `${brand}20` : "#f3f3f6", color: activeCategory === "all" ? brand : "#9ca3af" }}>
                    {shuffledServices.length}
                  </span>
                </button>
                {tabs.map((cat) => {
                  const count = shuffledServices.filter((s) => s.category_id === cat.category_id || s.category_name === cat.name).length;
                  const isActive = activeCategory === cat.category_id;
                  return (
                    <button
                      key={cat.domain_category_id}
                      onClick={() => setActiveCategory(cat.category_id)}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 flex items-center gap-2.5 relative overflow-hidden"
                      style={isActive ? { background: `${brand}12`, color: brand, fontWeight: 700 } : { color: "#4a4a54" }}
                    >
                      {isActive && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full" style={{ background: brand }} />}
                      <span className="text-base">{cat.icon || iconFor(cat.name)}</span>
                      <span className="flex-1 truncate">{cat.name}</span>
                      <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold" style={{ background: isActive ? `${brand}20` : "#f3f3f6", color: isActive ? brand : "#9ca3af" }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="mt-4 bg-white rounded-2xl border border-ink-100 shadow-sm p-4 space-y-2 text-xs text-ink-500">
              <p className="font-bold text-ink-700 text-xs uppercase tracking-wide mb-3">Quick Links</p>
              <Link href="/customer/bookings" className="flex items-center gap-2 hover:text-ink-900 transition-colors py-1">📋 My Bookings</Link>
              <Link href="/customer/profile" className="flex items-center gap-2 hover:text-ink-900 transition-colors py-1">👤 My Profile</Link>
              <Link href="/#services" className="flex items-center gap-2 hover:text-ink-900 transition-colors py-1">🏠 Back to Home</Link>
            </div>
          </aside>

          {/* ── Col 2: Services grid ── */}
          <main ref={col2Ref} className="flex-1 min-w-0 scroll-mt-24">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <p className="font-bold text-ink-700">No services in this category yet.</p>
                <button onClick={() => setActiveCategory("all")} className="mt-3 text-sm underline" style={{ color: brand }}>
                  View all services
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginated.map((svc, i) => {
                    const { price, isOverride, isAvailable } = resolvePrice(svc);
                    const gst = Math.round((price * svc.gst_percent) / 100);
                    const total = price + gst;
                    const isSelected = panel.mode === "booking" && panel.service.domain_service_id === svc.domain_service_id;
                    const isHovered = hoveredCard === svc.domain_service_id;
                    return (
                      <ServiceCard
                        key={svc.domain_service_id}
                        svc={svc}
                        brand={brand}
                        price={price}
                        total={total}
                        gstPercent={svc.gst_percent}
                        isOverride={isOverride}
                        isAvailable={isAvailable}
                        selectedCity={selectedCity?.name}
                        isSelected={isSelected}
                        isHovered={isHovered}
                        index={i}
                        onHover={(id) => setHoveredCard(id)}
                        onBook={() => handleBook(svc)}
                      />
                    );
                  })}
                </div>
                <PaginationBar />
              </>
            )}
          </main>

          {/* ── Col 3: Right panel (sticky, desktop) ── */}
          <aside id="right-panel" className="hidden lg:block w-72 flex-shrink-0 sticky top-[88px]">
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden min-h-[460px] flex flex-col">
              <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${brand}08 0%, ${brand}14 100%)` }}>
                <div className="min-w-0">
                  {panel.mode === "booking" && <p className="text-[10px] text-ink-400 uppercase tracking-widest font-bold mb-0.5">Booking</p>}
                  <p className="text-sm font-bold text-ink-800 truncate">{panelTitle()}</p>
                </div>
                {panel.mode === "booking" && (
                  <button onClick={() => setPanel({ mode: "idle" })} className="ml-2 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-all">
                    ✕
                  </button>
                )}
              </div>
              <div className="flex-1 p-5 overflow-y-auto">{renderPanelBody()}</div>
            </div>
          </aside>

        </div>
      </div>

      {/* ── Mobile bottom sheet for booking ─────────────────────────────── */}
      {panel.mode === "booking" && isLoggedIn && customer && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t border-ink-200 shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.18)] rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 sticky top-0 bg-white z-10">
            <div>
              <p className="text-[10px] text-ink-400 uppercase tracking-widest font-bold">Booking</p>
              <p className="text-sm font-bold text-ink-800">{panel.service.name}</p>
            </div>
            <button onClick={() => setPanel({ mode: "idle" })} className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center text-ink-500 hover:bg-ink-200 transition-colors font-bold">✕</button>
          </div>
          <div className="p-5">
            <InlineBookingPanel
              key={panel.service.domain_service_id + "-mob"}
              brand={brand}
              service={panel.service}
              customer={customer}
              cityPrices={priceCache[panel.service.service_id] ?? []}
              cities={cities}
              domainId={domainId}
              onBookingDone={(bn) =>
                setPanel({ mode: "done", bookingNumber: bn, serviceName: panel.service.name })
              }
            />
          </div>
        </div>
      )}

      {/* Mobile done sheet */}
      {panel.mode === "done" && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t border-ink-200 shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.18)] rounded-t-3xl p-6 animate-slide-up">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: `${brand}18` }}>✅</div>
            <p className="font-bold text-ink-800">Booking Confirmed!</p>
            <div className="rounded-xl px-5 py-3 w-full" style={{ background: `${brand}0d`, border: `1px solid ${brand}30` }}>
              <p className="text-xs text-ink-400 mb-1">Booking Number</p>
              <p className="text-xl font-extrabold" style={{ color: brand }}>{panel.bookingNumber}</p>
            </div>
            <button onClick={() => setPanel({ mode: "idle" })} className="text-sm font-semibold underline" style={{ color: brand }}>Book another</button>
            <button onClick={() => setPanel({ mode: "idle" })} className="absolute top-4 right-4 text-ink-400 text-xl font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Service card sub-component ────────────────────────────────────────────────
interface CardProps {
  svc: DomainService;
  brand: string;
  price: number;
  total: number;
  gstPercent: number;
  isOverride: boolean;
  isAvailable: boolean;
  selectedCity?: string;
  isSelected: boolean;
  isHovered: boolean;
  index: number;
  onHover: (id: string | null) => void;
  onBook: () => void;
}

function ServiceCard({ svc, brand, price, total, gstPercent, isOverride, isAvailable, selectedCity, isSelected, isHovered, index, onHover, onBook }: CardProps) {
  const { ref, visible } = useInView(0.08);

  return (
    <div
      ref={ref}
      onMouseEnter={() => onHover(svc.domain_service_id)}
      onMouseLeave={() => onHover(null)}
      className="transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transitionDelay: `${Math.min(index * 40, 300)}ms`,
      }}
    >
      <div
        className="bg-white rounded-2xl border overflow-hidden transition-all duration-300"
        style={{
          borderColor: isSelected ? brand : isHovered ? `${brand}50` : "#e8e8ef",
          boxShadow: isSelected
            ? `0 0 0 2px ${brand}30, 0 8px 32px -8px ${brand}40`
            : isHovered ? "0 8px 32px -8px rgba(0,0,0,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
          transform: isHovered && !isSelected ? "translateY(-2px)" : "translateY(0)",
        }}
      >
        <div className="flex items-stretch gap-0">
          <div
            className="flex-shrink-0 w-48 sm:w-56 md:w-64 lg:w-72 relative overflow-hidden flex items-center justify-center transition-all duration-500 min-h-[148px]"
            style={{ background: `linear-gradient(145deg, ${brand}12 0%, ${brand}22 100%)` }}
          >
            {svc.image_url ? (
              <Image
                src={svc.image_url}
                alt={svc.name}
                fill
                sizes="(max-width: 640px) 160px, (max-width: 768px) 192px, 224px"
                className="object-cover object-center transition-transform duration-500"
                style={{ transform: isHovered ? "scale(1.06)" : "scale(1)" }}
              />
            ) : (
              <span
                className="text-4xl transition-transform duration-300"
                style={{ transform: isHovered ? "scale(1.15) rotate(-4deg)" : "scale(1) rotate(0deg)" }}
              >
                {iconFor(svc.category_name)}
              </span>
            )}
            {svc.is_featured && (
              <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: brand }}>
                ★ Featured
              </span>
            )}
          </div>

          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: `${brand}12`, color: brand }}>
                    {svc.category_name}
                  </span>
                  {!isAvailable && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Unconfirmed city</span>
                  )}
                </div>
                <h3 className="font-bold text-ink-900 text-sm sm:text-base leading-tight">{svc.name}</h3>
                {svc.description && (
                  <p className="text-xs text-ink-400 mt-1 line-clamp-2 leading-relaxed">{svc.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <span className="text-[10px] text-ink-500 bg-ink-50 border border-ink-100 rounded-full px-2 py-0.5 flex items-center gap-1">⏱ ~{svc.duration_mins} min</span>
                  <span className="text-[10px] text-ink-500 bg-ink-50 border border-ink-100 rounded-full px-2 py-0.5 flex items-center gap-1">🛡 30-day warranty</span>
                </div>
              </div>

              <div className="flex-shrink-0 text-right min-w-[80px]">
                <div className="text-xs text-ink-400 mb-0.5">Starting at</div>
                <div className="text-xl font-extrabold text-ink-900 leading-tight">₹{price.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-ink-400 mt-0.5">+{gstPercent}% GST</div>
                <div className="text-[11px] font-semibold mt-0.5" style={{ color: brand }}>₹{total.toLocaleString("en-IN")} total</div>
                {isOverride && selectedCity && (
                  <div className="text-[9px] font-bold mt-1 flex items-center justify-end gap-0.5" style={{ color: brand }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: brand }} />
                    {selectedCity}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-ink-100">
              <button
                onClick={onBook}
                className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5"
                style={{
                  background: isSelected ? `${brand}cc` : brand,
                  boxShadow: isHovered ? `0 6px 20px -6px ${brand}80` : "none",
                  transform: isHovered ? "scale(1.01)" : "scale(1)",
                }}
              >
                {isSelected ? (<><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Booking…</>) : "Book Now"}
              </button>
              <Link
                href={serviceHref(svc)}
                className="flex-shrink-0 border text-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-ink-50"
                style={{ borderColor: isHovered ? `${brand}60` : "#e5e5e8", color: isHovered ? brand : "#6b7280" }}
              >
                Details →
              </Link>
            </div>
          </div>
        </div>
        {isSelected && <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${brand}, ${brand}60)` }} />}
      </div>
    </div>
  );
}
