import type { APIRoute } from "astro";
import { getArchiveExportData } from "../../lib/archiveExport";
import { buildArchiveCsv } from "../../lib/archiveCsv";

export const prerender = true;

/**
 * "Arşivi indir: CSV" — sitedeki tüm içeriği (kitaplar, incelemeler,
 * notlar, alıntılar, blog yazıları), elektronik tabloda filtrelenip
 * sıralanabilecek tek, düz bir CSV dosyası olarak verir. UTF-8 BOM ile
 * başlar, böylece Excel dahil hiçbir programda Türkçe karakterler
 * (ğ, ş, ı, İ, ç, ö, ü) bozulmaz.
 */
export const GET: APIRoute = async ({ site }) => {
  const data = await getArchiveExportData(site);
  const csv = buildArchiveCsv(data);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
};
