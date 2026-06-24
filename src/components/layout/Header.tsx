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
    <header className={`sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? "shadow-md" : ""}`}>
      {/* ── Top utility bar ── */}
      <div className="hidden sm:block bg-ink-900 text-white/80 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <a href={phoneHref} className="hover:text-brand-400 transition-colors">📞 {phone}</a>
            <a href={`mailto:${email}`} className="hover:text-brand-400 transition-colors">✉️ {email}</a>
          </div>
          <div className="flex items-center gap-4">
            <span>Mon–Sat: 8 AM – 8 PM</span>
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} className="hover:text-brand-400 transition-colors">
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Main row ── */}
      <div className="bg-white/95 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-3 md:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={siteName} className="h-9 object-contain" />
              ) : (
                <>
                  <span style={{ color: brand }} className="text-2xl font-extrabold">
                    {siteName.split(" ")[0]}
                  </span>
                  {siteName.split(" ").length > 1 && (
                    <span className="text-2xl font-extrabold text-ink-900">
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

              {/* Auth section — only render after hydration to avoid flicker */}
              {hydrated && (
                isLoggedIn ? (
                  /* ── Logged-in: avatar + dropdown ── */
                  <div ref={menuRef} className="relative hidden md:block">
                    <button
                      onClick={() => setMenuOpen((o) => !o)}
                      className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border border-ink-200 hover:border-ink-300 transition-colors"
                    >
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: brand }}
                      >
                        {initial}
                      </span>
                      <span className="text-sm font-medium text-ink-700 max-w-[90px] truncate">
                        {user?.name?.split(" ")[0]}
                      </span>
                      <svg className={`w-3.5 h-3.5 text-ink-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                           viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-ink-100 py-2 z-50 animate-fade-in-up"
                           style={{ animationDuration: "0.18s" }}>
                        <div className="px-4 py-2.5 border-b border-ink-100 mb-1">
                          <p className="text-sm font-semibold text-ink-900 truncate">{user?.name}</p>
                          <p className="text-xs text-ink-400">{user?.mobile}</p>
                        </div>
                        {[
                          { href: "/customer/bookings",  label: "My Bookings",  icon: "📋" },
                          { href: "/customer/addresses", label: "My Addresses", icon: "📍" },
                          { href: "/customer/profile",   label: "Profile",      icon: "👤" },
                        ].map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                          >
                            <span>{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                        <div className="border-t border-ink-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <span>🚪</span>
                            {loggingOut ? "Logging out…" : "Logout"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Logged out: Login link ── */
                  <Link
                    href="/login"
                    className="hidden md:block text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors"
                  >
                    Login
                  </Link>
                )
              )}

              <Link
                href="/booking"
                style={{ background: brand }}
                className="text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90 shadow-brand"
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
