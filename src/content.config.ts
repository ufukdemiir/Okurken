import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

// ---------------------------------------------------------------------------
// "books" koleksiyonu — Decap CMS'in src/content/books klasörüne yazdığı
// her .md dosyası bir kitabı temsil eder. Ana Markdown gövdesi kitabın
// İNCELEMESİ (review) olarak render edilir; notlar ve alıntılar ayrı
// frontmatter alanlarıdır.
// ---------------------------------------------------------------------------
const books = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/books" }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    publisher: z.string().optional().default(""),
    pageCount: z.number().int().positive().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["reading", "completed", "want-to-read", "dropped"]),
    rating: z.number().min(1).max(10).optional(),
    genres: z.array(z.string()).default([]),
    // Her biri kısa bir Markdown parçası olabilen kişisel notlar.
    notes: z.array(z.string()).default([]),
    // Kitaptan seçilen alıntılar, isteğe bağlı sayfa numarasıyla.
    quotes: z
      .array(
        z.object({
          text: z.string(),
          page: z.number().int().positive().optional(),
        }),
      )
      .default([]),
    // Decap CMS'in "editöryal iş akışı" (taslak) kullanımı için.
    draft: z.boolean().default(false),
  }),
});

// ---------------------------------------------------------------------------
// "settings" — tek dosyalık site ayarları (Decap CMS'te "Site Ayarları"
// olarak düzenlenir). Ana sayfadaki okur kartı ve yıllık hedef buradan gelir.
// ---------------------------------------------------------------------------
const settings = defineCollection({
  loader: file("src/data/site.json"),
  schema: z.object({
    readerName: z.string(),
    avatarInitials: z.string(),
    tagline: z.string(),
    bio: z.string(),
    siteDescription: z.string(),
    goalYear: z.number().int(),
    yearlyGoal: z.number().int().positive(),
        social: z.object({
      website: z.string().optional().default(""),
      github: z.string().optional().default(""),
      linkedin: z.string().optional().default(""),
      pinterest: z.string().optional().default(""),
      email: z.string().optional().default(""),
    }),
  }),
});

export const collections = { books, settings };
