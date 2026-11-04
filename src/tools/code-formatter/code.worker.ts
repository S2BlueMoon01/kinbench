import { expose } from 'comlink';
import { formatCode } from './logic';

// Prettier and its plugins load inside this worker on first use, so the page itself never downloads them.
const api = { formatCode };
export type CodeApi = typeof api;
expose(api);
