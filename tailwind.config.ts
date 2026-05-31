import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1a56db",
          dark: "#1542a8",
          light: "#e8f0fe",
        },
      },
    },
  },
  plugins: [],
};

export default config;
