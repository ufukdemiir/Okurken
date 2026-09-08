/**
 * GitHub Pages çoğu zaman siteyi bir alt yolda yayınlar
 * (ör. https://kullanici.github.io/okurken/). Astro'nun `base` ayarı bunu
 * çözer, ancak bileşenler içindeki elle yazılmış `href`/`src` değerlerine
 * bu ön eki otomatik eklemez. İç bağlantılarda daima bu yardımcıyı kullanın.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}` || "/";
}
