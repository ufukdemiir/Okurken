import type { APIRoute } from "astro";
import { getArchiveExportData } from "../../lib/archiveExport";

export const prerender = true;

/**
 * "Arşivi indir: JSON" — sitedeki TÜM içeriği (kitap kataloğu, incelemeler,
 * notlar, alıntılar, blog yazıları) tek, düzenli bir JSON dosyasında verir.
 * Derleme anında (build-time) üretilir; içerik güncellendiğinde site yeniden
 * derlendiğinde bu dosya da otomatik olarak güncel hâliyle yeniden üretilir.
 */
export const GET: APIRoute = async ({ site }) => {
  const data = await getArchiveExportData(site);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
