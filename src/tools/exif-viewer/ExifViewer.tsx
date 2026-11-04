'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, CircleCheck, Eraser, LoaderCircle, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/DownloadButton';
import { FileDrop, usePasteFiles } from '@/components/FileDrop';
import { Pane, ToolCard } from '@/components/ToolCard';
import { useByteFormat } from '@/lib/useByteFormat';
import { useImageFile } from '@/lib/useImageFile';
import { formatValue, readMetadata, stripLossless } from './logic';

type Clean = { blob: Blob; lossless: boolean; left: number };
const NORMAL_ORIENTATION = [undefined, 1, 'Horizontal (normal)'];

/** Re-encodes through a canvas, which applies the EXIF rotation to the pixels and writes no metadata at all. */
async function reencode(img: HTMLImageElement, type: string) {
  const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  const out = ['image/jpeg', 'image/png', 'image/webp'].includes(type) ? type : 'image/png';
  return canvas.convertToBlob({ type: out, quality: 0.92 });
}

export default function ExifViewer() {
  const t = useTranslations('tools.exif-viewer.ui');
  const tActions = useTranslations('ui.actions');
  const bytes = useByteFormat();
  const { file, setFile, image, failed } = useImageFile();
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [clean, setClean] = useState<Clean | null>(null);
  const [busy, setBusy] = useState(false);
  usePasteFiles(file ? setFile : null, 'image/*'); // replaces the image while the picker is hidden

  useEffect(() => {
    setMeta(null);
    setClean(null);
    if (file) readMetadata(file).then(setMeta);
  }, [file]);

  async function removeMetadata() {
    if (!file || !image || !meta) return;
    setBusy(true);
    // Lossless for JPEG/PNG, unless the photo relies on EXIF rotation, which stripping would lose.
    const raw = NORMAL_ORIENTATION.includes(meta.Orientation as never) ? stripLossless(new Uint8Array(await file.arrayBuffer()), file.type) : null;
    const blob = raw ? new Blob([raw], { type: file.type }) : await reencode(image.img, file.type);
    const left = Object.keys(await readMetadata(blob)).length; // check our own work
    setClean({ blob, lossless: !!raw, left });
    setBusy(false);
  }

  const entries = meta ? Object.entries(meta).filter(([k]) => !['latitude', 'longitude'].includes(k)) : [];
  const hasGps = typeof meta?.latitude === 'number' && typeof meta?.longitude === 'number';
  const ext = clean?.blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';

  return (
    <ToolCard
      actions={
        <>
          <Button onClick={removeMetadata} disabled={!image || !meta || busy}>
            {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Eraser />}
            {t('remove')}
          </Button>
          <DownloadButton data={clean?.blob ?? null} filename={`${file?.name.replace(/\.[^.]*$/, '') ?? 'image'}-clean.${ext}`} />
          {file && (
            <Button variant="ghost" onClick={() => setFile(null)} className="max-sm:ml-auto">
              <X />
              {tActions('clear')}
            </Button>
          )}
        </>
      }
    >
      {!file ? (
        <div className="p-4">
          <FileDrop onFile={setFile} accept="image/*" className="min-h-52 flex-col sm:min-h-64" />
          <p className="mt-3 text-center text-sm text-muted-foreground">{t('hint')}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Pane label={t('image')}>
            <div className="space-y-3 p-4">
              {image && <img src={image.url} alt={file.name} className="mx-auto max-h-72 max-w-full rounded-lg border" />}
              {failed && <p className="flex items-center gap-2 text-sm font-medium text-destructive"><CircleAlert aria-hidden className="size-4" />{t('notImage')}</p>}
              <p className="font-mono text-sm break-all">{file.name} · {bytes(file.size)}</p>
              <div aria-live="polite">
                {clean && (
                  <p className="flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-sm text-success">
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {t(clean.left === 0 ? 'cleaned' : 'cleanedPartly', { count: clean.left })} {t(clean.lossless ? 'lossless' : 'reencoded')} · {bytes(clean.blob.size)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </Pane>
          <Pane label={t('metadata', { count: entries.length })} className="max-lg:border-t lg:border-l">
            {hasGps && (
              <p role="status" className="flex items-start gap-2 border-b border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span><span className="font-medium">{t('gpsWarning')}</span> <span className="font-mono">{(meta!.latitude as number).toFixed(5)}, {(meta!.longitude as number).toFixed(5)}</span></span>
              </p>
            )}
            {meta === null ? (
              <p className="p-4 text-sm text-muted-foreground">{t('reading')}</p>
            ) : entries.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t('none')}</p>
            ) : (
              <dl className="max-h-[60vh] divide-y divide-dashed overflow-auto">
                {entries.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-4 py-1.5 text-sm">
                    <dt className="truncate text-muted-foreground" title={k}>{k}</dt>
                    <dd className="font-mono text-xs break-all">{formatValue(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Pane>
        </div>
      )}
    </ToolCard>
  );
}
