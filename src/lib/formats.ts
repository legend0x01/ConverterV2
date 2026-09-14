/* Central format registry. Everything the UI shows about categories,
   inputs, outputs and the engine behind them is derived from here. */

export type Category = 'image' | 'document' | 'archive' | 'media';

export interface CategorySpec {
  id: Category;
  tab: string;
  title: string;
  blurb: string;
  engine: string;
  engineDetail: string;
  inputs: string[];
  outputs: string[];
  accent: string;
}

export const CATEGORIES: CategorySpec[] = [
  {
    id: 'image',
    tab: 'Images',
    title: 'Raster & vector graphics',
    blurb: 'Re-encode, downscale and transcode pixel data on an OffscreenCanvas inside a dedicated Web Worker.',
    engine: 'Canvas API · OffscreenCanvas · Web Worker',
    engineDetail: 'createImageBitmap decodes the source off the UI thread; convertToBlob performs the encode. No pixels ever leave the tab.',
    inputs: ['PNG', 'JPG', 'JPEG', 'WEBP', 'AVIF', 'GIF', 'BMP', 'SVG'],
    outputs: ['PNG', 'JPG', 'WEBP', 'AVIF', 'BMP', 'GIF', 'SVG'],
    accent: '#2fe08a',
  },
  {
    id: 'document',
    tab: 'Documents',
    title: 'Text, data & PDF',
    blurb: 'Render paginated PDFs, extract text from existing PDFs, and translate between structured data formats.',
    engine: 'jsPDF · pdf.js · local parsers',
    engineDetail: 'Text is laid out and paginated in memory; PDF text extraction runs through a locally bundled pdf.js worker.',
    inputs: ['TXT', 'MD', 'CSV', 'JSON', 'PDF', 'LOG'],
    outputs: ['PDF', 'HTML', 'TXT', 'MD', 'JSON', 'CSV'],
    accent: '#45d6e6',
  },
  {
    id: 'archive',
    tab: 'Archives',
    title: 'ZIP, TAR & GZ',
    blurb: 'Unpack, repack and recompress archives byte-for-byte locally. Never hand a third party your source tree.',
    engine: 'JSZip · fflate · native tar writer',
    engineDetail: 'Deflate/gzip come from fflate (pure JS SIMD-free inflate); tar headers are written by hand to spec.',
    inputs: ['ZIP', 'TAR', 'TGZ', 'GZ', 'RAR*', '7Z*', 'ISO*'],
    outputs: ['ZIP', 'TAR', 'GZ', 'TARGZ'],
    accent: '#ffb020',
  },
  {
    id: 'media',
    tab: 'Media',
    title: 'Audio & video',
    blurb: 'Decode audio with the browser\u2019s native codecs and re-encode locally. Snapshot or animate video frames to GIF.',
    engine: 'WebAudio · WebCodecs-free frame capture · custom GIF/LZW encoder',
    engineDetail: 'MP3 encoding uses a bundled LAME port; GIF output uses a hand-written LZW + median-cut quantiser.',
    inputs: ['MP3', 'WAV', 'OGG', 'M4A', 'AAC', 'MP4', 'WEBM', 'MOV'],
    outputs: ['WAV', 'MP3', 'GIF', 'PNG', 'JPG'],
    accent: '#b78bff',
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<Category, CategorySpec>;

/* ------------------------------------------------------------------ detection */

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function baseOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'svg'];
const DOC_EXT = ['txt', 'md', 'markdown', 'csv', 'json', 'pdf', 'log', 'tsv'];
const ARCHIVE_EXT = ['zip', 'tar', 'tgz', 'gz', 'gz2', 'rar', '7z', 'iso', 'tar.gz'];
const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'weba'];
const VIDEO_EXT = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'ogv'];

export function detectCategory(file: { name: string; type: string }): Category {
  const ext = extOf(file.name);
  const type = (file.type || '').toLowerCase();
  if (IMAGE_EXT.includes(ext) || type.startsWith('image/')) return 'image';
  if (DOC_EXT.includes(ext) || type === 'application/pdf' || type.startsWith('text/')) return 'document';
  if (ARCHIVE_EXT.includes(ext) || type === 'application/zip' || type === 'application/x-tar' || type === 'application/gzip') return 'archive';
  if (AUDIO_EXT.includes(ext) || type.startsWith('audio/')) return 'media';
  if (VIDEO_EXT.includes(ext) || type.startsWith('video/')) return 'media';
  if (type.startsWith('image/')) return 'image';
  return 'document';
}

export function mediaKind(file: { name: string; type: string }): 'audio' | 'video' {
  const ext = extOf(file.name);
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('video/') || VIDEO_EXT.includes(ext)) return 'video';
  return 'audio';
}

/* Formats that can only ever be *read* client-side. RAR/7Z/ISO are closed or
   container formats without a shipped decoder; we surface that honestly
   instead of quietly uploading them somewhere. */
export const INPUT_ONLY: Record<string, string> = {
  rar: 'RAR is a closed, proprietary format. Extracting it requires libarchive WASM under cross-origin isolation, which this static build does not ship \u2014 so FileMorph refuses the file rather than routing it to a server.',
  '7z': '7z needs a WASM decoder bundle that is not part of this build. FileMorph flags it instead of falling back to an upload.',
  iso: 'ISO 9660 images are not unpacked in-browser here. Flagged as input-only rather than uploaded.',
};

export interface TargetOption {
  value: string;
  label: string;
  hint: string;
  note?: string;
  mode?: 'convert' | 'extract';
}

export interface TargetGroup {
  label: string;
  options: TargetOption[];
}

/* Context-aware target list: valid outputs depend on the *input* format. */
export function targetsFor(category: Category, inputExt: string): TargetGroup[] {
  const ext = inputExt.toLowerCase();

  if (category === 'image') {
    return [
      {
        label: 'Lossless',
        options: [
          { value: 'png', label: 'PNG', hint: 'Lossless · transparency · largest', mode: 'convert' },
          { value: 'bmp', label: 'BMP', hint: 'Uncompressed bitmap · maximum fidelity', mode: 'convert' },
          { value: 'svg', label: 'SVG (embedded)', hint: 'Vector wrapper around an embedded raster layer', mode: 'convert' },
        ],
      },
      {
        label: 'Lossy / compressed',
        options: [
          { value: 'webp', label: 'WEBP', hint: 'Best compression · alpha supported', mode: 'convert' },
          { value: 'avif', label: 'AVIF', hint: 'Slowest encode · smallest file', note: 'Encoder availability depends on your browser build.', mode: 'convert' },
          { value: 'jpg', label: 'JPG', hint: 'Universally compatible · no alpha', mode: 'convert' },
          { value: 'gif', label: 'GIF (static)', hint: '256 colours · single frame only', mode: 'convert' },
        ],
      },
    ];
  }

  if (category === 'document') {
    const isPdf = ext === 'pdf';
    if (isPdf) {
      return [
        {
          label: 'Extract',
          options: [
            { value: 'txt', label: 'TXT', hint: 'Pull the embedded text layer out, page by page', mode: 'convert' },
            { value: 'md', label: 'MD', hint: 'Markdown with page headings', mode: 'convert' },
          ],
        },
        {
          label: 'Not available locally',
          options: [
            { value: '__recompose__', label: 'PDF \u2192 DOCX / re-OCR', hint: 'Re-flow needs an OCR engine; raster PDFs carry no text layer', note: 'Scanned PDFs have no text layer. FileMorph will not fake it.', mode: 'convert' },
          ],
        },
      ];
    }
    const canParseData = ext === 'csv' || ext === 'json' || ext === 'tsv';
    const groups: TargetGroup[] = [
      {
        label: 'Publish',
        options: [
          { value: 'pdf', label: 'PDF', hint: 'Paginated A4 document, rendered in memory', mode: 'convert' },
          { value: 'html', label: 'HTML', hint: 'Standalone styled page, no external assets', mode: 'convert' },
        ],
      },
      {
        label: 'Plain text',
        options: [
          { value: 'txt', label: 'TXT', hint: 'Flatten formatting to raw characters', mode: 'convert' },
          { value: 'md', label: 'MD', hint: 'Markdown source', mode: 'convert' },
        ],
      },
    ];
    groups.push({
      label: 'Structured data',
      options: [
        { value: 'json', label: 'JSON', hint: canParseData ? 'Parsed rows \u2192 records' : 'Split into a JSON structure', mode: 'convert' },
        { value: 'csv', label: 'CSV', hint: canParseData ? 'Records \u2192 RFC 4180 rows' : 'Line-split into one column', mode: 'convert' },
      ],
    });
    return groups;
  }

  if (category === 'archive') {
    if (INPUT_ONLY[ext]) {
      return [{
        label: 'Input-only format',
        options: [
          { value: '__blocked__', label: `${ext.toUpperCase()} \u2014 no local decoder`, hint: INPUT_ONLY[ext], note: INPUT_ONLY[ext], mode: 'convert' },
        ],
      }];
    }
    const isGzOnly = ext === 'gz';
    return [
      {
        label: 'Repack',
        options: [
          { value: 'zip', label: 'ZIP', hint: 'Deflate entries with central directory', mode: 'convert' },
          { value: 'tar', label: 'TAR', hint: 'POSIX ustar, no compression', mode: 'convert' },
          { value: 'targz', label: 'TAR.GZ', hint: 'ustar stream, gzip-deflated', mode: 'convert' },
        ],
      },
      {
        label: 'Unpack',
        options: [
          { value: 'extract', label: 'Extract contents', hint: isGzOnly ? 'Decompress the single payload file' : 'Download every member as its own file', mode: 'extract' },
        ],
      },
    ];
  }

  // media
  return [
    {
      label: 'Audio',
      options: [
        { value: 'wav', label: 'WAV (16-bit PCM)', hint: 'Decoded with native WebAudio, re-wrapped losslessly', mode: 'convert' },
        { value: 'mp3', label: 'MP3 (LAME)', hint: 'Re-encoded at 192 kbps by a bundled LAME port', mode: 'convert' },
      ],
    },
    {
      label: 'Video',
      options: [
        { value: 'gif', label: 'Animated GIF', hint: 'Frame-capture loop \u00b7 capped length \u00b7 256 colours', mode: 'convert' },
        { value: 'png', label: 'PNG frame', hint: 'Snapshot the poster frame', mode: 'convert' },
        { value: 'jpg', label: 'JPG frame', hint: 'Snapshot the poster frame, compressed', mode: 'convert' },
      ],
    },
  ];
}

export const SIZE_LIMITS: Record<Category, { warn: number; hard: number }> = {
  image: { warn: 120 * 1024 * 1024, hard: 300 * 1024 * 1024 },
  document: { warn: 80 * 1024 * 1024, hard: 200 * 1024 * 1024 },
  archive: { warn: 512 * 1024 * 1024, hard: 1024 * 1024 * 1024 },
  media: { warn: 200 * 1024 * 1024, hard: 400 * 1024 * 1024 },
};

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0 B';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}
