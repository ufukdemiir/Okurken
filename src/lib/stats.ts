import { getPublishedBooks, sortByRecency, type BookEntry } from "./books";
import { daysBetween } from "./reading";

export interface OkurkenStats {
  totalBooks: number;
  statusCounts: Record<BookEntry["data"]["status"], number>;
  totalPagesRead: number;
  averagePagesPerBook: number | null;
  averageDaysToFinish: number | null;
  genreDistribution: { genre: string; count: number }[];
  ratingHistogram: { rating: number; count: number }[];
  topRated: BookEntry[];
  mostQuoted: BookEntry[];
  mostNoted: BookEntry[];
  booksPerMonth: { label: string; count: number }[];
}

export async function computeStats(referenceYear = new Date().getFullYear()): Promise<OkurkenStats> {
  const books = await getPublishedBooks();

  const statusCounts: Record<BookEntry["data"]["status"], number> = {
    reading: 0,
    completed: 0,
    "want-to-read": 0,
    dropped: 0,
  };
  books.forEach((b) => statusCounts[b.data.status]++);

  const completed = books.filter((b) => b.data.status === "completed");
  const pageCounts = completed.map((b) => b.data.pageCount).filter((p): p is number => typeof p === "number");
  const totalPagesRead = pageCounts.reduce((sum, p) => sum + p, 0);
  const averagePagesPerBook = pageCounts.length
    ? Math.round(totalPagesRead / pageCounts.length)
    : null;

  const durations = completed
    .filter((b) => b.data.startDate && b.data.endDate)
    .map((b) => daysBetween(b.data.startDate as Date, b.data.endDate as Date));
  const averageDaysToFinish = durations.length
    ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    : null;

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

  const topRated = sortByRecency(books)
    .filter((b) => typeof b.data.rating === "number")
    .sort((a, b) => (b.data.rating ?? 0) - (a.data.rating ?? 0))
    .slice(0, 5);

  const mostQuoted = [...books]
    .filter((b) => b.data.quotes.length > 0)
    .sort((a, b) => b.data.quotes.length - a.data.quotes.length)
    .slice(0, 5);

  const mostNoted = [...books]
    .filter((b) => b.data.notes.length > 0)
    .sort((a, b) => b.data.notes.length - a.data.notes.length)
    .slice(0, 5);

  const monthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "short" });
  const booksPerMonth = Array.from({ length: 12 }, (_, month) => {
    const label = monthFormatter.format(new Date(referenceYear, month, 1));
    const count = completed.filter(
      (b) => b.data.endDate?.getFullYear() === referenceYear && b.data.endDate?.getMonth() === month,
    ).length;
    return { label, count };
  });

  return {
    totalBooks: books.length,
    statusCounts,
    totalPagesRead,
    averagePagesPerBook,
    averageDaysToFinish,
    genreDistribution,
    ratingHistogram,
    topRated,
    mostQuoted,
    mostNoted,
    booksPerMonth,
  };
}
