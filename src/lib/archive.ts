import { getPublishedBooks, type BookEntry } from "./books";
import { getPublishedPosts, type BlogEntry } from "./blog";
import { estimateReadingMinutes, excerptFromMarkdown } from "./reading";

export type ArchiveKind = "book" | "review" | "quote" | "note" | "blog";

export const ARCHIVE_KIND_LABELS: Record<ArchiveKind, string> = {
  book: "Kitap",
  review: "İnceleme",
  quote: "Alıntı",
  note: "Not",
  blog: "Blog",
};

export interface ArchiveItem {
  kind: ArchiveKind;
  date: Date;
  book?: BookEntry;
  post?: BlogEntry;
  text?: string;
  page?: number;
  index?: number;
  excerpt?: string;
  minutes?: number;
}

/**
 * Kitaplar, incelemeler, alıntılar, notlar ve blog yazılarının tamamını
 * tarih sırasına göre tek bir akışta birleştirir (/arsiv sayfası için).
 * Alıntı ve notların kendi tarihleri olmadığından, ait oldukları kitabın
 * bitiş (yoksa başlangıç) tarihi kullanılır.
 */
export async function getArchiveItems(): Promise<ArchiveItem[]> {
  const [books, posts] = await Promise.all([getPublishedBooks(), getPublishedPosts()]);
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

  for (const post of posts) {
    items.push({
      kind: "blog",
      date: post.data.publishDate,
      post,
      excerpt: post.data.excerpt || excerptFromMarkdown(post.body ?? ""),
      minutes: estimateReadingMinutes(post.body ?? ""),
    });
  }

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}
