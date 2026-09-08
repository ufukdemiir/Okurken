/**
 * Tailwind CSS v4 kullanıyoruz; ana yapılandırma artık CSS-first'tir ve
 * asıl kaynak `src/styles/global.css` içindeki `@theme` bloğudur (renk
 * paleti, fontlar) ve `@custom-variant dark (...)` satırıdır (sınıf tabanlı
 * koyu mod).
 *
 * Bu dosya; (a) projeyi bir GitHub deposuna "hazır paket" olarak teslim
 * ederken klasik bir `tailwind.config.mjs` beklendiği, (b) bazı editör
 * eklentilerinin/araçlarının hâlâ bu dosyayı içerik yolları için okuduğu
 * için bulunur. Derleme sırasında Tailwind tarafından otomatik olarak
 * içeri aktarılmaz (bkz. astro.config.mjs → @tailwindcss/vite).
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
    "./public/admin/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#faf9f6",
        surface: "#ffffff",
        ink: { DEFAULT: "#201c16", soft: "#55503f" },
        rule: "#e4dfd1",
        leather: { DEFAULT: "#6e3b22", soft: "#9c5a34" },
        teal: { DEFAULT: "#2f4f49", soft: "#6fa89c" },
        gold: { DEFAULT: "#b4841f", soft: "#e0b14c" },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
