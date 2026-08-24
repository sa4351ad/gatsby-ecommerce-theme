import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-cairo)", "Tahoma", "Arial", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7fe",
          200: "#bcd3fd",
          300: "#8db6fb",
          400: "#5890f7",
          500: "#346bf1",
          600: "#224de6",
          700: "#1c3cd3",
          800: "#1d33ab",
          900: "#1c2f87",
        },
      },
    },
  },
  plugins: [],
};

export default config;
