/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        royal: "#1A33E8",
        "royal-dark": "#0F1F99",
        "royal-deep": "#0A1454",
        ink: "#0B1330",
        mist: "#F2F4FC",
        line: "#DDE2F7",
        bull: "#0E9F6E",
        bear: "#E11D48",
        gold: "#D69E00",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
