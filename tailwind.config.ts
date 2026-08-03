import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        telnet: {
          bg: "#EFF1F6",
          button: "#263EA8",
          buttonHover: "#1e3288",
          heading: "#121B3B",
          logo: "#50A5DB",
          navy: "#10245c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
