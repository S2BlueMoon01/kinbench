import { expose } from 'comlink';
import { fileChunks, hashChunks, hashText } from './logic';

const api = {
  hashText,
  hashFile: (file: Blob, onProgress: (done: number) => void) => hashChunks(fileChunks(file, onProgress)),
};

export type HashApi = typeof api;
expose(api);
