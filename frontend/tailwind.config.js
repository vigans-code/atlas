/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        atlas: {
          950: "#07110f",
          900: "#0a1714",
          850: "#0e1d19",
          800: "#12241f",
          700: "#1b332c",
          500: "#20c997",
          400: "#4ee1b2",
        },
      },
      boxShadow: {
        glow: "0 0 28px rgba(32, 201, 151, 0.10)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

