'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { FileDrop } from '@/components/FileDrop';
import { RangeField } from '@/components/RangeField';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useImageFile } from '@/lib/useImageFile';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { decodeQr, qrMatrix, qrSvg, type Ecc, type QrOptions } from './logic';

/** PNG at `size` px, drawn module by module so it stays sharp. */
async function qrPng(text: string, o: QrOptions, size: number) {
  const m = qrMatrix(text, o);
  const scale = Math.max(1, Math.floor(size / m.length));
  const canvas = new OffscreenCanvas(m.length * scale, m.length * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = o.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = o.fg;
  m.forEach((row, y) => row.forEach((dark, x) => dark && ctx.fillRect(x * scale, y * scale, scale, scale)));
  return canvas.convertToBlob({ type: 'image/png' });
}

function Reader() {
  const t = useTranslations('tools.qr-code.ui');
  const { setFile, image, failed } = useImageFile();
  const [result, setResult] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setResult(undefined);
    if (!image) return;
    const max = 1600; // large photos are scaled down; QR codes stay readable
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = new OffscreenCanvas(Math.round(image.width * scale), Math.round(image.height * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(image.img, 0, 0, canvas.width, canvas.height);
    decodeQr(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height).then(setResult);
  }, [image]);

  return (
    <div className="grid lg:grid-cols-2">
      <Pane label={t('image')}>
        <div className="space-y-3 p-4">
          <FileDrop onFile={setFile} accept="image/*" />
          {image && <img src={image.url} alt={t('image')} className="mx-auto max-h-64 max-w-full rounded-lg border" />}
        </div>
      </Pane>
      <Pane label={t('decoded')} className="max-lg:border-t lg:border-l" aside={result ? <CopyButton iconOnly text={result} label={t('decoded')} /> : undefined}>
        <div aria-live="polite" className="p-4 text-sm">
          {failed ? (
            <p className="flex items-center gap-2 font-medium text-destructive"><CircleAlert aria-hidden className="size-4" />{t('notImage')}</p>
          ) : result === null ? (
            <p className="flex items-center gap-2 font-medium text-destructive"><CircleAlert aria-hidden className="size-4" />{t('notFound')}</p>
          ) : result ? (
            <p id="qr-result" className="font-mono break-all whitespace-pre-wrap">{result}</p>
          ) : image ? (
            <p className="flex items-center gap-2 text-muted-foreground"><LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />{t('reading')}</p>
          ) : (
            <p className="text-muted-foreground">{t('readHint')}</p>
          )}
        </div>
      </Pane>
    </div>
  );
}

export default function QrCode() {
  const t = useTranslations('tools.qr-code.ui');
  const tActions = useTranslations('ui.actions');
  const [mode, setMode] = useState<'create' | 'read'>('create');
  const [text, setText, remember, setRemember] = useRememberedInput('qr-code', '');
  const [o, setO] = useState<QrOptions>({ ecc: 'M', margin: 4, fg: '#0b1a2a', bg: '#ffffff' });
  const [size, setSize] = useState(512);
  const [png, setPng] = useState<Blob | null>(null);
  const svg = useMemo(() => (text ? qrSvg(text, o) : ''), [text, o]);
  const svgUrl = useMemo(() => (svg ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })) : null), [svg]);
  useEffect(() => () => { if (svgUrl) URL.revokeObjectURL(svgUrl); }, [svgUrl]);

  useEffect(() => {
    if (!text) { setPng(null); return; }
    let stale = false;
    qrPng(text, o, size).then((b) => !stale && setPng(b));
    return () => { stale = true; };
  }, [text, o, size]);

  const color = (key: 'fg' | 'bg') => (
    <label className="inline-flex min-h-11 items-center gap-2 text-sm">
      <input type="color" value={o[key]} onChange={(e) => setO({ ...o, [key]: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-input bg-background p-1" />
      {t(key)}
    </label>
  );

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('mode')} value={mode} onChange={setMode} options={[{ value: 'create', label: t('create') }, { value: 'read', label: t('read') }]} />
          {mode === 'create' && (
            <>
              <DownloadButton data={png} filename="qr-code.png" className="max-sm:ml-auto" />
              <DownloadButton data={svg} filename="qr-code.svg" type="image/svg+xml" className="max-sm:hidden" />
            </>
          )}
        </>
      }
      options={mode === 'create' ? <RememberToggle checked={remember} onChange={setRemember} /> : undefined}
    >
      {mode === 'read' ? (
        <Reader />
      ) : (
        <SplitPanes
          label={tActions('resize')}
          left={
            <Pane label={t('content')} htmlFor="qr-text">
              <textarea id="qr-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('placeholder')} spellCheck={false} className={cn(editorClass, 'h-[24vh] sm:h-[28vh] lg:h-[min(28vh,300px)]')} />
              <div className="space-y-4 border-t border-dashed p-4">
                <Segmented<Ecc> label={t('ecc')} showLabel value={o.ecc} onChange={(ecc) => setO({ ...o, ecc })} options={(['L', 'M', 'Q', 'H'] as const).map((e) => ({ value: e, label: e }))} />
                <RangeField label={t('margin')} min={0} max={8} value={o.margin} onChange={(margin) => setO({ ...o, margin })} />
                <RangeField label={t('size')} unit="px" min={128} max={2048} step={32} value={size} onChange={setSize} />
                <div className="flex flex-wrap gap-x-5">{color('fg')}{color('bg')}</div>
              </div>
            </Pane>
          }
          right={
            <Pane label={t('preview')} className="max-lg:border-t">
              <div className="grid min-h-64 place-items-center p-6">
                {svgUrl ? <img src={svgUrl} alt={t('qrAlt', { text: text.slice(0, 60) })} className="w-full max-w-72 rounded-lg" /> : <p className="text-sm text-muted-foreground">{t('empty')}</p>}
              </div>
            </Pane>
          }
        />
      )}
    </ToolCard>
  );
}
