import { getPublishedBooks, type BookEntry } from "./books";
import { estimateReadingMinutes, excerptFromMarkdown } from "./reading";

export type ArchiveKind = "book" | "review" | "quote" | "note";

export const ARCHIVE_KIND_LABELS: Record<ArchiveKind, string> = {
  book: "Kitap",
  review: "İnceleme",
  quote: "Alıntı",
  note: "Not",
};

export interface ArchiveItem {
  kind: ArchiveKind;
  date: Date;
  book: BookEntry;
  text?: string;
  page?: number;
  index?: number;
  excerpt?: string;
  minutes?: number;
}

/**
 * Kitaplar, incelemeler, alıntılar ve notların tamamını tarih sırasına göre
 * tek bir akışta birleştirir (/arsiv sayfası için). Alıntı ve notların kendi
 * tarihleri olmadığından, ait oldukları kitabın bitiş (yoksa başlangıç)
 * tarihi kullanılır.
 */
export async function getArchiveItems(): Promise<ArchiveItem[]> {
  const books = await getPublishedBooks();
  const items: ArchiveItem[] = [];

  for (const book of books) {
    if (book.data.startDate) {
      items.push({ kind: "book", date: book.data.startDate, book });
    }

    const referenceDate = book.data.endDate ?? book.data.startDate;
    if (!referenceDate) continue;

    const reviewBody = book.body ?? "";
    if (reviewBody.trim().length > 0 && book.data.status !== "want-to-read") {
      items.push({
        kind: "review",
        date: book.data.endDate ?? referenceDate,
        book,
        excerpt: excerptFromMarkdown(reviewBody),
        minutes: estimateReadingMinutes(reviewBody),
      });
    }

    book.data.quotes.forEach((quote, index) => {
      items.push({ kind: "quote", date: referenceDate, book, text: quote.text, page: quote.page, index });
    });

    book.data.notes.forEach((text, index) => {
      items.push({ kind: "note", date: referenceDate, book, text, index });
    });
  }

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}
