/**
 * Türkçe karakterleri (ç, ğ, ı, İ, ö, ş, ü) ASCII karşılıklarına çevirip
 * URL dostu bir "slug" üretir. Yazar sayfaları (/yazarlar/[yazar]) ve
 * arama/etiket bağlantıları için kullanılır.
 */
const TR_CHAR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

export function turkishSlugify(input: string): string {
  const transliterated = input
    .split("")
    .map((char) => TR_CHAR_MAP[char] ?? char)
    .join("");

  return transliterated
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diğer dillerden gelebilecek aksanları temizle
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Türkçe yerel ayarına duyarlı büyük/küçük harf karşılaştırması için basit yardımcı. */
export function turkishCompare(a: string, b: string): number {
  return a.localeCompare(b, "tr-TR", { sensitivity: "base" });
}
