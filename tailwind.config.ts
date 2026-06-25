import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Poppins", "ui-sans-serif", "system-ui"],
      },
      colors: {
        // ── Bibek Enterprises Brand Palette ──
        // Primary: Royal Blue (BIBEK wordmark)
        brand: {
          50: "#e8edf9",
          100: "#c5d0ef",
          200: "#9fb0e3",
          300: "#7890d7",
          400: "#5b77ce",
          500: "#3d5fc4",
          600: "#1A3FA4", // PRIMARY BRAND BLUE — matches logo
          700: "#142d7a",
          800: "#0e1e52",
          900: "#080f2b",
        },
        // Accent: Vibrant Orange (wrench/tool icon + tagline)
        accent: {
          50: "#fff0e8",
          100: "#ffd8c2",
          200: "#ffbd99",
          300: "#ffa170",
          400: "#ff8a50",
          500: "#F26522", // ACCENT ORANGE — matches logo
          600: "#d4531a",
          700: "#b04015",
          800: "#8a300f",
          900: "#62200a",
        },
        ink: {
          50: "#f5f5f7",
          100: "#e8e8ed",
          200: "#d1d1db",
          300: "#a8a8bb",
          400: "#72728a",
          500: "#4a4a62",
          600: "#2e2e42",
          700: "#1c1c2e",
          800: "#12121e",
          900: "#0D0D0D", // near-black — "ENTERPRISES" wordmark
        },
      },
      transitionDuration: {
        "600": "600ms",
      },
      boxShadow: {
        brand: "0 8px 24px -8px rgba(26,63,164,0.35)",
        "brand-orange": "0 8px 24px -8px rgba(242,101,34,0.35)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-right": {
          "0%": { opacity: "0", transform: "translateX(28px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(20px,-18px) scale(1.08)" },
          "66%": { transform: "translate(-18px,16px) scale(0.94)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.92)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "slide-down": {
          "0%":   { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.7s ease-out both",
        "fade-in-right": "fade-in-right 0.8s ease-out both",
        float: "float 6s ease-in-out infinite",
        blob: "blob 14s ease-in-out infinite",
        "slide-up": "slide-up 0.35s cubic-bezier(0.32,0.72,0,1) both",
        "count-up": "count-up 0.6s ease-out both",
        "shimmer": "shimmer 2.5s linear infinite",
        "slide-down": "slide-down 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
