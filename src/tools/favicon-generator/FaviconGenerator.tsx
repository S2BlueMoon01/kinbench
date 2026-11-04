'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/DownloadButton';
import { FileDrop, usePasteFiles } from '@/components/FileDrop';
import { RangeField } from '@/components/RangeField';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { useImageFile, type LoadedImage } from '@/lib/useImageFile';
import { cn } from '@/lib/utils';
import { buildIco, HTML_TAGS, ICO_SIZES, manifest, placement, PNG_FILES } from './logic';

type Icon = { name: string; size: number; blob: Blob; url: string };

async function render(image: LoadedImage, size: number, padding: number, background: string | null) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, size, size); }
  ctx.imageSmoothingQuality = 'high';
  const p = placement(image.width, image.height, size, padding);
  ctx.drawImage(image.img, p.x, p.y, p.w, p.h);
  return canvas.convertToBlob({ type: 'image/png' });
}

export default function FaviconGenerator() {
  const t = useTranslations('tools.favicon-generator.ui');
  const tActions = useTranslations('ui.actions');
  const { file, setFile, image, failed } = useImageFile();
  const [padding, setPadding] = useState(0);
  const [color, setColor] = useState('#ffffff');
  const [transparent, setTransparent] = useState(true);
  const [name, setName] = useState('My site');
  const [icons, setIcons] = useState<Icon[]>([]);
  const [zip, setZip] = useState<Blob | null>(null);
  usePasteFiles(image ? setFile : null, 'image/png,image/svg+xml,image/jpeg,image/webp'); // replaces the logo while the picker is hidden

  useEffect(() => {
    if (!image) { setIcons([]); setZip(null); return; }
    let stale = false;
    const id = setTimeout(async () => {
      const bg = transparent ? null : color;
      const pngs = await Promise.all(PNG_FILES.map(async (f) => ({ ...f, blob: await render(image, f.size, padding, 'opaque' in f ? color : bg) })));
      const icoParts = await Promise.all(ICO_SIZES.map(async (size) => ({ size, png: new Uint8Array(await (await render(image, size, padding, bg)).arrayBuffer()) })));
      const ico = buildIco(icoParts);
      const { zipSync, strToU8 } = await import('fflate');
      const files: Record<string, Uint8Array> = { 'favicon.ico': ico, 'site.webmanifest': strToU8(manifest(name, color)) };
      for (const p of pngs) files[p.name] = new Uint8Array(await p.blob.arrayBuffer());
      if (image.file.type === 'image/svg+xml') files['favicon.svg'] = new Uint8Array(await image.file.arrayBuffer());
      if (stale) return;
      setIcons((old) => {
        old.forEach((i) => URL.revokeObjectURL(i.url));
        return pngs.map((p) => ({ name: p.name, size: p.size, blob: p.blob, url: URL.createObjectURL(p.blob) }));
      });
      setZip(new Blob([zipSync(files)], { type: 'application/zip' }));
    }, 250);
    return () => { stale = true; clearTimeout(id); };
  }, [image, padding, color, transparent, name]);

  return (
    <ToolCard
      actions={
        <>
          <DownloadButton data={zip} filename="favicons.zip" />
          {file && (
            <Button variant="ghost" onClick={() => setFile(null)}>
              <X />
              {tActions('clear')}
            </Button>
          )}
        </>
      }
    >
      <div className="grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Pane label={t('source')}>
          <div className="space-y-4 p-4">
            {image ? <img src={image.url} alt={image.file.name} className="mx-auto max-h-40 max-w-full rounded-lg border" /> : <FileDrop onFile={setFile} accept="image/png,image/svg+xml,image/jpeg,image/webp" className="min-h-40 flex-col" />}
            {failed && <p className="flex items-center gap-2 text-sm font-medium text-destructive"><CircleAlert aria-hidden className="size-4" />{t('notImage')}</p>}
            <p className="text-xs text-muted-foreground">{t('hint')}</p>
            <RangeField label={t('padding')} unit="%" min={0} max={30} value={padding} onChange={setPadding} />
            <label className="inline-flex min-h-11 items-center gap-2 text-sm">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-input bg-background p-1" />
              {t('background')}
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="size-4 accent-primary" />
              {t('transparent')}
            </label>
            <label className="block text-sm text-muted-foreground">
              {t('siteName')}
              <input value={name} onChange={(e) => setName(e.target.value)} className={cn(fieldClass, 'mt-1 w-full font-sans')} />
            </label>
          </div>
        </Pane>
        <Pane label={t('result')} className="max-lg:border-t lg:border-l">
          {icons.length ? (
            <>
              <ul className="flex flex-wrap items-end gap-4 p-4">
                {icons.map((i) => (
                  <li key={i.name} className="text-center">
                    <img src={i.url} alt={i.name} width={Math.min(96, i.size)} height={Math.min(96, i.size)} className="mx-auto rounded border bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-size-[12px_12px] [image-rendering:pixelated]" />
                    <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{i.size}×{i.size}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-dashed">
                <ValueRows rows={[{ label: t('tags'), value: HTML_TAGS }]} />
              </div>
              <p className="border-t border-dashed px-4 py-3 text-xs text-muted-foreground">{t('contents')}</p>
            </>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t('empty')}</p>
          )}
        </Pane>
      </div>
    </ToolCard>
  );
}
