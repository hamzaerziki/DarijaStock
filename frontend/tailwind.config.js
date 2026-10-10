/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          900: "#0b1220",
        },
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
        border: "hsl(214 32% 91%)",
        input: "hsl(214 32% 91%)",
        ring: "#0f766e",
        background: "#f8fafc",
        foreground: "#0f172a",
        muted: "#64748b",
      },
      fontFamily: {
        sans: ["Tahoma", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
        arabic: ["Tahoma", "Segoe UI", "Arial", "sans-serif"],
      },
      borderRadius: { lg: "0.6rem", md: "0.5rem", sm: "0.35rem" },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in": { from: { transform: "translateY(6px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: { "fade-in": "fade-in 0.15s ease-out", "slide-in": "slide-in 0.2s ease-out" },
    },
  },
  plugins: [],
};
