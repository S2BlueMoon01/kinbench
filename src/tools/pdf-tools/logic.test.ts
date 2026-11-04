import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { mergePdfs, pageCount, parseRanges, PdfReadError, splitPdf } from './logic';

async function pdf(pages: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([100 + i, 100]); // widths tell the pages apart
  return doc.save();
}
const widths = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPages().map((p) => p.getWidth());

describe('pdf tools', () => {
  it('merges files in order', async () => {
    const merged = await mergePdfs([{ name: 'a', bytes: await pdf(2) }, { name: 'b', bytes: await pdf(3) }]);
    expect(await widths(merged)).toEqual([100, 101, 100, 101, 102]);
  });

  it('splits by page ranges', async () => {
    const src = await pdf(10);
    expect(await pageCount(src)).toBe(10);
    const parts = await splitPdf(src, parseRanges('1-3, 5, 9-', 10)!);
    expect(await Promise.all(parts.map(widths))).toEqual([[100, 101, 102], [104], [108, 109]]);
  });

  it('parses ranges, including open ones', () => {
    expect(parseRanges('2, 4-5, -2, 9-', 10)).toEqual([[2], [4, 5], [1, 2], [9, 10]]);
  });

  it('rejects empty and invalid ranges', () => {
    expect(parseRanges('', 5)).toBeNull();
    expect(parseRanges('0', 5)).toBeNull();
    expect(parseRanges('3-2', 5)).toBeNull();
    expect(parseRanges('1-9', 5)).toBeNull();
    expect(parseRanges('a', 5)).toBeNull();
  });

  it('reports files that are not PDFs', async () => {
    await expect(mergePdfs([{ name: 'x.pdf', bytes: new TextEncoder().encode('not a pdf') }])).rejects.toMatchObject({ code: 'invalid', file: 'x.pdf' });
    await expect(pageCount(new Uint8Array())).rejects.toBeInstanceOf(PdfReadError);
  });
});
