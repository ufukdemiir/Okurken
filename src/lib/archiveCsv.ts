import type { ArchiveExportData } from "./archiveExport";

/**
 * RFC 4180'e uygun tek bir CSV hücresi kaçışlaması: alan içinde virgül,
 * tırnak işareti veya satır sonu varsa çift tırnak içine alınır ve
 * içindeki tırnaklar ikizlenir. `\r\n` satır sonları Excel/Sheets ile en
 * sorunsuz uyumu sağlar.
 */
function escapeCsvField(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function row(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(",") + "\r\n";
}

function absoluteUrl(data: ArchiveExportData, path: string): string {
  return data.site.url ? `${data.site.url}${path}` : path;
}

const HEADER = [
  "Tür",
  "Tarih",
  "Başlık",
  "Yazar",
  "Durum",
  "Puan",
  "Sayfa Sayısı",
  "Türler / Etiketler",
  "Sayfa No",
  "İçerik",
  "Bağlantı",
];

/**
 * Sitedeki tüm içeriği (kitap kataloğu, incelemeler, notlar, alıntılar ve
 * blog yazıları) tek, düz bir CSV'ye dönüştürür. Satırlar kitaba göre
 * gruplanır (her kitap için önce katalog satırı, ardından varsa incelemesi,
 * notları ve alıntıları), en sonda da blog yazıları yer alır — böylece
 * elektronik tabloda filtrelemek/sıralamak kolay olur, hiçbir Türkçe
 * karakter kaybı yaşanmaz (dosya UTF-8 BOM ile başlar).
 */
export function buildArchiveCsv(data: ArchiveExportData): string {
  const BOM = "\uFEFF";
  let out = BOM + row(HEADER);

  for (const book of data.books) {
    out += row([
      "Kitap",
      book.endDate ?? book.startDate ?? "",
      book.displayTitle,
      book.author,
      book.statusLabel,
      book.rating ?? "",
      book.pageCount ?? "",
      book.genres.join("; "),
      "",
      book.seriesTitle ? `Seri: ${book.seriesTitle}` : "",
      absoluteUrl(data, book.path),
    ]);

    if (book.review) {
      out += row([
        "İnceleme",
        book.endDate ?? book.startDate ?? "",
        book.displayTitle,
        book.author,
        "",
        "",
        "",
        "",
        "",
        book.review,
        absoluteUrl(data, `${book.path}#inceleme`),
      ]);
    }

    book.notes.forEach((note, index) => {
      out += row([
        "Not",
        book.endDate ?? book.startDate ?? "",
        book.displayTitle,
        book.author,
        "",
        "",
        "",
        "",
        "",
        note,
        absoluteUrl(data, `${book.path}#not-${index}`),
      ]);
    });

    book.quotes.forEach((quote, index) => {
      out += row([
        "Alıntı",
        book.endDate ?? book.startDate ?? "",
        book.displayTitle,
        book.author,
        "",
        "",
        "",
        "",
        quote.page ?? "",
        quote.text,
        absoluteUrl(data, `${book.path}#alinti-${index}`),
      ]);
    });
  }

  for (const post of data.blogPosts) {
    out += row([
      "Blog",
      post.publishDate,
      post.title,
      "",
      "",
      "",
      "",
      post.tags.join("; "),
      "",
      post.content,
      absoluteUrl(data, post.path),
    ]);
  }

  return out;
}
