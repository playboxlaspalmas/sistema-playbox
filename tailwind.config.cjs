/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1877F2", // Facebook Blue principal
          light: "#42A5F5", // Azul claro (hover, highlights)
          dark: "#166FE5", // Azul oscuro (botones activos)
          blue: {
            50: "#E3F2FD",
            100: "#BBDEFB",
            200: "#90CAF9",
            300: "#64B5F6",
            400: "#42A5F5", // Azul claro
            500: "#1877F2", // Facebook Blue principal
            600: "#166FE5", // Azul oscuro
            700: "#1565C0",
            800: "#0D47A1",
            900: "#0A3D91",
          },
          // Paleta de grises para fondos (estilo Facebook)
          dark: {
            DEFAULT: "#F0F2F5", // Fondo principal (gris muy claro estilo Facebook)
            light: "#FFFFFF", // Fondos secundarios (blanco)
            lighter: "#FFFFFF", // Elementos elevados (blanco)
            lightest: "#FFFFFF", // Elementos más elevados (blanco)
            border: "#CCCCCC", // Bordes sutiles
            "border-light": "#E4E6EB", // Bordes más visibles (gris claro)
            "border-gold": "#1877F2", // Bordes azules
            text: "#050505", // Texto principal (casi negro)
            "text-light": "#65676B", // Texto destacado (gris)
            "text-muted": "#8A8D91", // Texto secundario (gris más claro)
          },
          white: "#FFFFFF"
        }
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'large': '0 8px 24px rgba(0, 0, 0, 0.5)',
        'gold': '0 4px 12px rgba(212, 175, 55, 0.2)',
        'gold-lg': '0 8px 24px rgba(212, 175, 55, 0.3)',
        'inner-soft': 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: []
};



