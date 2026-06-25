"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CityPicker from "@/app/CityPicker";
import SearchBox, { SearchableService } from "./SearchBox";
import { useAuth } from "@/context/AuthContext";

interface Props {
  siteName: string;
  logoUrl: string | null;
  brand: string;
  phone: string;
  email: string;
  whatsapp?: string | null;
  services: SearchableService[];
}

export default function Header({ siteName, logoUrl, brand, phone, email, whatsapp, services }: Props) {
  const router  = useRouter();
  const { hydrated, isLoggedIn, user, logout } = useAuth();

  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    setMenuOpen(false);
    await logout();
    setLoggingOut(false);
    router.push("/");
  };

  const phoneHref = `tel:${phone.replace(/\s/g, "")}`;

  /* First letter of name for avatar badge */
  const initial = user?.name ? user.name.trim()[0].toUpperCase() : "?";

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "shadow-[0_4px_24px_-6px_rgba(0,0,0,0.12)]" : ""
      }`}
    >
      {/* ── Top utility bar ── */}
      <div className="hidden sm:block text-white/80 text-xs" style={{ background: "#0f1a35" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <a href={phoneHref} className="hover:text-white transition-colors flex items-center gap-1.5">
              <span className="text-[10px]">📞</span> {phone}
            </a>
            <a href={`mailto:${email}`} className="hover:text-white transition-colors flex items-center gap-1.5">
              <span className="text-[10px]">✉️</span> {email}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/50">Mon–Sat: 8 AM – 8 PM</span>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                className="flex items-center gap-1.5 text-[#4ade80] hover:text-[#86efac] transition-colors font-semibold"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.557 4.126 1.533 5.863L0 24l6.29-1.518C7.975 23.453 9.945 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.5-5.197-1.374l-.373-.221-3.864.933.977-3.764-.243-.386C2.516 15.614 2 13.867 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Main row ── */}
      <div
        className="bg-white/96 backdrop-blur-md border-b border-ink-100"
        style={{ transition: "background 0.3s" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-3 md:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="h-9 object-contain transition-opacity group-hover:opacity-85"
                />
              ) : (
                <>
                  <span
                    style={{ color: brand }}
                    className="text-2xl font-extrabold transition-opacity group-hover:opacity-85"
                  >
                    {siteName.split(" ")[0]}
                  </span>
                  {siteName.split(" ").length > 1 && (
                    <span className="text-2xl font-extrabold text-ink-900 transition-opacity group-hover:opacity-85">
                      {siteName.split(" ").slice(1).join(" ")}
                    </span>
                  )}
                </>
              )}
            </Link>

            {/* Search — desktop */}
            <div className="hidden md:block flex-1 max-w-xl mx-auto">
              <SearchBox services={services} brand={brand} />
            </div>

            {/* Right-side actions */}
            <div className="flex items-center gap-3 ml-auto md:ml-0 shrink-0">
              <CityPicker />

              {/* Auth section */}
              {hydrated && (
                isLoggedIn ? (
                  /* ── Logged-in: avatar + redesigned dropdown ── */
                  <div ref={menuRef} className="relative hidden md:block">
                    <button
                      onClick={() => setMenuOpen((o) => !o)}
                      className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition-all duration-200"
                      style={{
                        borderColor: menuOpen ? `${brand}60` : "#e2e2e8",
                        background: menuOpen ? `${brand}08` : "transparent",
                        boxShadow: menuOpen ? `0 0 0 3px ${brand}15` : "none",
                      }}
                    >
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${brand} 0%, ${brand}cc 100%)`,
                        }}
                      >
                        {initial}
                      </span>
                      <span className="text-sm font-semibold text-ink-700 max-w-[90px] truncate">
                        {user?.name?.split(" ")[0]}
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 text-ink-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {menuOpen && (
                      <div
                        className="absolute right-0 mt-2.5 w-60 bg-white rounded-2xl shadow-2xl border border-ink-100/80 overflow-hidden z-50 animate-fade-in-up"
                        style={{ animationDuration: "0.16s" }}
                      >
                        {/* Dropdown header */}
                        <div
                          className="px-4 py-4 flex items-center gap-3"
                          style={{
                            background: `linear-gradient(135deg, ${brand}10 0%, ${brand}1e 100%)`,
                            borderBottom: `1px solid ${brand}20`,
                          }}
                        >
                          <span
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shrink-0 shadow"
                            style={{
                              background: `linear-gradient(135deg, ${brand} 0%, ${brand}cc 100%)`,
                            }}
                          >
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink-900 truncate leading-tight">
                              {user?.name}
                            </p>
                            <p className="text-[11px] text-ink-400 mt-0.5 truncate">
                              {user?.mobile}
                            </p>
                          </div>
                        </div>

                        {/* Nav items */}
                        <nav className="py-1.5">
                          {[
                            {
                              href: "/customer/bookings",
                              label: "My Bookings",
                              icon: "📋",
                              desc: "View & track your bookings",
                            },
                            {
                              href: "/customer/addresses",
                              label: "My Addresses",
                              icon: "📍",
                              desc: "Manage saved locations",
                            },
                            {
                              href: "/customer/profile",
                              label: "Profile",
                              icon: "👤",
                              desc: "Edit your account details",
                            },
                          ].map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 group transition-all duration-150 hover:bg-ink-50"
                            >
                              <span className="w-8 h-8 rounded-lg bg-ink-50 group-hover:bg-white flex items-center justify-center text-sm shrink-0 transition-all border border-ink-100 group-hover:border-ink-200">
                                {item.icon}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink-800 leading-tight">
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-ink-400 leading-tight">
                                  {item.desc}
                                </p>
                              </div>
                              <svg
                                className="w-3.5 h-3.5 text-ink-200 group-hover:text-ink-400 ml-auto transition-colors shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Link>
                          ))}
                        </nav>

                        {/* Divider + Logout */}
                        <div className="border-t border-ink-100 py-1.5">
                          <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all duration-150 disabled:opacity-60"
                          >
                            <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-sm shrink-0 border border-red-100">
                              🚪
                            </span>
                            {loggingOut ? "Signing out…" : "Sign Out"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Logged out ── */
                  <Link
                    href="/login"
                    className="hidden md:block text-sm font-semibold text-ink-600 hover:text-ink-900 transition-colors px-2"
                  >
                    Login
                  </Link>
                )
              )}

              <Link
                href="/booking"
                style={{
                  background: "linear-gradient(135deg, #F26522 0%, #e05518 100%)",
                  boxShadow: "0 4px 14px -4px rgba(242,101,34,0.55)",
                }}
                className="text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
              >
                Book Now
              </Link>
            </div>
          </div>

          {/* Search — mobile */}
          <div className="md:hidden pb-3">
            <SearchBox services={services} brand={brand} />
          </div>
        </div>
      </div>
    </header>
  );
}
