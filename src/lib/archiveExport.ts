import { getEntry } from "astro:content";
import { getPublishedBooks, getDisplayTitle, STATUS_LABELS_TR, type BookEntry } from "./books";
import { getPublishedPosts, type BlogEntry } from "./blog";
import { withBase } from "./url";

/**
 * "Arşivi indir" özelliğinin tek ortak veri kaynağı. JSON, CSV ve PDF
 * uçlarının üçü de aynı fonksiyonu çağırır — böylece hangi formatta
 * indirilirse indirilsin, sitedeki TÜM içerik (kitap bilgileri, incelemeler,
 * notlar, alıntılar ve blog yazıları) birebir aynı kapsamla yer alır.
 *
 * Not: Bu modül yalnızca derleme anında (build-time), statik dosya
 * üretimi için çalışan uç noktalarda (src/pages/arsiv/*.ts) kullanılır.
 */

export interface ArchiveExportQuote {
  text: string;
  page: number | null;
}

export interface ArchiveExportBook {
  title: string;
  /** Çok ciltli eserlerde "Cilt N" ekini de içeren görüntüleme başlığı. */
  displayTitle: string;
  author: string;
  publisher: string | null;
  pageCount: number | null;
  pagesRead: number | null;
  startDate: string | null;
  endDate: string | null;
  status: BookEntry["data"]["status"];
  statusLabel: string;
  rating: number | null;
  genres: string[];
  seriesTitle: string | null;
  volumeNumber: number | null;
  notes: string[];
  quotes: ArchiveExportQuote[];
  /** İncelemenin ham Markdown metni; inceleme yoksa null. */
  review: string | null;
  /** Sitedeki kitap sayfasına giden, siteden bağımsız (mutlak olmayan) yol. */
  path: string;
}

export interface ArchiveExportBlogPost {
  title: string;
  publishDate: string;
  tags: string[];
  excerpt: string;
  /** Yazının ham Markdown içeriği. */
  content: string;
  path: string;
}

export interface ArchiveExportData {
  generatedAt: string;
  site: {
    name: string;
    readerName: string;
    tagline: string;
    url: string;
  };
  counts: {
    books: number;
    completedBooks: number;
    reviews: number;
    notes: number;
    quotes: number;
    blogPosts: number;
  };
  books: ArchiveExportBook[];
  blogPosts: ArchiveExportBlogPost[];
}

function toISODate(date: Date | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function bookToExport(book: BookEntry): ArchiveExportBook {
  const d = book.data;
  const reviewBody = (book.body ?? "").trim();
  return {
    title: d.title,
    displayTitle: getDisplayTitle(book),
    author: d.author,
    publisher: d.publisher || null,
    pageCount: d.pageCount ?? null,
    pagesRead: d.pagesRead ?? null,
    startDate: toISODate(d.startDate),
    endDate: toISODate(d.endDate),
    status: d.status,
    statusLabel: STATUS_LABELS_TR[d.status],
    rating: d.rating ?? null,
    genres: d.genres,
    seriesTitle: d.seriesTitle ?? null,
    volumeNumber: d.volumeNumber ?? null,
    notes: d.notes,
    quotes: d.quotes.map((q) => ({ text: q.text, page: q.page ?? null })),
    review: reviewBody.length > 0 ? reviewBody : null,
    path: withBase(`/kitaplar/${book.id}/`),
  };
}

function postToExport(post: BlogEntry): ArchiveExportBlogPost {
  const d = post.data;
  return {
    title: d.title,
    publishDate: d.publishDate.toISOString().slice(0, 10),
    tags: d.tags,
    excerpt: d.excerpt || "",
    content: (post.body ?? "").trim(),
    path: withBase(`/blog/${post.id}/`),
  };
}

export async function getArchiveExportData(siteURL: URL | undefined): Promise<ArchiveExportData> {
  const [books, posts, settings] = await Promise.all([
    getPublishedBooks(),
    getPublishedPosts(),
    getEntry("settings", "main"),
  ]);

  // Kitapları en son bitiş/başlangıç tarihine göre en yeniden en eskiye,
  // blog yazılarını yayın tarihine göre en yeniden en eskiye sırala —
  // hem CSV hem PDF'te tutarlı ve anlamlı bir sırayla karşılaşılsın.
  const sortedBooks = [...books].sort((a, b) => {
    const at = (a.data.endDate ?? a.data.startDate)?.getTime() ?? 0;
    const bt = (b.data.endDate ?? b.data.startDate)?.getTime() ?? 0;
    return bt - at;
  });
  const sortedPosts = [...posts].sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const exportBooks = sortedBooks.map(bookToExport);
  const exportPosts = sortedPosts.map(postToExport);

  return {
    generatedAt: new Date().toISOString(),
    site: {
      name: "Okurken",
      readerName: settings?.data.readerName ?? "Ufuk Demir",
      tagline: settings?.data.tagline ?? "",
      url: siteURL ? siteURL.toString().replace(/\/$/, "") : "",
    },
    counts: {
      books: exportBooks.length,
      completedBooks: exportBooks.filter((b) => b.status === "completed").length,
      reviews: exportBooks.filter((b) => b.review !== null).length,
      notes: exportBooks.reduce((sum, b) => sum + b.notes.length, 0),
      quotes: exportBooks.reduce((sum, b) => sum + b.quotes.length, 0),
      blogPosts: exportPosts.length,
    },
    books: exportBooks,
    blogPosts: exportPosts,
  };
}
