export type SvgResult = { ok: true; output: string } | { ok: false; message: string };

/** SVGO with its default preset, imported on first use (in the worker). */
export async function optimizeSvg(svg: string, multipass: boolean, pretty: boolean): Promise<SvgResult> {
  if (!svg.trim()) return { ok: true, output: '' };
  const { optimize } = await import('svgo/browser');
  try {
    const { data } = optimize(svg, { multipass, js2svg: { pretty, indent: 2 }, plugins: ['preset-default'] });
    return { ok: true, output: data };
  } catch (e) {
    return { ok: false, message: (e as Error).message.split('\n')[0] };
  }
}
