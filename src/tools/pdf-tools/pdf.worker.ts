import { expose } from 'comlink';
import { mergePdfs, pageCount, PdfReadError, splitPdf, type PdfError } from './logic';

export type Result<T> = { ok: true; value: T } | { ok: false; code: PdfError; file?: string };

/** Comlink drops custom fields from thrown errors, so failures come back as values. */
async function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return e instanceof PdfReadError ? { ok: false, code: e.code, file: e.file } : { ok: false, code: 'invalid' };
  }
}

const api = {
  pageCount: (bytes: Uint8Array) => safe(() => pageCount(bytes)),
  merge: (files: { name: string; bytes: Uint8Array }[]) => safe(() => mergePdfs(files)),
  split: (bytes: Uint8Array, ranges: number[][]) => safe(() => splitPdf(bytes, ranges)),
};

export type PdfApi = typeof api;
expose(api);
