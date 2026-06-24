"use client";

import { useEffect, useRef, useState } from "react";

interface UseScrollRevealOptions {
  /** How much of the element must be visible before it reveals (0-1). */
  threshold?: number;
  /** Shrinks/grows the viewport box used for the intersection check. */
  rootMargin?: string;
  /** Reveal once and stop observing (true), or toggle every time it crosses (false). */
  once?: boolean;
}

/**
 * Tracks when an element scrolls into view and reveals it once - used to
 * trigger the existing `animate-fade-in-up` keyframe (tailwind.config.js)
 * on scroll instead of only on page load, e.g. for the Services grid.
 *
 * Kept deliberately framework-free (no animation library) to match the
 * rest of this codebase's hand-rolled hooks (see useTypewriter.ts).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px 0px -10% 0px", once = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect users who've asked for less motion - reveal immediately,
    // no scroll-triggered animation (globals.css also zeroes durations).
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setIsVisible(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      // Old browser fallback - just show the content.
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}
