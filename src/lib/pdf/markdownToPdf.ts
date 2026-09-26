import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type { Content } from "pdfmake/interfaces";
import { COLORS } from "./palette";

/**
 * İncelemeler, notlar, alıntılar ve blog yazıları Markdown olarak
 * saklanıyor (bkz. src/content.config.ts). Bu modül o Markdown'ı,
 * sitenin görsel kimliğine uygun biçimlendirilmiş bir pdfmake içerik
 * ağacına çevirir: paragraflar, başlıklar, kalın/italik/üstü çizili
 * vurgular, bağlantılar, alıntı blokları, listeler (iç içe olanlar
 * dahil), tablolar, satır içi/blok kod ve yatay çizgiler desteklenir.
 *
 * pdfmake'in resmî TypeScript tipleri (ContentText/ContentTable/...) çok
 * sayıda "bu alanı ASLA içermesin" (ForbidOtherElementProperties) kısıtı
 * içeren ayrık bir birleşim (discriminated union) kullanıyor. Bu düğümleri
 * adım adım, alan alan biriktirirken bu kısıtla boğuşmamak için içeride
 * gevşek tipli bir `PdfNode` kullanılır; dışa açılan fonksiyonun imzası
 * yine de tam olarak `Content[]` döner.
 */
type PdfNode = Record<string, unknown>;

interface InlineCtx {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  color?: string;
  background?: string;
  link?: string;
}

/** A4 (595.28pt) - 2 x 50pt kenar boşluğu. pdfArchive.ts'teki `pageMargins` ile senkron tutulmalı. */
export const CONTENT_WIDTH = 495.28;

function makeRun(text: string, ctx: InlineCtx): PdfNode {
  const run: PdfNode = { text };
  if (ctx.bold) run.bold = true;
  if (ctx.italics) run.italics = true;
  if (ctx.strike) run.decoration = "lineThrough";
  if (ctx.color) run.color = ctx.color;
  if (ctx.background) run.background = ctx.background;
  if (ctx.link) run.link = ctx.link;
  return run;
}

function inlineTokensToRuns(tokens: Token[] | undefined, ctx: InlineCtx = {}): PdfNode[] {
  if (!tokens || tokens.length === 0) return [];
  const runs: PdfNode[] = [];

  for (const tok of tokens) {
    switch (tok.type) {
      case "text": {
        const t = tok as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) {
          runs.push(...inlineTokensToRuns(t.tokens, ctx));
        } else {
          runs.push(makeRun(t.text, ctx));
        }
        break;
      }
      case "strong": {
        const t = tok as Tokens.Strong;
        runs.push(...inlineTokensToRuns(t.tokens, { ...ctx, bold: true }));
        break;
      }
      case "em": {
        const t = tok as Tokens.Em;
        runs.push(...inlineTokensToRuns(t.tokens, { ...ctx, italics: true }));
        break;
      }
      case "del": {
        const t = tok as Tokens.Del;
        runs.push(...inlineTokensToRuns(t.tokens, { ...ctx, strike: true }));
        break;
      }
      case "codespan": {
        const t = tok as Tokens.Codespan;
        runs.push(makeRun(t.text, { ...ctx, color: COLORS.leather, background: COLORS.rule }));
        break;
      }
      case "link": {
        const t = tok as Tokens.Link;
        runs.push(...inlineTokensToRuns(t.tokens, { ...ctx, link: t.href, color: COLORS.leather }));
        break;
      }
      case "image": {
        const t = tok as Tokens.Image;
        // Uzak görselleri derleme anında indirip gömmek yerine (ağ bağımlılığı
        // ve olası kopuk bağlantı riski nedeniyle), yerine kısa bir not konur.
        runs.push(makeRun(`[görsel: ${t.text || t.href}]`, { ...ctx, italics: true, color: COLORS.inkSoft }));
        break;
      }
      case "br":
        runs.push({ text: "\n" });
        break;
      case "escape": {
        runs.push(makeRun((tok as Tokens.Escape).text, ctx));
        break;
      }
      default: {
        const generic = tok as Tokens.Generic;
        if (typeof generic.text === "string") runs.push(makeRun(generic.text, ctx));
      }
    }
  }

  return runs;
}

/**
 * Bir içerik bloğunu, solunda ince renkli bir çizgi olan tek sütunlu bir
 * tabloya sarar (sitedeki `.border-l-2` vurgu stilinin PDF karşılığı).
 * Markdown alıntı bloklarında (gold, italik) ve arşiv PDF'inde kitap
 * notları/alıntıları gibi tekil metinleri vurgulamak için kullanılır.
 */
export function accentBlockWrap(inner: Content[], options: { accentColor: string; italics?: boolean }): Content {
  const node: PdfNode = {
    table: {
      widths: ["*"],
      body: [[{ stack: inner as unknown as PdfNode[], italics: options.italics ?? false, color: COLORS.ink }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i: number) => (i === 0 ? 2 : 0),
      vLineColor: () => options.accentColor,
      paddingLeft: () => 14,
      paddingRight: () => 0,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
    margin: [0, 4, 0, 12],
  };
  return node as unknown as Content;
}

function listItemToContent(item: Tokens.ListItem): PdfNode {
  const blocks: PdfNode[] = [];
  let pendingRuns: PdfNode[] = [];

  const flushRuns = () => {
    if (pendingRuns.length > 0) {
      blocks.push({ text: pendingRuns });
      pendingRuns = [];
    }
  };

  for (const tok of item.tokens) {
    if (tok.type === "text") {
      const t = tok as Tokens.Text;
      if (t.tokens && t.tokens.length > 0) {
        pendingRuns.push(...inlineTokensToRuns(t.tokens));
      } else {
        pendingRuns.push(makeRun(t.text, {}));
      }
    } else if (tok.type === "paragraph") {
      pendingRuns.push(...inlineTokensToRuns((tok as Tokens.Paragraph).tokens));
    } else {
      flushRuns();
      blocks.push(...blockTokensToContent([tok]));
    }
  }
  flushRuns();

  if (item.task) {
    const prefix = item.checked ? "☑ " : "☐ ";
    const first = blocks[0] as PdfNode | undefined;
    if (first && Array.isArray(first.text)) {
      first.text = [makeRun(prefix, {}), ...(first.text as PdfNode[])];
    } else if (first) {
      first.text = [makeRun(prefix, {}), makeRun(String(first.text ?? ""), {})];
    }
  }

  if (blocks.length === 0) return { text: "" };
  return blocks.length === 1 ? blocks[0] : { stack: blocks };
}

function blockTokensToContent(tokens: Token[]): PdfNode[] {
  const out: PdfNode[] = [];

  for (const tok of tokens) {
    switch (tok.type) {
      case "paragraph": {
        const t = tok as Tokens.Paragraph;
        out.push({ text: inlineTokensToRuns(t.tokens), margin: [0, 0, 0, 10], lineHeight: 1.35 });
        break;
      }
      case "heading": {
        const t = tok as Tokens.Heading;
        const level = Math.min(Math.max(t.depth, 1), 4);
        out.push({
          text: inlineTokensToRuns(t.tokens),
          style: `mdH${level}`,
          margin: [0, level <= 2 ? 16 : 12, 0, 6],
        });
        break;
      }
      case "blockquote": {
        const t = tok as Tokens.Blockquote;
        const inner = blockTokensToContent(t.tokens) as unknown as Content[];
        out.push(accentBlockWrap(inner, { accentColor: COLORS.gold, italics: true }) as unknown as PdfNode);
        break;
      }
      case "list": {
        const t = tok as Tokens.List;
        const items = t.items.map((item) => listItemToContent(item));
        if (t.ordered) {
          out.push({ ol: items, start: typeof t.start === "number" ? t.start : 1, margin: [0, 2, 0, 10] });
        } else {
          out.push({ ul: items, margin: [0, 2, 0, 10] });
        }
        break;
      }
      case "code": {
        const t = tok as Tokens.Code;
        out.push({
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: t.text,
                  font: "PlusJakartaSans",
                  fontSize: 9,
                  color: COLORS.ink,
                  fillColor: COLORS.rule,
                  lineHeight: 1.3,
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 10,
            paddingRight: () => 10,
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
          margin: [0, 4, 0, 12],
        });
        break;
      }
      case "table": {
        const t = tok as Tokens.Table;
        const headerRow = t.header.map((cell) => ({
          text: inlineTokensToRuns(cell.tokens),
          bold: true,
          color: COLORS.paper,
          fillColor: COLORS.leather,
          alignment: cell.align ?? undefined,
        }));
        const bodyRows = t.rows.map((row) =>
          row.map((cell) => ({
            text: inlineTokensToRuns(cell.tokens),
            alignment: cell.align ?? undefined,
          })),
        );
        out.push({
          table: {
            headerRows: 1,
            widths: t.header.map(() => "*"),
            body: [headerRow, ...bodyRows],
          },
          layout: {
            hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
              i === 0 || i === 1 || i === node.table.body.length ? 0.75 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => COLORS.rule,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
          margin: [0, 4, 0, 12],
        });
        break;
      }
      case "hr": {
        out.push({
          canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 1, lineColor: COLORS.rule }],
          margin: [0, 10, 0, 10],
        });
        break;
      }
      case "space":
        break;
      default: {
        const generic = tok as Tokens.Generic;
        if (typeof generic.text === "string" && generic.text.trim().length > 0) {
          out.push({ text: generic.text, margin: [0, 0, 0, 10] });
        }
      }
    }
  }

  return out;
}

/** Bir Markdown dizesini pdfmake `content` dizisine çevirir. Boş/undefined girdi için boş dizi döner. */
export function markdownToPdfContent(markdown: string | null | undefined): Content[] {
  const text = (markdown ?? "").trim();
  if (!text) return [];
  const tokens = marked.lexer(text, { gfm: true, breaks: false });
  return blockTokensToContent(tokens) as unknown as Content[];
}
