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
        // Bibek Enterprises brand palette — orange / white / black
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#D97706", // matches Admin Dashboard → Domains → primary_color
          700: "#c2580a",
          800: "#9a3412",
          900: "#7c2d12",
        },
        ink: {
          50: "#f7f7f8",
          100: "#eeeef0",
          200: "#d9d9dd",
          300: "#b3b3ba",
          400: "#7a7a85",
          500: "#4a4a54",
          600: "#2e2e35",
          700: "#1c1c21",
          800: "#121215",
          900: "#0a0a0b", // near-black
        },
      },
      transitionDuration: {
        "600": "600ms",
      },
      boxShadow: {
        brand: "0 8px 24px -8px rgba(217,119,6,0.35)",
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
