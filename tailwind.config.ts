import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        moss: {
          50: "#f1f7f3",
          100: "#dcece2",
          400: "#56886e",
          600: "#285842",
          800: "#16382c",
          950: "#071812"
        },
        surface: {
          50:  "#f0f0ff",
          100: "#e2e2ff",
          700: "#1c1c30",
          800: "#141420",
          900: "#0e0e1a",
          950: "#07070f"
        },
        accent: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1"
        }
      },
      boxShadow: {
        glow: "0 18px 50px rgba(7, 7, 15, 0.5)",
        "glow-accent": "0 12px 40px -12px rgba(56, 189, 248, 0.45)",
        "glow-accent-strong":
          "0 0 0 1px rgba(56, 189, 248, 0.9), 0 14px 50px -6px rgba(56, 189, 248, 0.55)",
        "glow-accent-xl": "0 0 40px rgba(56, 189, 248, 0.35)",
        "glow-card": "0 4px 24px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04)"
      },
      backgroundImage: {
        "accent-radial":
          "radial-gradient(circle at 30% 20%, rgba(56, 189, 248, 0.18), transparent 60%)"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(56, 189, 248, 0.45)" },
          "50%": { boxShadow: "0 0 0 10px rgba(56, 189, 248, 0)" }
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "heart-pop": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "30%": { transform: "scale(1.15)", opacity: "1" },
          "60%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.4)", opacity: "0" }
        },
        "scale-in": {
          "0%":   { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)",    opacity: "1" }
        },
        "slide-down": {
          "0%":   { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" }
        }
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-glow": "pulse-glow 1.8s ease-out infinite",
        "slide-up": "slide-up 220ms ease-out",
        "fade-in": "fade-in 180ms ease-out",
        "heart-pop": "heart-pop 700ms ease-out forwards",
        "scale-in": "scale-in 200ms ease-out",
        "slide-down": "slide-down 180ms ease-out"
      }
    }
  },
  plugins: []
} satisfies Config;
