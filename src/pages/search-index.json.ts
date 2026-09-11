import type { APIRoute } from "astro";
import {
  getPublishedBooks,
  getAllAuthors,
  getAllQuotes,
  getAllNotes,
  getBooksWithReviews,
  getDisplayTitle,
} from "../lib/books";
import { getPublishedPosts } from "../lib/blog";

export const prerender = true;

interface SearchIndexItem {
  kind: "book" | "author" | "quote" | "review" | "note" | "blog";
  title: string;
  subtitle: string;
  text: string;
  url: string;
}

export const GET: APIRoute = async () => {
  const [books, authors, quotes, notes, reviews, posts] = await Promise.all([
    getPublishedBooks(),
    getAllAuthors(),
    getAllQuotes(),
    getAllNotes(),
    getBooksWithReviews(),
    getPublishedPosts(),
  ]);

  const items: SearchIndexItem[] = [
    ...books.map((b) => ({
      kind: "book" as const,
      title: getDisplayTitle(b),
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
      title: getDisplayTitle(q.book),
      subtitle: q.book.data.author,
      text: q.text,
      url: `/kitaplar/${q.book.id}/#alinti-${q.index}`,
    })),
    ...notes.map((n) => ({
      kind: "note" as const,
      title: getDisplayTitle(n.book),
      subtitle: n.book.data.author,
      text: n.text,
      url: `/kitaplar/${n.book.id}/#not-${n.index}`,
    })),
    ...reviews.map((b) => ({
      kind: "review" as const,
      title: getDisplayTitle(b),
      subtitle: b.data.author,
      text: (b.body ?? "").slice(0, 500),
      url: `/kitaplar/${b.id}/#inceleme`,
    })),
    ...posts.map((p) => ({
      kind: "blog" as const,
      title: p.data.title,
      subtitle: "Blog",
      text: p.data.excerpt || (p.body ?? "").slice(0, 500),
      url: `/blog/${p.id}/`,
    })),
  ];

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
