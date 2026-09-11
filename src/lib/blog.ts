import { getCollection, type CollectionEntry } from "astro:content";

export type BlogEntry = CollectionEntry<"blog">;

/** Yayınlanmış (taslak olmayan) tüm blog yazılarını, en yeniden en eskiye sıralı döndürür. */
export async function getPublishedPosts(): Promise<BlogEntry[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getPublishedPosts();
  const set = new Set<string>();
  posts.forEach((p) => p.data.tags.forEach((t) => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b, "tr-TR"));
}
