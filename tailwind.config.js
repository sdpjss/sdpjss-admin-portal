/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#880808",
        secondary: "#CC5500",
      },
    },
  },
  plugins: [],
};
