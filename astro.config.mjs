// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Okurken — GitHub Pages üzerinde tamamen statik olarak yayınlanır.
//
// ÖNEMLİ: Aşağıdaki `site` ve `base` değerlerini kendi GitHub kullanıcı
// adınıza ve depo adınıza göre güncelleyin.
//   - Depo adı "kullaniciadi.github.io" ise: site: "https://kullaniciadi.github.io", base: "/"
//   - Depo adı farklıysa (ör. "okurken"): site: "https://kullaniciadi.github.io", base: "/okurken"
const SITE_URL = "https://ufukdemiir.github.io";
const BASE_PATH = "/Okurken";

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: "static",
  trailingSlash: "ignore",
  integrations: [
    sitemap({
      changefreq: "weekly",
      priority: 0.7,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
