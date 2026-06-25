"use client";

import { useEffect, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface Step {
  step: string;
  title: string;
  desc: string;
  icon: string;
}

const STEPS: Step[] = [
  { step: "1", title: "Book a Service",      desc: "Select your appliance and pick a convenient time slot online.", icon: "📅" },
  { step: "2", title: "Technician Assigned", desc: "Our nearest expert technician is automatically assigned to your booking.", icon: "🛠️" },
  { step: "3", title: "Doorstep Service",    desc: "Technician arrives, diagnoses, and fixes the issue at your home.", icon: "🏠" },
  { step: "4", title: "Pay & Rate",          desc: "Pay securely via UPI, card or cash and share your feedback.", icon: "⭐" },
];

interface Props {
  brand: string;
}

/**
 * "How It Works" — redesigned as an animated, scroll-revealed process rail.
 *
 * - Heading reveals on scroll (same useScrollReveal hook as ServicesSection /
 *   ServiceLocations, so the cadence feels consistent across the homepage).
 * - The connecting line between steps actually *draws in* left-to-right once
 *   the section is visible, rather than just sitting there statically.
 * - Each step card lifts + glows on hover, the number badge scales and the
 *   icon does a small bounce — desktop affordances that read as "interactive"
 *   without being gimmicky.
 * - Cards themselves stagger in on scroll (delay derived from index) so the
 *   eye is guided through the 4-step flow in order, left to right.
 */
export default function HowItWorks({ brand }: Props) {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: railRef, isVisible: railVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const [hovered, setHovered] = useState<string | null>(null);

  // Drive the connecting-line draw-in slightly after the rail becomes visible,
  // so cards are already animating in before the line finishes connecting them.
  const [lineDrawn, setLineDrawn] = useState(false);
  useEffect(() => {
    if (!railVisible) return;
    const t = setTimeout(() => setLineDrawn(true), 250);
    return () => clearTimeout(t);
  }, [railVisible]);

  return (
    <section id="how-it-works" className="relative py-24 bg-ink-50 overflow-hidden">
      {/* Decorative ambient blobs, consistent with ServicesSection's treatment */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-20 left-1/4 w-[22rem] h-[22rem] rounded-full opacity-[0.05] animate-blob"
          style={{ background: "#1A3FA4" }}
        />
        <div
          className="absolute -bottom-24 right-1/4 w-[20rem] h-[20rem] rounded-full opacity-[0.05] animate-blob"
          style={{ background: "#F26522", animationDelay: "5s" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`text-center mb-16 ${headerVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "#F26522" }}>
            Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-ink-900 mt-2 mb-4">
            How It Works
          </h2>
          <p className="text-ink-400 max-w-xl mx-auto">
            Get your appliance fixed in 4 simple steps.
          </p>
        </div>

        <div ref={railRef} className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
          {/* Connecting line — track (faint, always present) + animated fill that
              draws in left-to-right once the rail scrolls into view. Desktop only;
              the step order is unambiguous as a stack on mobile. */}
          <div
            aria-hidden
            className="hidden md:block absolute top-9 left-[12.5%] right-[12.5%] h-0.5 bg-brand-200/60 rounded-full"
          />
          <div
            aria-hidden
            className="hidden md:block absolute top-9 left-[12.5%] h-0.5 rounded-full transition-all ease-out"
            style={{
              background: "linear-gradient(90deg, #1A3FA4, rgba(26,63,164,0.55))",
              width: lineDrawn ? "75%" : "0%",
              transitionDuration: "1400ms",
            }}
          />

          {STEPS.map((item, i) => {
            const isHovered = hovered === item.step;
            return (
              <div
                key={item.step}
                onMouseEnter={() => setHovered(item.step)}
                onMouseLeave={() => setHovered(null)}
                className={`group relative text-center ${railVisible ? "animate-fade-in-up" : "opacity-0"}`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {/* Card surface — lifts and gains a brand-tinted shadow on hover */}
                <div
                  className="relative z-10 rounded-2xl px-5 py-8 bg-white border border-ink-100 transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:border-transparent"
                  style={{
                    boxShadow: isHovered ? "0 20px 40px -12px rgba(26,63,164,0.28)" : "0 1px 2px rgba(10,10,11,0.04)",
                  }}
                >
                  {/* Number badge — scales + glows on hover, icon does a tiny bounce */}
                  <div className="relative inline-flex items-center justify-center mb-5">
                    <div
                      className="absolute inset-0 rounded-full blur-md transition-opacity duration-300"
                      style={{
                        background: "#1A3FA4",
                        opacity: isHovered ? 0.4 : 0,
                      }}
                    />
                    <div
                      style={{ background: "#1A3FA4" }}
                      className="relative flex items-center justify-center w-16 h-16 rounded-full text-white text-xl font-bold transition-transform duration-300 ease-out group-hover:scale-110"
                    >
                      {item.step}
                    </div>
                    {/* Icon badge — small, offset, pops in on hover */}
                    <div
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-ink-100 flex items-center justify-center text-sm shadow-sm transition-transform duration-300 ease-out group-hover:scale-125 group-hover:-rotate-6"
                      aria-hidden
                    >
                      {item.icon}
                    </div>
                  </div>

                  <h3 className="font-bold text-ink-900 mb-2 transition-colors duration-300" style={{ color: isHovered ? "#1A3FA4" : undefined }}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-ink-400 leading-relaxed">{item.desc}</p>
                </div>

                {/* Mobile step connector — vertical, between stacked cards */}
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className="md:hidden mx-auto w-0.5 h-8 my-1"
                    style={{ background: "linear-gradient(180deg, rgba(26,63,164,0.5), rgba(26,63,164,0.1))" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
