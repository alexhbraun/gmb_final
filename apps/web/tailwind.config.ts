import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1a73e8", // Google Blue-ish
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
