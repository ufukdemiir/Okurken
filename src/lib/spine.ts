/**
 * Kapak görseli kullanmadığımız için (telif sorunlarından kaçınmak amacıyla),
 * her kitaba başlık + yazar ikilisinden türetilen sabit bir "cilt rengi"
 * atanır — klasik kitap cildi kumaşlarından ilham alan altı renkten biri.
 * Aynı kitap her zaman aynı rengi alır (derleme aralarında tutarlı kalır).
 */
export const SPINE_PALETTE = [
  { key: "forest", bg: "#2F4A3A", ink: "#F3EFE3" },
  { key: "oxblood", bg: "#6E2A2A", ink: "#F3EFE3" },
  { key: "navy", bg: "#223752", ink: "#F3EFE3" },
  { key: "mustard", bg: "#A67C1E", ink: "#201C16" },
  { key: "plum", bg: "#4B2E4E", ink: "#F3EFE3" },
  { key: "slate", bg: "#2B4C4C", ink: "#F3EFE3" },
] as const;

export type SpineColor = (typeof SPINE_PALETTE)[number];

function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getSpineColor(seed: string): SpineColor {
  const index = hashString(seed) % SPINE_PALETTE.length;
  return SPINE_PALETTE[index];
}
