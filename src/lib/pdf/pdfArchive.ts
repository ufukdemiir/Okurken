// `pdfmake`'in Node giriş noktası saf bir CJS modülüdür ve adlandırılmış
// (named) dışa aktarımları statik analizle tespit edilemeyecek şekilde
// tanımlanır (`module.exports = new pdfmake()`). Astro'nun derleme-zamanı
// (build-time) önişleme (prerender) adımı bu paketi paketlemeyip Node'un
// yerli ESM yükleyicisine bırakıyor; o da yalnızca varsayılan (default)
// içe aktarımı güvenle çözebiliyor. Bu yüzden burada bilinçli olarak
// `import { createPdf } from "pdfmake"` YERİNE varsayılan içe aktarıyoruz.
// Not: bu metotlar bir sınıf örneğine (`this`e) bağlı olduğundan,
// nesneden ayrıştırıp (destructure) çıplak fonksiyon olarak ÇAĞIRMAK
// (`const { createPdf } = pdfMakeDefault; createPdf(...)`) "this"i
// kaybettirip çalışma zamanında hataya yol açar — bu yüzden metotlar
// daima `pdfMakeDefault.xxx(...)` şeklinde, örnek üzerinden çağrılır.
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pdfMakeDefault from "pdfmake";
import type { TDocumentDefinitions, TFontDictionary } from "pdfmake/interfaces";
import type { ArchiveExportData } from "../archiveExport";
import { formatDateTR } from "../reading";
import { COLORS } from "./palette";
import { CONTENT_WIDTH, accentBlockWrap, markdownToPdfContent } from "./markdownToPdf";
import {
  SERIF_REGULAR_B64,
  SERIF_SEMIBOLD_B64,
  SERIF_ITALIC_B64,
  SERIF_SEMIBOLD_ITALIC_B64,
  SERIF_DISPLAY_SEMIBOLD_B64,
  SERIF_DISPLAY_SEMIBOLD_ITALIC_B64,
  SANS_REGULAR_B64,
  SANS_SEMIBOLD_B64,
} from "./fonts/index";

/**
 * "Arşivi indir" → PDF ucu için belge üretimi. Site içeriğiyle aynı iki
 * fontu (Source Serif 4 + Plus Jakarta Sans, bkz. src/styles/global.css)
 * kullanır ve Türkçe karakterlerin (ğ ş ı İ ç ö ü) hiçbir yerde sorun
 * çıkarmaması için bu fontların Türkçe alt kümesini gömer
 * (bkz. src/lib/pdf/fonts/README.md).
 *
 * pdfmake'in resmî TS tipleri (bkz. markdownToPdf.ts'teki not) bazı geçerli
 * çalışma zamanı alanlarını (tocItem, tocStyle, outline, ...) taşımaz; bu
 * yüzden belge ağacı gevşek tipli olarak kurulur ve yalnızca `createPdf`'e
 * verilirken tek bir yerde `TDocumentDefinitions`e cast edilir.
 */
type PdfNode = Record<string, unknown>;

// Fontları doğrudan Buffer olarak vermek yerine geçici bir dosyaya yazıp yol
// (path) string'i olarak veriyoruz: pdfmake'in Node tarafındaki
// `resolveUrls` adımı, her font tanımını da (yanlışlıkla) bir URL gibi
// işlemeye çalışıyor ve bir Buffer verildiğinde (`typeof buffer === "object"`
// olduğu için) çöküyor. Salt-okunur bir string yol vermek bu sorunu tamamen
// ortadan kaldırır; ayrıca `localAccessPolicy` de yalnızca bu klasöre izin
// verecek şekilde daraltılır (aşağıya bakınız).
const FONT_DIR = join(tmpdir(), "okurken-pdf-fonts");
mkdirSync(FONT_DIR, { recursive: true });

function materializeFont(fileName: string, base64: string): string {
  const filePath = join(FONT_DIR, `${fileName}.ttf`);
  writeFileSync(filePath, Buffer.from(base64, "base64"));
  return filePath;
}

// Yalnızca bu uç noktada (build-time, Node) çalışır: harici bir HTTP(S)
// isteğine hiçbir zaman ihtiyaç yok (görseller metne dönüştürülüyor, bkz.
// markdownToPdf.ts), o yüzden tamamen kapatılır. Yerel dosya erişimi ise
// yalnızca birazdan yazılacak font dosyalarının bulunduğu klasörle
// sınırlandırılır — başka hiçbir yerel yola erişim izni verilmez.
pdfMakeDefault.setUrlAccessPolicy(() => false);
pdfMakeDefault.setLocalAccessPolicy((path) => path.startsWith(FONT_DIR));

const FONTS: TFontDictionary = {
  SourceSerif4: {
    normal: materializeFont("SourceSerif4-Regular", SERIF_REGULAR_B64),
    bold: materializeFont("SourceSerif4-SemiBold", SERIF_SEMIBOLD_B64),
    italics: materializeFont("SourceSerif4-Italic", SERIF_ITALIC_B64),
    bolditalics: materializeFont("SourceSerif4-SemiBoldItalic", SERIF_SEMIBOLD_ITALIC_B64),
  },
  SourceSerif4Display: {
    normal: materializeFont("SourceSerif4Display-SemiBold", SERIF_DISPLAY_SEMIBOLD_B64),
    bold: materializeFont("SourceSerif4Display-SemiBold", SERIF_DISPLAY_SEMIBOLD_B64),
    italics: materializeFont("SourceSerif4Display-SemiBoldItalic", SERIF_DISPLAY_SEMIBOLD_ITALIC_B64),
    bolditalics: materializeFont("SourceSerif4Display-SemiBoldItalic", SERIF_DISPLAY_SEMIBOLD_ITALIC_B64),
  },
  PlusJakartaSans: {
    normal: materializeFont("PlusJakartaSans-Regular", SANS_REGULAR_B64),
    bold: materializeFont("PlusJakartaSans-SemiBold", SANS_SEMIBOLD_B64),
    italics: materializeFont("PlusJakartaSans-Regular", SANS_REGULAR_B64),
    bolditalics: materializeFont("PlusJakartaSans-SemiBold", SANS_SEMIBOLD_B64),
  },
};

pdfMakeDefault.setFonts(FONTS);


function isoToTR(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return formatDateTR(new Date(`${iso}T00:00:00`));
}

function hr(): PdfNode {
  return {
    canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.75, lineColor: COLORS.rule }],
    margin: [0, 18, 0, 0],
  };
}

function siteLink(data: ArchiveExportData, path: string): string {
  return data.site.url ? `${data.site.url}${path}` : path;
}

/** Bir kitap/blog başlığının altına, sitedeki sayfasına giden tıklanabilir küçük bir satır ekler. */
function viewOnSiteRun(url: string): PdfNode {
  return { text: "Sitede görüntüle →", link: url, color: COLORS.leather, decoration: "underline", fontSize: 8.5 };
}

function buildCover(data: ArchiveExportData): PdfNode[] {
  const counts = data.counts;
  const statsLine = [
    `${counts.books} kitap`,
    `${counts.completedBooks} tamamlandı`,
    `${counts.reviews} inceleme`,
    `${counts.notes} not`,
    `${counts.quotes} alıntı`,
    `${counts.blogPosts} blog yazısı`,
  ].join("   ·   ");

  const nodes: (PdfNode | null)[] = [
    { text: "OKURKEN", style: "coverKicker", alignment: "center", margin: [0, 90, 0, 0] },
    { text: "Arşiv", style: "coverTitle", alignment: "center", margin: [0, 6, 0, 14] },
    data.site.tagline
      ? { text: data.site.tagline, style: "coverTagline", alignment: "center", margin: [0, 0, 0, 26] }
      : null,
    {
      canvas: [
        {
          type: "line",
          x1: CONTENT_WIDTH / 2 - 46,
          y1: 0,
          x2: CONTENT_WIDTH / 2 + 46,
          y2: 0,
          lineWidth: 1.2,
          lineColor: COLORS.gold,
        },
      ],
      margin: [0, 0, 0, 26],
    },
    { text: data.site.readerName, style: "coverReader", alignment: "center" },
    { text: statsLine, style: "coverStats", alignment: "center", margin: [0, 16, 0, 0] },
    {
      text: `Bu arşiv ${formatDateTR(new Date(data.generatedAt))} tarihinde, Okurken'in "Arşivi indir" özelliğiyle oluşturuldu.`,
      style: "coverMeta",
      alignment: "center",
      margin: [0, 60, 0, 0],
    },
    data.site.url
      ? {
          text: data.site.url.replace(/^https?:\/\//, ""),
          style: "coverMeta",
          color: COLORS.leather,
          link: data.site.url,
          alignment: "center",
          margin: [0, 4, 0, 0],
        }
      : null,
  ];

  return nodes.filter((n): n is PdfNode => n !== null);
}

function buildToc(): PdfNode[] {
  return [
    { text: "İçindekiler", style: "tocTitle", margin: [0, 0, 0, 14], pageBreak: "before" },
    {
      toc: {
        id: "_default_",
        textStyle: "tocEntry",
        numberStyle: "tocEntry",
        textMargin: [0, 2, 0, 2],
      },
    },
  ];
}

function buildSectionTitle(text: string): PdfNode {
  return {
    text,
    style: "sectionTitle",
    tocItem: true,
    tocStyle: "tocSection",
    tocMargin: [0, 14, 0, 4],
    pageBreak: "before",
    margin: [0, 0, 0, 16],
  };
}

function buildBookBlock(data: ArchiveExportData, book: ArchiveExportData["books"][number], isFirst: boolean): PdfNode[] {
  const blocks: PdfNode[] = [];

  const metaParts: string[] = [book.statusLabel + (book.rating ? ` · ${book.rating}/10` : "")];
  if (book.publisher) metaParts.push(book.publisher);
  if (book.pageCount) metaParts.push(`${book.pageCount} sayfa`);
  const startTR = isoToTR(book.startDate);
  const endTR = isoToTR(book.endDate);
  if (startTR && endTR) metaParts.push(`${startTR} – ${endTR}`);
  else if (startTR) metaParts.push(`Başlangıç: ${startTR}`);
  else if (endTR) metaParts.push(`Bitiş: ${endTR}`);
  if (book.genres.length) metaParts.push(book.genres.join(", "));
  if (book.seriesTitle) metaParts.push(`${book.seriesTitle} serisi${book.volumeNumber ? `, Cilt ${book.volumeNumber}` : ""}`);

  blocks.push({
    text: book.displayTitle,
    style: "bookTitle",
    tocItem: true,
    tocStyle: "tocEntry",
    tocMargin: [14, 2, 0, 2],
    outline: true,
    margin: [0, isFirst ? 0 : 24, 0, 2],
  });
  blocks.push({ text: book.author, style: "bookAuthor", margin: [0, 0, 0, 4] });
  blocks.push({ text: metaParts.join("   ·   "), style: "bookMeta", margin: [0, 0, 0, 6] });
  blocks.push(viewOnSiteRun(siteLink(data, book.path)));

  if (book.review) {
    blocks.push({ text: "İNCELEME", style: "subLabel", margin: [0, 16, 0, 6] });
    blocks.push(...(markdownToPdfContent(book.review) as unknown as PdfNode[]));
  }

  if (book.notes.length > 0) {
    blocks.push({ text: "NOTLAR", style: "subLabel", margin: [0, 16, 0, 6] });
    for (const note of book.notes) {
      blocks.push(accentBlockWrap(markdownToPdfContent(note), { accentColor: COLORS.rule }) as unknown as PdfNode);
    }
  }

  if (book.quotes.length > 0) {
    blocks.push({ text: "ALINTILAR", style: "subLabel", margin: [0, 16, 0, 6] });
    for (const quote of book.quotes) {
      blocks.push(
        accentBlockWrap(markdownToPdfContent(quote.text), { accentColor: COLORS.gold, italics: true }) as unknown as PdfNode,
      );
      if (quote.page) {
        blocks.push({ text: `Sayfa ${quote.page}`, style: "quoteCaption", margin: [14, -8, 0, 12] });
      }
    }
  }

  blocks.push(hr());
  return blocks;
}

function buildBlogBlock(data: ArchiveExportData, post: ArchiveExportData["blogPosts"][number], isFirst: boolean): PdfNode[] {
  const blocks: PdfNode[] = [];
  const metaParts = [formatDateTR(new Date(`${post.publishDate}T00:00:00`))];
  if (post.tags.length) metaParts.push(post.tags.join(", "));

  blocks.push({
    text: post.title,
    style: "bookTitle",
    tocItem: true,
    tocStyle: "tocEntry",
    tocMargin: [14, 2, 0, 2],
    outline: true,
    margin: [0, isFirst ? 0 : 24, 0, 2],
  });
  blocks.push({ text: metaParts.join("   ·   "), style: "bookMeta", margin: [0, 0, 0, 6] });
  blocks.push(viewOnSiteRun(siteLink(data, post.path)));
  blocks.push({ text: "", margin: [0, 10, 0, 0] });
  blocks.push(...(markdownToPdfContent(post.content) as unknown as PdfNode[]));
  blocks.push(hr());
  return blocks;
}

function buildContent(data: ArchiveExportData): PdfNode[] {
  const content: PdfNode[] = [...buildCover(data), ...buildToc()];

  if (data.books.length > 0) {
    content.push(buildSectionTitle("Kitaplar"));
    data.books.forEach((book, i) => content.push(...buildBookBlock(data, book, i === 0)));
  }

  if (data.blogPosts.length > 0) {
    content.push(buildSectionTitle("Blog Yazıları"));
    data.blogPosts.forEach((post, i) => content.push(...buildBlogBlock(data, post, i === 0)));
  }

  if (data.books.length === 0 && data.blogPosts.length === 0) {
    content.push({
      text: "Henüz yayınlanmış içerik yok.",
      style: "bookMeta",
      alignment: "center",
      pageBreak: "before",
      margin: [0, 40, 0, 0],
    });
  }

  return content;
}

function buildDocDefinition(data: ArchiveExportData): PdfNode {
  return {
    content: buildContent(data),
    pageSize: "A4",
    pageMargins: [50, 60, 50, 64],
    defaultStyle: {
      font: "SourceSerif4",
      fontSize: 10.5,
      color: COLORS.ink,
      lineHeight: 1.3,
    },
    styles: {
      coverKicker: { font: "PlusJakartaSans", fontSize: 11, bold: true, color: COLORS.leather, characterSpacing: 3 },
      coverTitle: { font: "SourceSerif4Display", fontSize: 40, bold: true, color: COLORS.ink },
      coverTagline: { font: "PlusJakartaSans", fontSize: 11, color: COLORS.inkSoft },
      coverReader: { font: "PlusJakartaSans", fontSize: 13, bold: true, color: COLORS.ink },
      coverStats: { font: "PlusJakartaSans", fontSize: 9.5, color: COLORS.inkSoft },
      coverMeta: { font: "PlusJakartaSans", fontSize: 9, color: COLORS.inkSoft },
      tocTitle: { font: "SourceSerif4Display", fontSize: 22, bold: true, color: COLORS.ink },
      tocSection: { font: "PlusJakartaSans", fontSize: 10.5, bold: true, color: COLORS.leather, characterSpacing: 0.5 },
      tocEntry: { font: "SourceSerif4", fontSize: 9.5, color: COLORS.inkSoft },
      sectionTitle: {
        font: "PlusJakartaSans",
        fontSize: 12,
        bold: true,
        color: COLORS.leather,
        characterSpacing: 1.5,
      },
      bookTitle: { font: "SourceSerif4Display", fontSize: 17, bold: true, color: COLORS.ink },
      bookAuthor: { font: "PlusJakartaSans", fontSize: 10, color: COLORS.leather },
      bookMeta: { font: "PlusJakartaSans", fontSize: 8.5, color: COLORS.inkSoft },
      subLabel: { font: "PlusJakartaSans", fontSize: 8.5, bold: true, color: COLORS.leather, characterSpacing: 1 },
      quoteCaption: { font: "PlusJakartaSans", fontSize: 8, color: COLORS.inkSoft },
      mdH1: { font: "SourceSerif4Display", fontSize: 15, bold: true, color: COLORS.ink },
      mdH2: { font: "SourceSerif4Display", fontSize: 13.5, bold: true, color: COLORS.ink },
      mdH3: { font: "SourceSerif4", fontSize: 12, bold: true, color: COLORS.ink },
      mdH4: { font: "SourceSerif4", fontSize: 11, bold: true, color: COLORS.ink },
    },
    footer: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return { text: "" };
      return {
        columns: [
          { text: "Okurken — Arşiv", style: "coverMeta", margin: [50, 0, 0, 0] },
          { text: `${currentPage} / ${pageCount}`, style: "coverMeta", alignment: "right", margin: [0, 0, 50, 0] },
        ],
        margin: [0, 20, 0, 0],
      };
    },
    info: {
      title: `Okurken — Arşiv (${data.site.readerName})`,
      author: data.site.readerName,
      subject: "Kitaplar, incelemeler, notlar, alıntılar ve blog yazıları arşivi",
      creator: "Okurken",
      producer: "Okurken",
      creationDate: new Date(data.generatedAt),
    },
    language: "tr",
    displayTitle: true,
  };
}

/** Verilen arşiv verisinden tam bir PDF belgesi üretir ve ikili (binary) içeriğini döndürür. */
export async function buildArchivePdfBuffer(data: ArchiveExportData): Promise<Buffer> {
  const docDefinition = buildDocDefinition(data) as unknown as TDocumentDefinitions;
  const pdfDoc = pdfMakeDefault.createPdf(docDefinition);
  return pdfDoc.getBuffer();
}
