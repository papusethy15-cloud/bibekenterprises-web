"use client";

import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface Reason {
  icon: string;
  title: string;
  desc: string;
}

const WHY_US: Reason[] = [
  { icon: "🛡️", title: "Certified Technicians",  desc: "All technicians are verified, trained, and background-checked." },
  { icon: "⚡", title: "Same Day Service",         desc: "Book before 12 PM and get same-day service in most areas." },
  { icon: "📋", title: "Transparent Pricing",      desc: "Get a detailed quotation before work starts. No hidden charges." },
  { icon: "🔁", title: "30-Day Service Warranty",  desc: "30-day warranty on all repairs and spare parts used." },
  { icon: "📍", title: "Real-Time Tracking",       desc: "Track your technician live on the map from assignment to arrival." },
  { icon: "💳", title: "Easy Payment",             desc: "Pay via UPI, Razorpay, card, cash or bank transfer." },
];

interface Props {
  brand: string;
  siteName: string;
}

/**
 * "Why Choose Us" — redesigned from a flat icon+text grid into a more
 * editorial, professional card layout:
 *  - Scroll-revealed heading (same cadence as the rest of the homepage).
 *  - Cards stagger in on scroll, alternating direction slightly via index
 *    so the grid feels composed rather than mechanically uniform.
 *  - Icon sits in a brand-tinted badge (not a bare emoji) that scales,
 *    rotates a touch, and gains a glow on hover — paired with a faint
 *    oversized index numeral in the corner for an editorial/"promise list"
 *    feel.
 *  - Card itself lifts, border goes brand-colored, and a soft radial glow
 *    fades in behind the icon on hover.
 */
export default function WhyChooseUs({ brand, siteName }: Props) {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: gridRef, isVisible: gridVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="relative py-24 bg-white overflow-hidden">
      {/* Faint ambient blobs, consistent with the rest of the homepage's sections */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 left-0 w-[24rem] h-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05] animate-blob"
          style={{ background: "#1A3FA4" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[22rem] h-[22rem] translate-x-1/3 translate-y-1/3 rounded-full opacity-[0.05] animate-blob"
          style={{ background: "#F26522", animationDelay: "6s" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`text-center mb-16 ${headerVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "#F26522" }}>
            Our Promise
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-ink-900 mt-2 mb-4">
            Why Choose {siteName}?
          </h2>
          <p className="text-ink-400 max-w-xl mx-auto">
            We set the highest standards for home appliance service.
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7"
        >
          {WHY_US.map((item, i) => {
            const isHovered = hovered === i;
            return (
              <div
                key={item.title}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className={`group relative overflow-hidden rounded-2xl p-7 bg-white border border-ink-100 transition-all duration-300 ease-out hover:-translate-y-1.5 ${
                  gridVisible ? "animate-fade-in-up" : "opacity-0"
                }`}
                style={{
                  animationDelay: `${i * 110}ms`,
                  borderColor: isHovered ? "rgba(26,63,164,0.45)" : undefined,
                  boxShadow: isHovered ? "0 20px 40px -14px rgba(26,63,164,0.22)" : "0 1px 2px rgba(10,10,11,0.04)",
                }}
              >
                {/* Oversized faint index numeral — editorial detail in the corner */}
                <span
                  aria-hidden
                  className="absolute -top-3 -right-1 text-7xl font-black select-none transition-colors duration-300"
                  style={{ color: isHovered ? "rgba(26,63,164,0.14)" : "rgba(10,10,11,0.035)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Soft radial glow behind the icon badge, fades in on hover */}
                <div
                  aria-hidden
                  className="absolute -top-8 -left-8 w-32 h-32 rounded-full blur-2xl transition-opacity duration-500"
                  style={{ background: "#1A3FA4", opacity: isHovered ? 0.14 : 0 }}
                />

                <div className="relative">
                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-xl text-2xl mb-5 transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3"
                    style={{
                      background: isHovered ? "#1A3FA4" : "rgba(26,63,164,0.10)",
                      boxShadow: isHovered ? "0 10px 24px -8px rgba(26,63,164,0.45)" : undefined,
                    }}
                  >
                    <span style={{ filter: isHovered ? "grayscale(0) brightness(2)" : undefined }}>
                      {item.icon}
                    </span>
                  </div>

                  <h3 className="font-bold text-ink-900 mb-2 text-lg">{item.title}</h3>
                  <p className="text-sm text-ink-400 leading-relaxed">{item.desc}</p>

                  {/* Bottom accent rule — draws in on hover */}
                  <div
                    aria-hidden
                    className="mt-5 h-0.5 rounded-full transition-all duration-500 ease-out"
                    style={{ background: "#F26522", width: isHovered ? "2.5rem" : "0rem" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
