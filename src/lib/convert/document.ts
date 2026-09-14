/* Document engine.
 *  \u2022 text / markdown / csv / json  \u2192  PDF (jsPDF, paginated in memory)
 *  \u2022 anything text-shaped         \u2192  standalone HTML
 *  \u2022 csv \u2194 json                  \u2192  structural translation
 *  \u2022 PDF                          \u2192  text (pdf.js text layer)
 */

import { jsPDF } from 'jspdf';
import type { Emit, OutputFile } from '../types';

/* ------------------------------------------------------------ csv parsing */

export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === '') {
      inQuotes = true;
      continue;
    }
    if (c === delimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function csvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h, i) => h.trim() || `column_${i + 1}`);
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = r[i] ?? ''));
    return rec;
  });
}

export function recordsToCsv(records: Record<string, string>[]): string {
  if (records.length === 0) return '';
  const columns: string[] = [];
  for (const rec of records) for (const key of Object.keys(rec)) if (!columns.includes(key)) columns.push(key);
  const esc = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(esc).join(',')];
  for (const rec of records) lines.push(columns.map((c) => esc(rec[c])).join(','));
  return lines.join('\n');
}

/* --------------------------------------------------------- markdown model */

export type Block =
  | { kind: 'h'; level: number; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'code'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'raw'; html: string }
  | { kind: 'hr' };

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push({ kind: 'code', lines: code });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: 'h', level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push({ kind: 'quote', text: buf.join(' ') });
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*+]\s+/, ''));
      blocks.push({ kind: 'ul', items });
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push({ kind: 'ol', items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|```|\s*[-*+]\s|\s*\d+[.)]\s|\s*>)/.test(lines[i])) {
      para.push(lines[i++]);
    }
    blocks.push({ kind: 'p', text: para.join(' ') });
  }
  return blocks;
}

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inlineHtml(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function blocksToHtml(blocks: Block[], title: string): string {
  const body = blocks
    .map((b) => {
      switch (b.kind) {
        case 'h':
          return `<h${b.level}>${inlineHtml(b.text)}</h${b.level}>`;
        case 'p':
          return `<p>${inlineHtml(b.text)}</p>`;
        case 'code':
          return `<pre><code>${escapeHtml(b.lines.join('\n'))}</code></pre>`;
        case 'ul':
          return `<ul>${b.items.map((it) => `<li>${inlineHtml(it)}</li>`).join('')}</ul>`;
        case 'ol':
          return `<ol>${b.items.map((it) => `<li>${inlineHtml(it)}</li>`).join('')}</ol>`;
        case 'quote':
          return `<blockquote>${inlineHtml(b.text)}</blockquote>`;
        case 'raw':
          return b.html;
        case 'hr':
          return '<hr />';
        default:
          return '';
      }
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 48px 20px; background: #0e1113; color: #e8ecea;
         font: 16px/1.65 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 720px; margin: 0 auto; }
  h1, h2, h3, h4 { line-height: 1.25; letter-spacing: -0.01em; margin: 2em 0 0.6em; }
  h1 { font-size: 2rem; border-bottom: 1px solid rgba(255,255,255,.12); padding-bottom: .4em; }
  h2 { font-size: 1.4rem; } h3 { font-size: 1.15rem; }
  p { margin: 0 0 1em; }
  code { font: 0.9em/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
         background: rgba(255,255,255,.08); padding: .12em .38em; border-radius: 4px; }
  pre { background: #0a0d0f; border: 1px solid rgba(255,255,255,.1); padding: 14px 16px;
        border-radius: 10px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 1.2em 0; padding: .2em 0 .2em 16px; border-left: 3px solid #2fe08a; color: #a8b5ae; }
  hr { border: 0; border-top: 1px solid rgba(255,255,255,.12); margin: 2.4em 0; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { border: 1px solid rgba(255,255,255,.12); padding: 7px 10px; text-align: left; }
  th { background: rgba(255,255,255,.05); }
  a { color: #2fe08a; }
  footer { margin-top: 3.5em; font: 11px/1.4 ui-monospace, monospace; letter-spacing: .12em;
           text-transform: uppercase; color: #5f6d67; }
</style>
</head>
<body>
<main>
${body}
<footer>Converted locally with FileMorph \u00b7 never uploaded</footer>
</main>
</body>
</html>`;
}

/* --------------------------------------------------------------- pdf out */

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 52;

function newDoc(): jsPDF {
  return new jsPDF({ unit: 'pt', format: 'a4', compress: true });
}

function paginateText(doc: jsPDF, lines: { text: string; size: number; bold: boolean; gap: number }[]) {
  const [, pageH] = A4;
  const bottom = pageH - MARGIN;
  let y = MARGIN;
  for (const line of lines) {
    if (y + line.size * line.gap > bottom) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFontSize(line.size);
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    const wrapped = doc.splitTextToSize(line.text || ' ', A4[0] - MARGIN * 2) as string[];
    for (const w of wrapped) {
      if (y + line.size * 1.42 > bottom) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(w, MARGIN, y);
      y += line.size * 1.42;
    }
    y += line.gap;
  }
}

function textToPdf(text: string, title: string, markdown: boolean): jsPDF {
  const doc = newDoc();
  doc.setFontSize(9);
  const source = markdown ? parseMarkdown(text) : null;

  if (source) {
    const lines: { text: string; size: number; bold: boolean; gap: number }[] = [];
    for (const b of source) {
      switch (b.kind) {
        case 'h':
          lines.push({ text: b.text, size: b.level === 1 ? 20 : b.level === 2 ? 15 : 12.5, bold: true, gap: b.level === 1 ? 10 : 7 });
          break;
        case 'p':
          lines.push({ text: b.text, size: 10.5, bold: false, gap: 5 });
          break;
        case 'code':
          for (const l of b.lines) lines.push({ text: `    ${l}`, size: 8.5, bold: false, gap: 0 });
          lines.push({ text: '', size: 6, bold: false, gap: 5 });
          break;
        case 'ul':
          for (const it of b.items) lines.push({ text: `\u2022   ${it}`, size: 10.5, bold: false, gap: 2 });
          lines.push({ text: '', size: 6, bold: false, gap: 4 });
          break;
        case 'ol':
          b.items.forEach((it, i) => lines.push({ text: `${i + 1}.   ${it}`, size: 10.5, bold: false, gap: 2 }));
          lines.push({ text: '', size: 6, bold: false, gap: 4 });
          break;
        case 'quote':
          lines.push({ text: `> ${b.text}`, size: 10.5, bold: false, gap: 5 });
          break;
        case 'hr':
          lines.push({ text: '______________________________', size: 9, bold: false, gap: 8 });
          break;
      }
    }
    paginateText(doc, lines);
  } else {
    paginateText(doc, [{ text, size: 10.5, bold: false, gap: 0 }]);
  }

  doc.setProperties({ title, creator: 'FileMorph (local conversion)' });
  return doc;
}

function tableToPdf(rows: string[][], title: string): jsPDF {
  const landscape = rows.some((r) => r.reduce((a, c) => a + c.length + 2, 0) > 78);
  const doc = landscape ? new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape', compress: true }) : newDoc();
  const [pageW, pageH] = landscape ? [A4[1], A4[0]] : A4;
  const usable = pageW - MARGIN * 2;

  const colCount = Math.max(1, ...rows.map((r) => r.length));
  const maxLen: number[] = [];
  for (let c = 0; c < colCount; c++) {
    let m = 0;
    for (const r of rows) m = Math.max(m, (r[c] ?? '').length);
    maxLen.push(Math.min(m, 34));
  }
  const total = maxLen.reduce((a, b) => a + b + 2, 0) || 1;
  const widths = maxLen.map((m) => ((m + 2) / total) * usable);

  const charSize = Math.max(5.4, Math.min(9, (usable / total) * 1.15));
  const rowH = charSize * 1.75;
  let y = MARGIN + 14;

  doc.setFont('courier', 'bold');
  doc.setFontSize(charSize);
  const drawRow = (cells: string[]) => {
    let x = MARGIN;
    cells.forEach((cell, c) => {
      const w = widths[c] ?? usable / colCount;
      let text = cell ?? '';
      const maxChars = Math.max(1, Math.floor(w / (charSize * 0.6)) - 1);
      if (text.length > maxChars) text = text.slice(0, maxChars - 1) + '\u2026';
      doc.text(text, x + 2, y);
      x += w;
    });
  };

  // header
  doc.setFillColor(238, 242, 240);
  doc.rect(MARGIN, y - rowH + 2, usable, rowH, 'F');
  drawRow(rows[0] ?? []);
  y += rowH;
  doc.setFont('courier', 'normal');

  for (let i = 1; i < rows.length; i++) {
    if (y + rowH > pageH - MARGIN) {
      doc.addPage();
      y = MARGIN + rowH;
    }
    drawRow(rows[i]);
    y += rowH;
  }

  doc.setProperties({ title, creator: 'FileMorph (local conversion)' });
  return doc;
}

function jsonToPdf(text: string, title: string): jsPDF {
  const doc = newDoc();
  const pretty = safePretty(text);
  const lines = pretty.split('\n');
  const [pageW, pageH] = A4;
  const usable = pageW - MARGIN * 2;
  const size = 8.2;
  const charW = size * 0.6;
  const maxChars = Math.max(20, Math.floor(usable / charW));
  doc.setFont('courier', 'normal');
  doc.setFontSize(size);
  let y = MARGIN;
  for (const line of lines) {
    if (y + size * 1.5 > pageH - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
    for (let i = 0; i < line.length || i === 0; i += maxChars) {
      doc.text(line.slice(i, i + maxChars) || ' ', MARGIN, y);
      y += size * 1.5;
      if (y + size * 1.5 > pageH - MARGIN && i + maxChars < line.length) {
        doc.addPage();
        y = MARGIN;
      }
    }
  }
  doc.setProperties({ title, creator: 'FileMorph (local conversion)' });
  return doc;
}

function safePretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/* --------------------------------------------------------------- pdf in */

export async function extractPdfText(file: Blob, asMarkdown: boolean, emit?: Emit): Promise<string> {
  // pdf.js relies on Promise.withResolvers in recent builds.
  const P = Promise as unknown as {
    withResolvers?: () => { promise: Promise<unknown>; resolve: (v: unknown) => void; reject: (e: unknown) => void };
  };
  if (typeof P.withResolvers !== 'function') {
    P.withResolvers = function () {
      let resolve!: (v: unknown) => void;
      let reject!: (e: unknown) => void;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  emit?.(15, 'parsing pdf');
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const parts: string[] = [];

  if (asMarkdown) parts.push(`# ${(file as Blob & { name: string }).name.replace(/\.pdf$/i, '')}\n`);

  for (let p = 1; p <= doc.numPages; p++) {
    emit?.(15 + Math.round((p / doc.numPages) * 80), `extracting page ${p}/${doc.numPages}`);
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Rebuild lines: pdf.js reports each text run with its transform; items on
    // the same baseline belong to the same line.
    const runs = content.items
      .flatMap((it) => {
        const item = it as { str?: string; transform?: number[] };
        if (typeof item.str !== 'string' || !Array.isArray(item.transform)) return [];
        return [{ str: item.str, y: Math.round((item.transform[5] ?? 0) * 10) / 10 }];
      });

    const lines: string[] = [];
    let current = '';
    let lastY: number | null = null;
    for (const run of runs) {
      if (lastY !== null && Math.abs(run.y - lastY) > 2) {
        lines.push(current.trim());
        current = '';
      }
      current += (current && !current.endsWith(' ') && run.str && !run.str.startsWith(' ') ? ' ' : '') + run.str;
      lastY = run.y;
    }
    if (current.trim()) lines.push(current.trim());

    if (asMarkdown) {
      parts.push(`\n## Page ${p}\n`);
      parts.push(lines.filter(Boolean).join('\n\n'));
    } else {
      parts.push(lines.join('\n'));
    }
    parts.push('\n');
    page.cleanup();
  }

  await doc.destroy();
  emit?.(98, 'ready');
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/* --------------------------------------------------------------- driver */

export interface DocumentJob {
  file: Blob;
  ext: string;
  fileName: string;
  target: string;
}

export async function convertDocument(job: DocumentJob, emit?: Emit): Promise<OutputFile[]> {
  const stem = job.fileName.replace(/\.[^.]+$/, '') || 'converted';
  const ext = job.ext.toLowerCase();
  emit?.(10, 'reading file');

  if (ext === 'pdf') {
    if (job.target !== 'txt' && job.target !== 'md') throw new Error('That target is not available for PDF sources.');
    const text = await extractPdfText(job.file, job.target === 'md', emit);
    if (!text.trim()) {
      throw new Error('No text layer found in this PDF. Scanned documents have no embedded text \u2014 FileMorph will not fabricate one.');
    }
    return [{ name: `${stem}.${job.target}`, blob: new Blob([text], { type: 'text/plain' }) }];
  }

  const text = await job.file.text();
  emit?.(35, 'parsing structure');

  const isCsv = ext === 'csv' || ext === 'tsv';
  const isJson = ext === 'json';
  const isMd = ext === 'md' || ext === 'markdown';

  if (job.target === 'csv') {
    let csv: string;
    if (isJson) {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const records = arr.map((r) => (typeof r === 'object' && r !== null ? (r as Record<string, string>) : { value: String(r) }));
      csv = recordsToCsv(records);
    } else if (isCsv) {
      csv = text;
    } else {
      csv = text.split('\n').filter(Boolean).map((l) => `"${l.replace(/"/g, '""')}"`).join(',\n');
    }
    return [{ name: `${stem}.csv`, blob: new Blob([csv], { type: 'text/csv' }) }];
  }

  if (job.target === 'json') {
    let json: string;
    if (isCsv) json = JSON.stringify(csvToRecords(text), null, 2);
    else if (isJson) json = safePretty(text);
    else json = JSON.stringify({ content: text, lines: text.split('\n').length }, null, 2);
    return [{ name: `${stem}.json`, blob: new Blob([json], { type: 'application/json' }) }];
  }

  if (job.target === 'txt') {
    let out: string;
    if (isJson) out = safePretty(text);
    else if (isCsv) out = parseCsv(text).map((r) => r.join('\t')).join('\n');
    else if (isMd) out = parseMarkdown(text).map((b) => ('text' in b ? b.text : 'items' in b ? b.items.join('\n') : 'lines' in b ? b.lines.join('\n') : '')).join('\n\n');
    else out = text;
    return [{ name: `${stem}.txt`, blob: new Blob([out], { type: 'text/plain' }) }];
  }

  if (job.target === 'md') {
    let md: string;
    if (isCsv) {
      const rows = parseCsv(text);
      const head = rows[0] ?? [];
      md = `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n` + rows.slice(1).map((r) => `| ${r.join(' | ')} |`).join('\n');
    } else if (isJson) {
      md = `\`\`\`json\n${safePretty(text)}\n\`\`\``;
    } else md = text;
    return [{ name: `${stem}.md`, blob: new Blob([md], { type: 'text/markdown' }) }];
  }

  if (job.target === 'html') {
    emit?.(55, 'rendering document');
    let html: string;
    if (isCsv) {
      const rows = parseCsv(text);
      const table = `<table><thead><tr>${(rows[0] ?? []).map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      html = blocksToHtml(
        [
          { kind: 'h', level: 1, text: stem },
          { kind: 'p', text: `${Math.max(0, rows.length - 1)} records \u00b7 ${rows[0]?.length ?? 0} columns` },
          { kind: 'raw', html: table },
        ],
        stem
      );
    } else if (isJson) {
      html = blocksToHtml([{ kind: 'h', level: 1, text: stem }, { kind: 'code', lines: safePretty(text).split('\n') }], stem);
    } else if (isMd) {
      html = blocksToHtml(parseMarkdown(text), stem);
    } else {
      html = blocksToHtml(text.split(/\n{2,}/).map((p) => ({ kind: 'p' as const, text: p })), stem);
    }
    return [{ name: `${stem}.html`, blob: new Blob([html], { type: 'text/html' }) }];
  }

  if (job.target === 'pdf') {
    emit?.(60, 'laying out pages');
    let doc: jsPDF;
    if (isCsv) doc = tableToPdf(parseCsv(text), stem);
    else if (isJson) doc = jsonToPdf(text, stem);
    else if (isMd) doc = textToPdf(text, stem, true);
    else doc = textToPdf(text, stem, false);
    emit?.(92, 'compressing');
    const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
    return [{ name: `${stem}.pdf`, blob }];
  }

  throw new Error(`Unknown document target \u201c${job.target}\u201d.`);
}
