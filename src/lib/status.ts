import type { BookEntry } from "./books";

/**
 * Her okuma durumu için semantik bir vurgu rengi (CSS değişkeni adı).
 * reading  → teal   (şu an içindesiniz)
 * completed→ leather (tamamlanmış, "raftaki" kitap)
 * want-to-read → gold (ileride okunacak, bir hedef)
 * dropped  → ink-soft (bir kenara bırakılmış, nötr)
 */
export function getStatusColorVar(status: BookEntry["data"]["status"]): string {
  switch (status) {
    case "reading":
      return "--color-teal";
    case "completed":
      return "--color-leather";
    case "want-to-read":
      return "--color-gold";
    case "dropped":
    default:
      return "--color-ink-soft";
  }
}
