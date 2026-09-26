import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/stories/**/*.{ts,tsx,json}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "oklch(var(--void) / <alpha-value>)",
          800: "oklch(var(--void-800) / <alpha-value>)",
          700: "#0c0f24",
        },
        neon: {
          cyan: "oklch(var(--accent-cyan) / <alpha-value>)",
          violet: "oklch(var(--accent-violet) / <alpha-value>)",
          blue: "oklch(var(--accent-blue) / <alpha-value>)",
        },
        glass: "rgba(255,255,255,0.04)",
        /**
         * Exhibit-deck palette, taken off the published field cards: paper, ink,
         * hairline rules, one steel blue, one teal signal, one warning rust.
         * Used by the lecture register, where a light slide is the whole point.
         */
        paper: {
          DEFAULT: "#eef1f5",
          card: "#ffffff",
        },
        ink: {
          DEFAULT: "#18212b",
          soft: "#3a4654",
          muted: "#6b7785",
        },
        rule: {
          DEFAULT: "#dde3ea",
          strong: "#b9c5d1",
        },
        steel: {
          DEFAULT: "#245a7a",
          deep: "#12354a",
          wash: "#e8eef4",
        },
        signal: "#0f766e",
        warn: {
          DEFAULT: "#9a3412",
          wash: "#f6e7de",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      boxShadow: {
        glow: "0 0 24px -4px oklch(var(--accent-cyan) / 0.45)",
        "glow-violet": "0 0 28px -6px oklch(var(--accent-violet) / 0.5)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(60% 60% at 50% 0%, oklch(var(--accent-cyan) / 0.1) 0%, oklch(var(--void) / 0) 70%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
