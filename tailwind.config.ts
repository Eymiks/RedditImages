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
        accent: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490"
        }
      },
      boxShadow: {
        glow: "0 18px 50px rgba(10, 43, 33, 0.32)",
        "glow-accent": "0 12px 40px -12px rgba(34, 211, 238, 0.45)",
        "glow-accent-strong":
          "0 0 0 1px rgba(34, 211, 238, 0.9), 0 14px 50px -6px rgba(34, 211, 238, 0.55)"
      },
      backgroundImage: {
        "accent-radial":
          "radial-gradient(circle at 30% 20%, rgba(34, 211, 238, 0.18), transparent 60%)"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(34, 211, 238, 0.45)" },
          "50%": { boxShadow: "0 0 0 10px rgba(34, 211, 238, 0)" }
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
        }
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-glow": "pulse-glow 1.8s ease-out infinite",
        "slide-up": "slide-up 220ms ease-out",
        "fade-in": "fade-in 180ms ease-out",
        "heart-pop": "heart-pop 700ms ease-out forwards"
      }
    }
  },
  plugins: []
} satisfies Config;
