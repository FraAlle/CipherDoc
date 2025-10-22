/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        dark: "#0f172a",
        light: "#f8fafc",
      },
    },
  },
  plugins: [],
};
