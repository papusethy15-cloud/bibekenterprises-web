"use client";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface Props {
  brand: string;
  phone: string;
  phoneHref: string;
}

/**
 * Final conversion CTA, right before the footer — redesigned from a flat
 * solid-color banner into a layered, animated "last push" section:
 *  - Deep gradient base (brand -> near-black) instead of a flat fill, plus
 *    drifting ambient blobs and a faint dot-grid texture for depth.
 *  - Heading + copy + buttons scroll-reveal in as a sequence, not all at once.
 *  - Primary button has a soft pulsing glow ring (urgency, without being a
 *    literal countdown timer/dark-pattern) and lifts on hover; secondary
 *    (call) button gets a subtle ringing-phone wiggle on hover.
 *  - A small trust strip (warranty / certified / same-day) sits beneath the
 *    buttons so the final CTA still carries the site's core promises.
 */
export default function FinalCta({ brand, phone, phoneHref }: Props) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Layered gradient base — brand color deepening into near-black, instead
          of a flat single-color fill */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, #1A3FA4 0%, #0e2470 45%, #090f2a 100%)" }}
      />

      {/* Faint dot-grid texture for subtle depth/craft */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Drifting ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[26rem] h-[26rem] rounded-full bg-white opacity-[0.08] animate-blob" />
        <div
          className="absolute -bottom-28 -right-16 w-[24rem] h-[24rem] rounded-full bg-white opacity-[0.07] animate-blob"
          style={{ animationDelay: "5s" }}
        />
      </div>

      <div
        ref={ref}
        className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
      >
        <div className={isVisible ? "animate-fade-in-up" : "opacity-0"}>
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold mb-6 bg-white/10 border border-white/20 text-white">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Technicians available right now
          </span>
        </div>

        <h2
          className={`text-3xl md:text-5xl font-extrabold mb-4 text-white text-balance ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
          style={{ animationDelay: "100ms" }}
        >
          Appliance not working?
          <br />
          Get it fixed <span className="relative inline-block">
            today!
            <svg
              aria-hidden
              viewBox="0 0 200 16"
              className="absolute left-0 -bottom-1 w-full h-3 text-white/40"
              preserveAspectRatio="none"
            >
              <path d="M2 12 Q 100 2 198 12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h2>

        <p
          className={`text-white/85 text-lg mb-10 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
          style={{ animationDelay: "180ms" }}
        >
          Book in 60 seconds. Certified technician at your door.
        </p>

        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center mb-10 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
          style={{ animationDelay: "260ms" }}
        >
          <Link
            href="/booking"
            className="group relative inline-flex items-center justify-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl" style={{ background: "#F26522", boxShadow: "0 8px 32px rgba(242,101,34,0.4)" }}
          >
            {/* Soft pulsing glow behind the primary button — draws the eye without being a fake countdown/urgency dark pattern */}
            <span
              aria-hidden
              className="absolute -inset-1 rounded-xl bg-white/25 blur-md animate-pulse -z-10"
            />
            <span className="text-xl transition-transform duration-300 group-hover:rotate-12">📅</span>
            Book a Service Now
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>

          <a
            href={phoneHref}
            className="group inline-flex items-center justify-center gap-2 border-2 border-white/50 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-300 hover:bg-white/10 hover:border-white"
          >
            <span className="text-xl transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110">📞</span>
            {phone}
          </a>
        </div>

        {/* Trust strip — echoes the hero's promises so the final CTA still carries them */}
        <div
          className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/75 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
          style={{ animationDelay: "340ms" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-white">✓</span> 30-day service warranty
          </div>
          <span className="hidden sm:inline text-white/30">|</span>
          <div className="flex items-center gap-2">
            <span className="text-white">✓</span> Certified technicians
          </div>
          <span className="hidden sm:inline text-white/30">|</span>
          <div className="flex items-center gap-2">
            <span className="text-white">✓</span> Same-day service available
          </div>
        </div>
      </div>
    </section>
  );
}
