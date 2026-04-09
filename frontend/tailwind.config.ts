import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT:  "#023326",
          light:    "#034a38",
          muted:    "#0d5e46",
          accent:   "#0d8266",
          glow:     "#12a880",
        },
        surface: {
          DEFAULT: "#f4f4f0",
          card:    "#ffffff",
          dark:    "#0a1f17",
        },
        ink: {
          DEFAULT: "#111111",
          muted:   "#6b7280",
          faint:   "#9ca3af",
        },
        status: {
          up:   "#10b981",
          down: "#ef4444",
          warn: "#f59e0b",
        },
        marketing: {
          bg: "#000000",
          muted: "#d4d4d8",
          accent: "#8b5cf6",
          "accent-hover": "#a78bfa",
        },
        ns: {
          primary: "#00332C",
          soft: "#F9F9F9",
          "muted-blue": "#5B6B7A",
          "hero-badge": "#E8F5F0",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "card":  "0 2px 12px rgba(0,0,0,0.07)",
        "panel": "0 8px 32px rgba(0,0,0,0.12)",
        "glow":  "0 0 24px rgba(13,130,102,0.25)",
      },
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%":   { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "typing": {
          "0%, 80%, 100%": { transform: "scale(0.8)", opacity: "0.4" },
          "40%":           { transform: "scale(1)",   opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.35s ease-out both",
        "slide-in-left":  "slide-in-left 0.3s ease-out both",
        "typing":         "typing 1.2s infinite ease-in-out",
        "pulse-soft":     "pulse-soft 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
