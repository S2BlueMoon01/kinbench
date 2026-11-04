export type PdfError = 'encrypted' | 'invalid';
export class PdfReadError extends Error {
  constructor(public code: PdfError, public file?: string) {
    super(code);
  }
}

/** pdf-lib loads on first use (in the worker). Encrypted PDFs can't be edited without their password. */
async function open(bytes: Uint8Array, name?: string) {
  const { PDFDocument } = await import('pdf-lib');
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    throw new PdfReadError(/encrypt/i.test(String(e)) ? 'encrypted' : 'invalid', name);
  }
}

export async function pageCount(bytes: Uint8Array) {
  return (await open(bytes)).getPageCount();
}

export async function mergePdfs(files: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  for (const f of files) {
    const doc = await open(f.bytes, f.name);
    for (const page of await out.copyPages(doc, doc.getPageIndices())) out.addPage(page);
  }
  return out.save();
}

/** "1-3, 5, 8-" → [[1,2,3],[5],[8..last]] (1-based). Null if any part is invalid or outside 1…pages. */
export function parseRanges(input: string, pages: number): number[][] | null {
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const ranges: number[][] = [];
  for (const part of parts) {
    const m = part.match(/^(\d+)?\s*(-)?\s*(\d+)?$/);
    if (!m || (!m[1] && !m[3])) return null;
    const from = m[1] ? Number(m[1]) : 1;
    const to = m[2] ? (m[3] ? Number(m[3]) : pages) : from;
    if (from < 1 || to > pages || from > to) return null;
    ranges.push(Array.from({ length: to - from + 1 }, (_, i) => from + i));
  }
  return ranges;
}

/** One new PDF per range. */
export async function splitPdf(bytes: Uint8Array, ranges: number[][]): Promise<Uint8Array[]> {
  const { PDFDocument } = await import('pdf-lib');
  const src = await open(bytes);
  return Promise.all(
    ranges.map(async (r) => {
      const out = await PDFDocument.create();
      for (const page of await out.copyPages(src, r.map((n) => n - 1))) out.addPage(page);
      return out.save();
    }),
  );
}
