import { getPublishedBooks, sortByRecency, type BookEntry } from "./books";
import { daysBetween } from "./reading";
import { turkishSlugify } from "./slugify";

export interface TimeWindowStat {
  label: string;
  booksFinished: number;
  pagesRead: number;
  averagePagesPerDay: number | null;
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
  averageRating: number | null;
  distinctAuthorCount: number;
  totalQuotes: number;
  totalNotes: number;
  totalReviews: number;
  genreDistribution: { genre: string; count: number }[];
  ratingHistogram: { rating: number; count: number }[];
  booksPerMonth: { label: string; count: number }[];
  booksPerYear: { label: string; count: number }[];
  timeWindows: TimeWindowStat[];
  topRated: RankedList;
  mostQuoted: RankedList;
  mostNoted: RankedList;
  longestBook: BookEntry | null;
  shortestBook: BookEntry | null;
  fastestRead: DurationHighlight | null;
  slowestRead: DurationHighlight | null;
  mostReadAuthor: AuthorHighlight | null;
  firstCompletedBook: BookEntry | null;
  mostRecentCompletedBook: BookEntry | null;
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

/**
 * Bir kitaptan GERÇEKTEN okunmuş sayfa sayısı — "kaç sayfa okudum"
 * istatistiklerinin temelidir.
 *
 * - Tamamlanmış kitaplarda: `pagesRead` girilmişse o, girilmemişse kitabın
 *   tam sayfa sayısı (bitirmek zaten tamamını okumak demektir).
 * - Yarım bırakılmış kitaplarda: SADECE `pagesRead` alanı girilmişse o kadarı
 *   sayılır; girilmemişse 0 kabul edilir. Kitabın tam sayfa sayısı ASLA
 *   varsayılan olarak kullanılmaz — aksi hâlde bitirilmemiş bir kitabın
 *   tamamı okunmuş gibi görünüp istatistikleri yanlış şişirir.
 * - "Okunuyor" (henüz bitmemiş) ve "Okunacak" kitaplar bu hesaplara hiç
 *   dahil edilmez; zira ne zaman okunduğu belirsiz bir "bitiş tarihi" yoktur.
 */
function actualPagesRead(book: BookEntry): number {
  if (book.data.status === "completed") {
    return book.data.pagesRead ?? book.data.pageCount ?? 0;
  }
  if (book.data.status === "dropped") {
    return book.data.pagesRead ?? 0;
  }
  return 0;
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
  // "Okunan sayfa" — tamamlanan kitapların tamamı + yarım bırakılanlardan
  // gerçekten okunduğu belirtilen kısım (bkz. actualPagesRead).
  const totalPagesRead = books.reduce((sum, b) => sum + actualPagesRead(b), 0);
  const averagePagesPerBook = pageCounts.length
    ? Math.round(pageCounts.reduce((sum, p) => sum + p, 0) / pageCounts.length)
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

  const ratedBooks = books.map((b) => b.data.rating).filter((r): r is number => typeof r === "number");
  const averageRating = ratedBooks.length
    ? Math.round((ratedBooks.reduce((sum, r) => sum + r, 0) / ratedBooks.length) * 10) / 10
    : null;

  const distinctAuthorCount = new Set(books.map((b) => b.data.author)).size;

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

  // --- Yıllara göre bitirilen kitap sayısı (tüm zamanlar) ---
  const finishedYears = completed
    .map((b) => b.data.endDate?.getFullYear())
    .filter((y): y is number => typeof y === "number");
  const minYear = finishedYears.length ? Math.min(...finishedYears) : referenceYear;
  const maxYear = finishedYears.length ? Math.max(...finishedYears, referenceYear) : referenceYear;
  const booksPerYear = Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
    const year = minYear + i;
    const count = completed.filter((b) => b.data.endDate?.getFullYear() === year).length;
    return { label: String(year), count };
  });

  // --- Zaman dilimlerine göre özet (son 7 gün / bu ay / bu yıl / tüm zamanlar) ---
  //
  // Metodoloji (doğruluk önemli olduğu için ayrıntılı açıklanmıştır):
  // 1) Payda (bölünecek gün sayısı) üç değerin EN KÜÇÜĞÜdür:
  //    a) dönemin nominal uzunluğu (ör. "Bu ay" için o ayın toplam gün sayısı),
  //    b) dönemin bugüne kadar GERÇEKTEN geçen kısmı (ör. ayın 12'sindeyseniz 12),
  //    c) verilerin başladığı tarihten bugüne kadar geçen gün sayısı.
  //    (c) olmadan, platformu yeni kullanmaya başlayan biri için "Bu yıl"
  //    ortalaması, henüz hiç veri olmayan aylara bölünerek yapay şekilde
  //    düşük çıkardı.
  // 2) Pay (okunan sayfa) yalnızca TAMAMLANMIŞ veya YARIM BIRAKILMIŞ
  //    kitaplardan, bitiş tarihi o dönemin içine düşenlerden gelir (bkz.
  //    actualPagesRead). "Okunuyor" durumundaki kitaplar, henüz bir bitiş
  //    tarihi olmadığından hiçbir zaman dilimine dahil edilmez.
  const trackingDates = books
    .flatMap((b) => [b.data.startDate, b.data.endDate])
    .filter((d): d is Date => d instanceof Date);
  const trackingStart = trackingDates.length
    ? new Date(Math.min(...trackingDates.map((d) => d.getTime())))
    : now;

  function windowStat(label: string, periodStart: Date, periodEndNominal: Date): TimeWindowStat {
    const relevant = books.filter(
      (b) =>
        (b.data.status === "completed" || b.data.status === "dropped") &&
        b.data.endDate &&
        b.data.endDate >= periodStart &&
        b.data.endDate <= periodEndNominal,
    );
    const pagesReadInWindow = relevant.reduce((sum, b) => sum + actualPagesRead(b), 0);
    const booksFinished = relevant.filter((b) => b.data.status === "completed").length;

    const periodEndEffective = now < periodEndNominal ? now : periodEndNominal;
    const nominalDays = daysBetween(periodStart, periodEndNominal) + 1;
    const elapsedInPeriod = daysBetween(periodStart, periodEndEffective) + 1;
    const elapsedSinceTracking = daysBetween(trackingStart, now) + 1;
    const denominatorDays = Math.max(1, Math.min(nominalDays, elapsedInPeriod, elapsedSinceTracking));

    return {
      label,
      booksFinished,
      pagesRead: pagesReadInWindow,
      averagePagesPerDay: pagesReadInWindow > 0 ? Math.round((pagesReadInWindow / denominatorDays) * 10) / 10 : 0,
    };
  }

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6); // bugün dahil, geriye dönük 7 gün
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);

  const timeWindows: TimeWindowStat[] = [
    windowStat("Son 7 gün", sevenDaysAgo, now),
    windowStat("Bu ay", startOfMonth, endOfMonth),
    windowStat("Bu yıl", startOfYear, endOfYear),
    windowStat("Tüm zamanlar", trackingStart, now),
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

  // --- İlk ve en son bitirilen kitap (bitiş tarihi olan tamamlanmışlar arasında) ---
  const completedWithEndDate = completed.filter((b) => b.data.endDate);
  const firstCompletedBook = completedWithEndDate.length
    ? completedWithEndDate.reduce((a, b) => ((b.data.endDate as Date) < (a.data.endDate as Date) ? b : a))
    : null;
  const mostRecentCompletedBook = completedWithEndDate.length
    ? completedWithEndDate.reduce((a, b) => ((b.data.endDate as Date) > (a.data.endDate as Date) ? b : a))
    : null;

  return {
    totalBooks: books.length,
    statusCounts,
    totalPagesRead,
    averagePagesPerBook,
    averageDaysToFinish,
    averageRating,
    distinctAuthorCount,
    totalQuotes,
    totalNotes,
    totalReviews,
    genreDistribution,
    ratingHistogram,
    booksPerMonth,
    booksPerYear,
    timeWindows,
    topRated,
    mostQuoted,
    mostNoted,
    longestBook,
    shortestBook,
    fastestRead,
    slowestRead,
    mostReadAuthor,
    firstCompletedBook,
    mostRecentCompletedBook,
  };
}
