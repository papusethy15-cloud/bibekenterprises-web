"use client";

import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface Faq {
  q: string;
  a: string;
}

interface Props {
  brand: string;
  includes: string[];
  excludes: string[];
  faqs: Faq[];
}

/**
 * Below-the-fold parts of the service detail page — Includes, Excludes and
 * the FAQ accordion. Split out as a client component (the rest of the page
 * stays a server component for metadata/SEO) because true scroll-triggered
 * reveal needs an IntersectionObserver, and the FAQ accordion needs local
 * open/close state.
 */
export default function ServiceDetailContent({ brand, includes, excludes, faqs }: Props) {
  const includesReveal = useScrollReveal<HTMLDivElement>();
  const excludesReveal = useScrollReveal<HTMLDivElement>();
  const faqReveal = useScrollReveal<HTMLDivElement>();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      {includes.length > 0 && (
        <div ref={includesReveal.ref} className="mb-10">
          <h2 className="font-bold text-ink-900 mb-4 text-lg">What&apos;s Included</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {includes.map((item, i) => (
              <li
                key={item}
                className={`flex items-start gap-3 text-sm text-ink-700 bg-emerald-50/60 border border-emerald-100 rounded-xl px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200 ${
                  includesReveal.isVisible ? "animate-fade-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {excludes.length > 0 && (
        <div ref={excludesReveal.ref} className="mb-10">
          <h2 className="font-bold text-ink-900 mb-4 text-lg">Not Included</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {excludes.map((item, i) => (
              <li
                key={item}
                className={`flex items-start gap-3 text-sm text-ink-400 bg-ink-50 border border-ink-100 rounded-xl px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-ink-200 ${
                  excludesReveal.isVisible ? "animate-fade-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="w-5 h-5 rounded-full bg-ink-200 text-ink-500 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  ✕
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {faqs.length > 0 && (
        <div ref={faqReveal.ref}>
          <h2 className="font-bold text-ink-900 mb-4 text-lg">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={f.q}
                  className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                    faqReveal.isVisible ? "animate-fade-in-up" : "opacity-0"
                  }`}
                  style={{
                    animationDelay: `${i * 70}ms`,
                    borderColor: isOpen ? `${brand}40` : "#eeeef0",
                    boxShadow: isOpen ? `0 8px 24px -16px ${brand}40` : "none",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 font-semibold text-ink-800 hover:bg-ink-50/60 transition-colors"
                  >
                    {f.q}
                    <span
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-transform duration-300"
                      style={{
                        background: isOpen ? brand : "#f4f4f5",
                        color: isOpen ? "#fff" : "#7a7a85",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      ⌄
                    </span>
                  </button>
                  {/* grid-rows trick gives a smooth height transition without measuring */}
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm text-ink-500 leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
