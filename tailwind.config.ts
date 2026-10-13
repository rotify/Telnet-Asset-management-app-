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
      fontFamily: {
        sans: ["var(--font-poppins, ui-sans-serif)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        telnet: {
          bg: "#EFF1F6",
          button: "#263EA8",
          buttonHover: "#1e3288",
          heading: "#121B3B",
          logo: "#50A5DB",
          navy: "#10245c",
          // Figma-matched tokens
          primary: "#008EE7",
          primaryHover: "#0077C2",
          activeBg: "#F0FAFF",
          danger: "#FD7072",
          warning: "#F6AD3F",
          muted: "#576A77",
          pageBg: "#F9FAFB",
          secondaryText: "#222222",
        },
      },
    },
  },
  plugins: [],
};

export default config;
