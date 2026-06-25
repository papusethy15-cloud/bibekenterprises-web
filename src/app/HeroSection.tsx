"use client";
/**
 * HeroSection — fully animated left-side copy
 *
 * Animations used:
 *  • Trust badge     – slide down + fade in (immediate)
 *  • H1 lines        – each line slides up + fades in with 120ms stagger
 *  • Typed tagline   – character-by-character typewriter after h1 settles
 *  • Service chips   – staggered pop-in from below
 *  • CTA buttons     – slide up with lift + shine sweep on hover
 *  • Trust bullets   – staggered fade with ✓ icon pulse on reveal
 *  • Stats row       – count-up numbers animate once visible
 *  • Live badge      – persistent pulse dot
 *
 * The right half of the section is left intentionally empty so the
 * admin-uploaded banner image (appliance artwork) shows through.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DomainService } from "@/types";
import { serviceHref } from "@/lib/slug";

interface Props {
  brand:       string;
  bannerUrl:   string | null;
  tagline:     string;
  phone:       string;
  phoneHref:   string;
  featured:    DomainService[];
}

// ── tiny hook: fires once when element enters viewport ──────────────────────
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

// ── count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, active: boolean, duration = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(start);
    }, 16);
    return () => clearInterval(id);
  }, [active, target, duration]);
  return val;
}

// ── typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 28) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) return;
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return displayed;
}

// ── STAT ITEM ────────────────────────────────────────────────────────────────
function StatItem({
  target, suffix, label, active, brand, dark,
}: {
  target: number; suffix: string; label: string;
  active: boolean; brand: string; dark: boolean;
}) {
  const val = useCountUp(target, active);
  return (
    <div className="text-center sm:text-left">
      <div className="text-xl md:text-2xl font-extrabold tabular-nums leading-none" style={{ color: dark ? "#F26522" : "#1A3FA4" }}>
        {val.toLocaleString("en-IN")}{suffix}
      </div>
      <div className={`text-[11px] mt-0.5 font-medium ${dark ? "text-white/45" : "text-ink-400"}`}>
        {label}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function HeroSection({
  brand, bannerUrl, tagline, phone, phoneHref, featured,
}: Props) {
  const dark = !bannerUrl;          // dark bg when no banner image
  const { ref: rootRef, visible } = useOnScreen<HTMLDivElement>();
  const { ref: statsRef, visible: statsVisible } = useOnScreen<HTMLDivElement>();

  // Typewriter fires after h1 lines have animated in (~500 ms)
  const [twActive, setTwActive] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setTwActive(true), 520);
    return () => clearTimeout(t);
  }, [visible]);

  const typed = useTypewriter(tagline, twActive);
  // show blinking cursor while typing
  const typing = twActive && typed.length < tagline.length;

  // ── colour shortcuts ──────────────────────────────────────────────────────
  const textPrimary  = dark ? "text-white"          : "text-ink-900";
  const textMuted    = dark ? "text-white/60"        : "text-ink-500";
  const textFaint    = dark ? "text-white/35"        : "text-ink-300";
  const borderMuted  = dark ? "border-white/15"      : "border-ink-100";
  const chipBase     = dark
    ? "bg-white/8 border-white/15 text-white hover:bg-white/15"
    : "bg-white border-ink-200 text-ink-700 hover:border-blue-400 hover:bg-blue-50";

  // ── animation helper: slide-up with stagger ──────────────────────────────
  const su = (delay: number) => ({
    style: { animationDelay: `${delay}ms`, animationFillMode: "both" as const },
    className: visible ? "animate-fade-in-up" : "opacity-0 translate-y-4",
  });

  return (
    <div ref={rootRef} className="max-w-[600px]">

      {/* ── 1. Trust badge ──────────────────────────────────────────────── */}
      <div
        {...su(0)}
        className={`${su(0).className} inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 mb-7 border ${
          dark
            ? "bg-white/8 border-white/15 text-white"
            : "bg-blue-50 border-blue-200 text-blue-900"
        }`}
      >
        {/* Live dot */}
        <span className="relative flex h-2.5 w-2.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: "#F26522" }}
          />
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: "#F26522" }}
          />
        </span>
        <span className="text-sm font-semibold">⭐ Trusted by 10,000+ happy customers</span>
      </div>

      {/* ── 2. H1 — 3 lines, each slides up independently ───────────────── */}
      <h1
        className={`font-extrabold leading-[1.1] mb-5 ${textPrimary}`}
        style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
      >
        {/* Line 1 */}
        <span className="block overflow-hidden">
          <span
            className={visible ? "block animate-fade-in-up" : "block opacity-0 translate-y-6"}
            style={{ animationDelay: "60ms", animationFillMode: "both" }}
          >
            Fast &amp; Reliable
          </span>
        </span>

        {/* Line 2 — brand colour */}
        <span className="block overflow-hidden">
          <span
            className={visible ? "block animate-fade-in-up" : "block opacity-0 translate-y-6"}
            style={{ color: "#1A3FA4", animationDelay: "170ms", animationFillMode: "both" }}
          >
            Home Appliance
          </span>
        </span>

        {/* Line 3 */}
        <span className="block overflow-hidden">
          <span
            className={visible ? "block animate-fade-in-up" : "block opacity-0 translate-y-6"}
            style={{ animationDelay: "280ms", animationFillMode: "both" }}
          >
            Repair at Your Door
          </span>
        </span>
      </h1>

      {/* ── 3. Typewriter tagline ────────────────────────────────────────── */}
      <div
        {...su(380)}
        className={`${su(380).className} text-base md:text-lg leading-relaxed mb-7 min-h-[3em] ${textMuted}`}
      >
        {typed}
        {typing && (
          <span
            className="inline-block w-0.5 h-[1.1em] align-middle ml-0.5 animate-pulse rounded-sm"
            style={{ background: "#F26522", verticalAlign: "middle" }}
          />
        )}
        {/* Reserve space so layout doesn't jump */}
        {!twActive && <span className="invisible">{tagline}</span>}
      </div>

      {/* ── 4. Featured service chips ────────────────────────────────────── */}
      {featured.length > 0 && (
        <div {...su(460)} className={`${su(460).className} flex flex-wrap gap-2 mb-7`}>
          {featured.slice(0, 5).map((s, i) => (
            <Link
              key={s.service_id}
              href={serviceHref(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 hover:-translate-y-0.5 ${chipBase}`}
              style={{
                animationDelay: `${480 + i * 60}ms`,
                animationFillMode: "both",
              }}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {/* ── 5. CTA buttons ──────────────────────────────────────────────── */}
      <div {...su(560)} className={`${su(560).className} flex flex-col sm:flex-row gap-3 mb-8`}>
        {/* Primary */}
        <Link
          href="/booking"
          className="group relative overflow-hidden inline-flex items-center justify-center gap-2 text-white font-bold px-7 py-3.5 rounded-xl text-base shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
          style={{ background: "#F26522", boxShadow: "0 8px 24px -6px rgba(242,101,34,0.55)" }}
        >
          {/* Shine sweep */}
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-600 pointer-events-none"
            style={{
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)",
            }}
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Book a Service
        </Link>

        {/* Secondary */}
        <a
          href={phoneHref}
          className={`inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl text-base border-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
            dark
              ? "border-white/25 text-white hover:bg-white/8"
              : "border-ink-200 text-ink-800 hover:bg-ink-50 hover:border-ink-300"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6 6l.94-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
          </svg>
          {phone}
        </a>
      </div>

      {/* ── 6. Trust bullets — staggered with icon pulse ─────────────────── */}
      <div
        {...su(660)}
        className={`${su(660).className} flex flex-wrap gap-x-5 gap-y-2.5 mb-8`}
      >
        {[
          { icon: "🛡️", text: "30-day service warranty" },
          { icon: "🎓", text: "Certified technicians" },
          { icon: "📋", text: "Transparent pricing" },
        ].map((item, i) => (
          <div
            key={item.text}
            className={`flex items-center gap-2 text-sm font-medium ${textMuted}`}
            style={{
              animationDelay: `${680 + i * 80}ms`,
              animationFillMode: "both",
            }}
          >
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[13px]"
              style={{ background: dark ? "rgba(255,255,255,0.08)" : "#e8edf9", border: `1px solid rgba(26,63,164,0.3)` }}
            >
              {item.icon}
            </span>
            {item.text}
          </div>
        ))}
      </div>

      {/* ── 7. Divider ───────────────────────────────────────────────────── */}
      <div
        {...su(760)}
        className={`${su(760).className} w-full h-px mb-7`}
        style={{ background: dark ? "rgba(255,255,255,0.08)" : "#f1f1f3" }}
      />

      {/* ── 8. Stats row — count-up numbers ──────────────────────────────── */}
      <div
        ref={statsRef}
        {...su(820)}
        className={`${su(820).className} grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4`}
      >
        <StatItem target={10000} suffix="+"  label="Happy Customers"      active={statsVisible} brand={brand} dark={dark} />
        <StatItem target={500}   suffix="+"  label="Certified Technicians" active={statsVisible} brand={brand} dark={dark} />
        <StatItem target={50}    suffix="+"  label="Cities Covered"         active={statsVisible} brand={brand} dark={dark} />
        <div className="text-center sm:text-left">
          <div className="text-xl md:text-2xl font-extrabold leading-none" style={{ color: dark ? "#F26522" : "#1A3FA4" }}>
            4.8★
          </div>
          <div className={`text-[11px] mt-0.5 font-medium ${dark ? "text-white/45" : "text-ink-400"}`}>
            Average Rating
          </div>
        </div>
      </div>

      {/* ── 9. Live status pill ──────────────────────────────────────────── */}
      <div
        {...su(900)}
        className={`${su(900).className} inline-flex items-center gap-2 mt-6 text-xs font-semibold ${textFaint}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
        </span>
        Technicians available now · Same-day service
      </div>

    </div>
  );
}
