import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        // Storm-inspired palette - electric, urgent, powerful
        storm: {
          50: "#f0fdf9",
          100: "#ccfbef",
          200: "#6ee7c2",
          300: "#2dd4aa",
          400: "#14b890",
          500: "#0d9373",
          600: "#0a7460",
          700: "#0d5c4d",
          800: "#0f4a40",
          900: "#0c3d35",
          950: "#042220",
        },
        // Damage/Alert orange - like storm warning
        damage: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        // Electric cyan for data/intel
        intel: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
        // Deep void backgrounds
        void: {
          50: "#f4f4f5",
          100: "#e4e4e7",
          200: "#d4d4d8",
          300: "#a1a1aa",
          400: "#71717a",
          500: "#52525b",
          600: "#3f3f46",
          700: "#27272a",
          800: "#18181b",
          900: "#0f0f11",
          950: "#09090b",
        },
      },
      boxShadow: {
        "glow-storm": "0 0 12px rgba(45, 212, 170, 0.15)",
        "glow-damage": "0 0 12px rgba(249, 115, 22, 0.15)",
        "glow-intel": "0 0 12px rgba(34, 211, 238, 0.15)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
