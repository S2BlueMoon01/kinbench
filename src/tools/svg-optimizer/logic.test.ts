import { describe, expect, it } from 'vitest';
import { optimizeSvg } from './logic';

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Some Editor -->
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <metadata>junk</metadata>
  <g>
    <rect x="0" y="0" width="24" height="24" fill="#FF0000"/>
  </g>
</svg>`;

describe('svg optimizer', () => {
  it('removes metadata, comments and redundant groups', async () => {
    const r = await optimizeSvg(svg, true, false);
    expect(r).toEqual({ ok: true, output: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="red" d="M0 0h24v24H0z"/></svg>' });
  });

  it('can pretty-print the result', async () => {
    const r = await optimizeSvg(svg, false, true);
    expect(r.ok && r.output).toContain('\n  <path');
  });

  it('returns empty output for empty input', async () => {
    expect(await optimizeSvg(' ', true, false)).toEqual({ ok: true, output: '' });
  });

  it('reports invalid SVG', async () => {
    expect(await optimizeSvg('<svg><g></svg>', true, false)).toMatchObject({ ok: false });
  });
});
