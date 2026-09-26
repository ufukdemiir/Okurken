/**
 * "Okurken" kimliğinin PDF'e taşınan renk paleti. Bir kağıt/mürekkep/deri
 * ciltli kitap dokusundan ilham alan bu değerler, src/styles/global.css
 * içindeki `@theme` bloğunun **açık mod** (light) tonlarıyla birebir
 * eşleşir — PDF her zaman açık zeminde üretilir (yazdırılabilirlik için).
 *
 * Buradaki bir rengi değiştirirsen, görsel tutarlılık için
 * src/styles/global.css içindeki karşılığını da güncellemeyi unutma.
 */
export const COLORS = {
  paper: "#faf9f6",
  surface: "#ffffff",
  ink: "#201c16",
  inkSoft: "#55503f",
  rule: "#e4dfd1",
  leather: "#6e3b22",
  leatherSoft: "#9c5a34",
  teal: "#2f4f49",
  tealSoft: "#6fa89c",
  gold: "#b4841f",
  goldSoft: "#e0b14c",
} as const;

/** Durum rozetleri için renkler (bkz. src/lib/status.ts'teki CSS değişkeni eşlemesi). */
export const STATUS_COLORS: Record<string, string> = {
  reading: COLORS.teal,
  completed: COLORS.leather,
  "want-to-read": COLORS.gold,
  dropped: COLORS.inkSoft,
};
