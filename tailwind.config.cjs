/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#d4af37", // Dorado principal
          light: "#f4d03f", // Dorado claro (hover, highlights)
          dark: "#b8860b", // Dorado oscuro (botones activos)
          gold: {
            50: "#fef9e7",
            100: "#fef3c7",
            200: "#fde68a",
            300: "#fcd34d",
            400: "#f4d03f", // Dorado claro
            500: "#d4af37", // Dorado principal
            600: "#b8860b", // Dorado oscuro
            700: "#9a7209",
            800: "#7c5d07",
            900: "#5e4805",
          },
          black: {
            DEFAULT: "#0a0a0a", // Negro principal
            light: "#1a1a1a", // Negro secundario (fondos)
            lighter: "#2a2a2a", // Negro terciario (elementos)
            border: "#333333", // Bordes
            text: "#e5e5e5", // Texto claro
          },
          white: "#FFFFFF"
        }
      }
    },
  },
  plugins: []
};



