import { expose } from 'comlink';
import { processCss } from './logic';

// Prettier and Sass load inside this worker on first use, so the page itself never downloads them.
const api = { processCss };
export type CssApi = typeof api;
expose(api);
