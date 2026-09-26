import type { APIRoute } from "astro";
import { getArchiveExportData } from "../../lib/archiveExport";
import { buildArchivePdfBuffer } from "../../lib/pdf/pdfArchive";

export const prerender = true;

/**
 * "Arşivi indir: PDF" — sitedeki tüm içeriği (kitaplar, incelemeler,
 * notlar, alıntılar, blog yazıları), Okurken'in görsel kimliğine uygun
 * biçimde tek, düzenli ve dizinli (içindekiler + PDF yer imleri) bir
 * belgede verir. Gömülü fontlar Türkçe karakterleri tam destekler
 * (bkz. src/lib/pdf/fonts/README.md).
 */
export const GET: APIRoute = async ({ site }) => {
  const data = await getArchiveExportData(site);
  const buffer = await buildArchivePdfBuffer(data);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
    },
  });
};
