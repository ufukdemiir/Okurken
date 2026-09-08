import type { APIRoute } from "astro";
import {
  getPublishedBooks,
  getAllAuthors,
  getAllQuotes,
  getAllNotes,
  getBooksWithReviews,
} from "../lib/books";

export const prerender = true;

interface SearchIndexItem {
  kind: "book" | "author" | "quote" | "review" | "note";
  title: string;
  subtitle: string;
  text: string;
  url: string;
}

export const GET: APIRoute = async () => {
  const [books, authors, quotes, notes, reviews] = await Promise.all([
    getPublishedBooks(),
    getAllAuthors(),
    getAllQuotes(),
    getAllNotes(),
    getBooksWithReviews(),
  ]);

  const items: SearchIndexItem[] = [
    ...books.map((b) => ({
      kind: "book" as const,
      title: b.data.title,
      subtitle: b.data.author,
      text: b.data.genres.join(" "),
      url: `/kitaplar/${b.id}/`,
    })),
    ...authors.map((a) => ({
      kind: "author" as const,
      title: a.name,
      subtitle: `${a.books.length} kitap`,
      text: "",
      url: `/yazarlar/${a.slug}/`,
    })),
    ...quotes.map((q) => ({
      kind: "quote" as const,
      title: q.book.data.title,
      subtitle: q.book.data.author,
      text: q.text,
      url: `/kitaplar/${q.book.id}/#alinti-${q.index}`,
    })),
    ...notes.map((n) => ({
      kind: "note" as const,
      title: n.book.data.title,
      subtitle: n.book.data.author,
      text: n.text,
      url: `/kitaplar/${n.book.id}/#not-${n.index}`,
    })),
    ...reviews.map((b) => ({
      kind: "review" as const,
      title: b.data.title,
      subtitle: b.data.author,
      text: (b.body ?? "").slice(0, 500),
      url: `/kitaplar/${b.id}/#inceleme`,
    })),
  ];

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
