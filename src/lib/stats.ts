import { getPublishedBooks, sortByRecency, type BookEntry } from "./books";
import { daysBetween } from "./reading";
import { turkishSlugify } from "./slugify";

export interface TimeWindowStat {
  label: string;
  booksFinished: number;
  pagesRead: number;
}

export interface RankedList {
  items: BookEntry[];
  hasMore: boolean;
  totalCount: number;
}

export interface DurationHighlight {
  book: BookEntry;
  days: number;
}

export interface AuthorHighlight {
  name: string;
  slug: string;
  count: number;
}

export interface OkurkenStats {
  totalBooks: number;
  statusCounts: Record<BookEntry["data"]["status"], number>;
  totalPagesRead: number;
  averagePagesPerBook: number | null;
  averageDaysToFinish: number | null;
  totalQuotes: number;
  totalNotes: number;
  totalReviews: number;
  genreDistribution: { genre: string; count: number }[];
  ratingHistogram: { rating: number; count: number }[];
  booksPerMonth: { label: string; count: number }[];
  timeWindows: TimeWindowStat[];
  topRated: RankedList;
  mostQuoted: RankedList;
  mostNoted: RankedList;
  longestBook: BookEntry | null;
  shortestBook: BookEntry | null;
  fastestRead: DurationHighlight | null;
  slowestRead: DurationHighlight | null;
  mostReadAuthor: AuthorHighlight | null;
}

/** Puana/sayıya göre sırala; eşitlik durumunda en son bitirileni öne al, ve
 * sınırın hemen dışında kalan (eşit değerli) başka kayıt olup olmadığını bildir. */
function rankBooks(
  books: BookEntry[],
  metric: (book: BookEntry) => number,
  limit: number,
): RankedList {
  const withMetric = books
    .map((book) => ({ book, value: metric(book) }))
    .filter((entry) => entry.value > 0);

  const sorted = sortByRecency(withMetric.map((e) => e.book))
    .map((book) => ({ book, value: metric(book) }))
    .sort((a, b) => b.value - a.value);

  return {
    items: sorted.slice(0, limit).map((e) => e.book),
    hasMore: sorted.length > limit,
    totalCount: sorted.length,
  };
}

export async function computeStats(referenceYear = new Date().getFullYear()): Promise<OkurkenStats> {
  const books = await getPublishedBooks();
  const now = new Date();

  const statusCounts: Record<BookEntry["data"]["status"], number> = {
    reading: 0,
    completed: 0,
    "want-to-read": 0,
    dropped: 0,
  };
  books.forEach((b) => statusCounts[b.data.status]++);

  const completed = books.filter((b) => b.data.status === "completed");
  const pageCounts = completed
    .map((b) => b.data.pageCount)
    .filter((p): p is number => typeof p === "number");
  const totalPagesRead = pageCounts.reduce((sum, p) => sum + p, 0);
  const averagePagesPerBook = pageCounts.length
    ? Math.round(totalPagesRead / pageCounts.length)
    : null;

  const durations = completed
    .filter((b) => b.data.startDate && b.data.endDate)
    .map((b) => ({ book: b, days: daysBetween(b.data.startDate as Date, b.data.endDate as Date) }));
  const averageDaysToFinish = durations.length
    ? Math.round(durations.reduce((sum, d) => sum + d.days, 0) / durations.length)
    : null;

  const totalQuotes = books.reduce((sum, b) => sum + b.data.quotes.length, 0);
  const totalNotes = books.reduce((sum, b) => sum + b.data.notes.length, 0);
  const totalReviews = books.filter((b) => (b.body ?? "").trim().length > 0).length;

  const genreMap = new Map<string, number>();
  books.forEach((b) => b.data.genres.forEach((g) => genreMap.set(g, (genreMap.get(g) ?? 0) + 1)));
  const genreDistribution = [...genreMap.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  const ratingHistogram = Array.from({ length: 10 }, (_, i) => {
    const rating = i + 1;
    return {
      rating,
      count: books.filter((b) => Math.round(b.data.rating ?? -1) === rating).length,
    };
  });

  const monthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "short" });
  const booksPerMonth = Array.from({ length: 12 }, (_, month) => {
    const label = monthFormatter.format(new Date(referenceYear, month, 1));
    const count = completed.filter(
      (b) => b.data.endDate?.getFullYear() === referenceYear && b.data.endDate?.getMonth() === month,
    ).length;
    return { label, count };
  });

  // --- Zaman dilimlerine göre özet (son 7 gün / bu ay / bu yıl / tüm zamanlar) ---
  function windowStat(label: string, withinWindow: (d: Date) => boolean): TimeWindowStat {
    const finishedInWindow = completed.filter((b) => b.data.endDate && withinWindow(b.data.endDate));
    return {
      label,
      booksFinished: finishedInWindow.length,
      pagesRead: finishedInWindow.reduce((sum, b) => sum + (b.data.pageCount ?? 0), 0),
    };
  }
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const timeWindows: TimeWindowStat[] = [
    windowStat("Son 7 gün", (d) => d >= sevenDaysAgo && d <= now),
    windowStat("Bu ay", (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()),
    windowStat("Bu yıl", (d) => d.getFullYear() === now.getFullYear()),
    windowStat("Tüm zamanlar", () => true),
  ];

  const topRated = rankBooks(books, (b) => b.data.rating ?? 0, 5);
  const mostQuoted = rankBooks(books, (b) => b.data.quotes.length, 5);
  const mostNoted = rankBooks(books, (b) => b.data.notes.length, 5);

  // --- En uzun / en kısa kitap ---
  const withPages = completed.filter((b) => typeof b.data.pageCount === "number");
  const longestBook = withPages.length
    ? withPages.reduce((a, b) => ((b.data.pageCount ?? 0) > (a.data.pageCount ?? 0) ? b : a))
    : null;
  const shortestBook = withPages.length
    ? withPages.reduce((a, b) => ((b.data.pageCount ?? 0) < (a.data.pageCount ?? 0) ? b : a))
    : null;

  // --- En hızlı / en yavaş biten okuma ---
  const fastestRead = durations.length
    ? durations.reduce((a, b) => (b.days < a.days ? b : a))
    : null;
  const slowestRead = durations.length
    ? durations.reduce((a, b) => (b.days > a.days ? b : a))
    : null;

  // --- En çok okunan yazar ---
  const authorCounts = new Map<string, number>();
  books.forEach((b) => authorCounts.set(b.data.author, (authorCounts.get(b.data.author) ?? 0) + 1));
  let mostReadAuthor: AuthorHighlight | null = null;
  for (const [name, count] of authorCounts) {
    if (!mostReadAuthor || count > mostReadAuthor.count) {
      mostReadAuthor = { name, slug: turkishSlugify(name), count };
    }
  }
  // Herkes bire bir eşitse (ör. henüz tek kitap varsa) bu alanı anlamsız kılma
  if (mostReadAuthor && mostReadAuthor.count <= 1 && authorCounts.size > 1) {
    mostReadAuthor = null;
  }

  return {
    totalBooks: books.length,
    statusCounts,
    totalPagesRead,
    averagePagesPerBook,
    averageDaysToFinish,
    totalQuotes,
    totalNotes,
    totalReviews,
    genreDistribution,
    ratingHistogram,
    booksPerMonth,
    timeWindows,
    topRated,
    mostQuoted,
    mostNoted,
    longestBook,
    shortestBook,
    fastestRead,
    slowestRead,
    mostReadAuthor,
  };
}
