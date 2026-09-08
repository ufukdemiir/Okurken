/** Verilen metnin kelime sayısına göre tahmini okuma süresini (dakika) döndürür. */
export function estimateReadingMinutes(text: string, wordsPerMinute = 200): number {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ")
    .trim();
  const wordCount = cleaned.length ? cleaned.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.round(wordCount / wordsPerMinute));
}

/** "12 Eylül 2026" biçiminde Türkçe tarih. */
export function formatDateTR(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "Eylül 2026" biçiminde Türkçe ay/yıl. */
export function formatMonthYearTR(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** İki tarih arasındaki tam gün sayısı (okuma süresi hesapları için). */
export function daysBetween(start: Date, end: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diff = Math.round(
    (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      MS_PER_DAY,
  );
  return Math.max(0, diff);
}

/** Markdown biçimlendirmesini kabaca temizleyip düz metinden kısa bir özet üretir. */
export function excerptFromMarkdown(markdown: string, maxChars = 260): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxChars) return plain;
  const truncated = plain.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxChars)}…`;
}

/** 1..10 arası puanı, belirtilen basamak sayısına yuvarlar (ör. yazar ortalaması). */
export function roundTo(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
