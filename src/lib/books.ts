import { getCollection, type CollectionEntry } from "astro:content";
import { turkishSlugify, turkishCompare } from "./slugify";
import { roundTo } from "./reading";

export type BookEntry = CollectionEntry<"books">;

const STATUS_ORDER: Record<BookEntry["data"]["status"], number> = {
  reading: 0,
  completed: 1,
  "want-to-read": 2,
  dropped: 3,
};

export const STATUS_LABELS_TR: Record<BookEntry["data"]["status"], string> = {
  reading: "Okunuyor",
  completed: "Okundu",
  "want-to-read": "Okunacak",
  dropped: "Yarım Bırakıldı",
};

/** Yayınlanmış (taslak olmayan) tüm kitapları getirir. */
export async function getPublishedBooks(): Promise<BookEntry[]> {
  return getCollection("books", ({ data }) => !data.draft);
}

function timeOf(book: BookEntry): number {
  const date = book.data.endDate ?? book.data.startDate;
  return date ? date.getTime() : 0;
}

/** Kitapları bitiş (yoksa başlangıç) tarihine göre en yeniden en eskiye sıralar. */
export function sortByRecency(books: BookEntry[]): BookEntry[] {
  return [...books].sort((a, b) => timeOf(b) - timeOf(a));
}

export async function getCurrentlyReading(): Promise<BookEntry[]> {
  const books = await getPublishedBooks();
  return sortByRecency(books.filter((b) => b.data.status === "reading"));
}

export async function getRecentlyFinished(limit = 6): Promise<BookEntry[]> {
  const books = await getPublishedBooks();
  const finished = books.filter((b) => b.data.status === "completed" && b.data.endDate);
  return sortByRecency(finished).slice(0, limit);
}

export async function getThisMonthFinished(reference: Date = new Date()): Promise<BookEntry[]> {
  const books = await getPublishedBooks();
  return sortByRecency(
    books.filter((b) => {
      if (b.data.status !== "completed" || !b.data.endDate) return false;
      return (
        b.data.endDate.getFullYear() === reference.getFullYear() &&
        b.data.endDate.getMonth() === reference.getMonth()
      );
    }),
  );
}

export async function getFinishedCountForYear(year: number): Promise<number> {
  const books = await getPublishedBooks();
  return books.filter(
    (b) => b.data.status === "completed" && b.data.endDate && b.data.endDate.getFullYear() === year,
  ).length;
}

export async function getAllGenres(): Promise<string[]> {
  const books = await getPublishedBooks();
  const set = new Set<string>();
  books.forEach((b) => b.data.genres.forEach((g) => set.add(g)));
  return [...set].sort((a, b) => turkishCompare(a, b));
}

export interface AuthorSummary {
  name: string;
  slug: string;
  books: BookEntry[];
  averageRating: number | null;
  completedCount: number;
}

export async function getAllAuthors(): Promise<AuthorSummary[]> {
  const books = await getPublishedBooks();
  const map = new Map<string, BookEntry[]>();
  for (const book of books) {
    const slug = turkishSlugify(book.data.author);
    if (!map.has(slug)) map.set(slug, []);
    map.get(slug)!.push(book);
  }

  const authors: AuthorSummary[] = [];
  for (const [slug, authorBooks] of map) {
    const ratings = authorBooks
      .map((b) => b.data.rating)
      .filter((r): r is number => typeof r === "number");
    authors.push({
      name: authorBooks[0].data.author,
      slug,
      books: sortByRecency(authorBooks),
      averageRating: ratings.length
        ? roundTo(ratings.reduce((sum, r) => sum + r, 0) / ratings.length)
        : null,
      completedCount: authorBooks.filter((b) => b.data.status === "completed").length,
    });
  }
  return authors.sort((a, b) => turkishCompare(a.name, b.name));
}

export async function getAuthorBySlug(slug: string): Promise<AuthorSummary | undefined> {
  const authors = await getAllAuthors();
  return authors.find((a) => a.slug === slug);
}

export interface QuoteItem {
  book: BookEntry;
  text: string;
  page?: number;
  index: number;
}

export async function getAllQuotes(): Promise<QuoteItem[]> {
  const books = await getPublishedBooks();
  const quotes: QuoteItem[] = [];
  for (const book of books) {
    book.data.quotes.forEach((q, index) => {
      quotes.push({ book, text: q.text, page: q.page, index });
    });
  }
  return quotes.sort((a, b) => timeOf(b.book) - timeOf(a.book));
}

export interface NoteItem {
  book: BookEntry;
  text: string;
  index: number;
}

export async function getAllNotes(): Promise<NoteItem[]> {
  const books = await getPublishedBooks();
  const notes: NoteItem[] = [];
  for (const book of books) {
    book.data.notes.forEach((text, index) => notes.push({ book, text, index }));
  }
  return notes.sort((a, b) => timeOf(b.book) - timeOf(a.book));
}

/** İncelemesi (Markdown gövdesi) bulunan tüm kitaplar — /incelemeler akışı için. */
export async function getBooksWithReviews(): Promise<BookEntry[]> {
  const books = await getPublishedBooks();
  return sortByRecency(books.filter((b) => (b.body ?? "").trim().length > 0));
}

export function compareByStatusThenRecency(a: BookEntry, b: BookEntry): number {
  const statusDiff = STATUS_ORDER[a.data.status] - STATUS_ORDER[b.data.status];
  if (statusDiff !== 0) return statusDiff;
  return timeOf(b) - timeOf(a);
}

/** Aynı `seriesTitle` değerine sahip diğer ciltleri, cilt numarasına göre sıralı döndürür. */
export async function getSeriesVolumes(book: BookEntry): Promise<BookEntry[]> {
  if (!book.data.seriesTitle) return [];
  const books = await getPublishedBooks();
  return books
    .filter((b) => b.data.seriesTitle === book.data.seriesTitle)
    .sort((a, b) => (a.data.volumeNumber ?? 0) - (b.data.volumeNumber ?? 0));
}

/** Çok ciltli eserlerde "Cilt N" ekiyle birlikte görüntüleme başlığı üretir. */
export function getDisplayTitle(book: BookEntry): string {
  return book.data.volumeNumber ? `${book.data.title} — Cilt ${book.data.volumeNumber}` : book.data.title;
}
