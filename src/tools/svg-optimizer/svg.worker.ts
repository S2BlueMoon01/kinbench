import { expose } from 'comlink';
import { optimizeSvg } from './logic';

// SVGO loads inside this worker on first use; large files never block the page.
const api = { optimizeSvg };
export type SvgApi = typeof api;
expose(api);
