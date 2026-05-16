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
        }
      },
      boxShadow: {
        glow: "0 18px 50px rgba(10, 43, 33, 0.32)"
      }
    }
  },
  plugins: []
} satisfies Config;
