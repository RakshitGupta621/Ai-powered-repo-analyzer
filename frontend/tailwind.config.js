/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'DM Sans'", "sans-serif"],
        display: ["'Syne'", "sans-serif"],
      },
      colors: {
        bg: {
          base:    "#0a0a0f",
          surface: "#111118",
          raised:  "#18181f",
          overlay: "#1f1f28",
        },
        border: {
          subtle: "#ffffff0d",
          base:   "#ffffff18",
          bright: "#ffffff30",
        },
        accent: {
          cyan:   "#00e5ff",
          violet: "#7c3aed",
          green:  "#00ffa3",
          amber:  "#ffb700",
        },
        text: {
          primary:   "#f0f0f8",
          secondary: "#a0a0b8",
          muted:     "#606078",
        },
      },
      animation: {
        "pulse-slow":  "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-up":     "fadeUp 0.4s ease forwards",
        "slide-in":    "slideIn 0.3s ease forwards",
        "shimmer":     "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
