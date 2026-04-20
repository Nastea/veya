import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: "#6366f1",
        surface: "#f8f8fa"
      },
      boxShadow: {
        soft: "0 12px 28px -18px rgba(20, 23, 41, 0.26)"
      }
    }
  },
  plugins: []
};

export default config;
