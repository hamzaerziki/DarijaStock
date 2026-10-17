/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0D8177",
          hover: "#096B63",
          active: "#07574F",
          soft: "#DDF5F0",
          tint: "#EFFAF7",
        },
        sidebar: {
          DEFAULT: "#102B46",
          dark: "#0B1B2D",
          text: "#DCE8F4",
          muted: "#A8BDD1",
        },
        // Navy scale (sidebar + headings). DEFAULT = sidebar background.
        navy: {
          50: "#EFF4F9",
          700: "#1B3A5C",
          800: "#15304E",
          900: "#0B1B2D",
          DEFAULT: "#102B46",
        },
        // Slate remapped to the DarijaStock token grays (navy-tinted).
        slate: {
          50: "#F7FAFC",
          100: "#F1F5F9",
          200: "#DFE7EF",
          300: "#CBD8E5",
          400: "#8BA0B8",
          500: "#647B94",
          600: "#526A82",
          700: "#344B63",
          800: "#1E3A56",
          900: "#142A43",
          950: "#0B1B2D",
        },
        // Teal remapped to the primary family so existing utilities inherit the brand.
        teal: {
          50: "#EFFAF7",
          100: "#DDF5F0",
          200: "#BFE9E1",
          300: "#8FD6C9",
          400: "#3FB6A6",
          500: "#129C8F",
          600: "#0D8177",
          700: "#096B63",
          800: "#07574F",
          900: "#05443E",
        },
        // Semantic status colors.
        success: { DEFAULT: "#15936F", soft: "#E8F8F0", text: "#15856D" },
        warning: { DEFAULT: "#D97706", soft: "#FFF5DF", text: "#B96A09" },
        danger: { DEFAULT: "#DC4545", soft: "#FFF0F0", text: "#C83737" },
        info: { DEFAULT: "#2563EB", soft: "#EBF3FF", text: "#2563EB" },
        border: "#DFE7EF",
        input: "#D7E2ED",
        ring: "#0D8177",
        background: "#F1F5F9",
        foreground: "#142A43",
        muted: "#647B94",
      },
      fontFamily: {
        sans: ["Cairo", "Tajawal", "Noto Sans Arabic", "Inter", "Tahoma", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
        arabic: ["Cairo", "Tajawal", "Noto Sans Arabic", "Inter", "Tahoma", "Segoe UI", "Arial", "sans-serif"],
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5625rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 2px 8px rgba(20, 42, 67, 0.045)",
        "card-hover": "0 5px 16px rgba(20, 42, 67, 0.08)",
        dropdown: "0 8px 28px rgba(20, 42, 67, 0.12)",
        modal: "0 18px 60px rgba(11, 27, 45, 0.20)",
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
