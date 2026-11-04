'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/DownloadButton';
import { FileDrop, usePasteFiles } from '@/components/FileDrop';
import { RangeField } from '@/components/RangeField';
import { Segmented } from '@/components/Segmented';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { useByteFormat } from '@/lib/useByteFormat';
import { useImageFile } from '@/lib/useImageFile';
import { useStyle } from '@/lib/useStyle';
import { cn } from '@/lib/utils';
import { ASPECTS, centeredCrop, clampRect, outputSize, resizeCrop, type Aspect, type Rect } from './logic';

type Format = 'png' | 'jpeg' | 'webp';
const num = cn(fieldClass, 'w-full');

export default function ImageResize() {
  const t = useTranslations('tools.image-resize.ui');
  const tActions = useTranslations('ui.actions');
  const bytes = useByteFormat();
  const { file, setFile, image, failed } = useImageFile();
  const [aspect, setAspect] = useState<Aspect>('free');
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [out, setOut] = useState({ w: 1, h: 1 });
  const [locked, setLocked] = useState(true);
  const [format, setFormat] = useState<Format>('jpeg');
  const [quality, setQuality] = useState(85);
  const [result, setResult] = useState<Blob | null>(null);
  usePasteFiles(file ? setFile : null, 'image/*'); // replaces the image while the picker is hidden
  const drag = useRef<{ mode: 'move' | 'resize'; x: number; y: number; start: Rect } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const W = image?.width ?? 1;
  const H = image?.height ?? 1;
  const box = useStyle({ left: `${(crop.x / W) * 100}%`, top: `${(crop.y / H) * 100}%`, width: `${(crop.w / W) * 100}%`, height: `${(crop.h / H) * 100}%` });

  function applyCrop(c: Rect) {
    setCrop(c);
    setOut((o) => (locked ? outputSize(c, 'w', Math.min(o.w, c.w) || c.w, 0, true) : o));
  }

  useEffect(() => {
    if (!image) return;
    const c = centeredCrop(image.width, image.height, ASPECTS[aspect]);
    setCrop(c);
    setOut({ w: c.w, h: c.h });
  }, [image, aspect]);

  useEffect(() => {
    if (!image) { setResult(null); return; }
    let stale = false;
    const id = setTimeout(async () => {
      const canvas = new OffscreenCanvas(out.w, out.h);
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      if (format === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.w, out.h); } // JPEG has no transparency
      ctx.drawImage(image.img, crop.x, crop.y, crop.w, crop.h, 0, 0, out.w, out.h);
      const blob = await canvas.convertToBlob({ type: `image/${format}`, quality: quality / 100 });
      if (!stale) setResult(blob);
    }, 250);
    return () => { stale = true; clearTimeout(id); };
  }, [image, crop, out, format, quality]);

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !frame.current) return;
    const k = W / frame.current.getBoundingClientRect().width; // screen px → image px
    const [dx, dy] = [(e.clientX - d.x) * k, (e.clientY - d.y) * k];
    applyCrop(d.mode === 'move' ? clampRect({ ...d.start, x: d.start.x + dx, y: d.start.y + dy }, W, H) : resizeCrop(d.start, d.start.w + dx, d.start.h + dy, ASPECTS[aspect], W, H));
  }
  const startDrag = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, start: crop };
  };
  const ext = format === 'jpeg' ? 'jpg' : format;

  return (
    <ToolCard
      actions={
        <>
          <DownloadButton data={result} filename={`${file?.name.replace(/\.[^.]*$/, '') ?? 'image'}-${out.w}x${out.h}.${ext}`} />
          {file && (
            <Button variant="ghost" onClick={() => setFile(null)}>
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
        </div>
      ) : failed ? (
        <p className="flex items-center gap-2 p-4 text-sm font-medium text-destructive"><CircleAlert aria-hidden className="size-4" />{t('notImage')}</p>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Pane label={t('crop')}>
            <div className="p-4">
              {image && (
                <div ref={frame} className="relative mx-auto w-fit touch-none select-none" onPointerMove={onPointerMove} onPointerUp={() => (drag.current = null)}>
                  <img src={image.url} alt={file.name} draggable={false} className="block max-h-[60vh] max-w-full" />
                  {/* Dims everything outside the crop with a huge outline. */}
                  <div ref={box} onPointerDown={startDrag('move')} className="absolute cursor-move outline-[9999px] outline-black/45 ring-2 ring-white">
                    <div aria-hidden onPointerDown={startDrag('resize')} className="absolute -right-2 -bottom-2 size-5 cursor-nwse-resize rounded-full border-2 border-white bg-primary pointer-coarse:size-8" />
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {(['x', 'y', 'w', 'h'] as const).map((k) => (
                  <label key={k} className="text-xs text-muted-foreground">
                    {t(`rect.${k}`)}
                    <input type="number" min={0} value={crop[k]} onChange={(e) => applyCrop(clampRect({ ...crop, [k]: e.target.valueAsNumber || 0 }, W, H))} className={cn(num, 'mt-1')} />
                  </label>
                ))}
              </div>
            </div>
          </Pane>
          <Pane label={t('output')} className="max-lg:border-t lg:border-l">
            <div className="space-y-4 p-4">
              <Segmented<Aspect> label={t('aspect')} showLabel value={aspect} onChange={setAspect} className="flex-wrap" options={(Object.keys(ASPECTS) as Aspect[]).map((a) => ({ value: a, label: a === 'free' ? t('free') : a }))} />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm text-muted-foreground">{t('width')}<input type="number" min={1} value={out.w} onChange={(e) => setOut(outputSize(crop, 'w', e.target.valueAsNumber, out.h, locked))} className={cn(num, 'mt-1')} /></label>
                <label className="text-sm text-muted-foreground">{t('height')}<input type="number" min={1} value={out.h} onChange={(e) => setOut(outputSize(crop, 'h', e.target.valueAsNumber, out.w, locked))} className={cn(num, 'mt-1')} /></label>
              </div>
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} className="size-4 accent-primary" />
                {t('lock')}
              </label>
              <Segmented<Format> label={t('format')} showLabel value={format} onChange={setFormat} options={(['jpeg', 'png', 'webp'] as const).map((f) => ({ value: f, label: f.toUpperCase() }))} />
              {format !== 'png' && <RangeField label={t('quality')} min={1} max={100} value={quality} onChange={setQuality} />}
              <p aria-live="polite" className="font-mono text-sm">
                {image && `${image.width}×${image.height} → ${out.w}×${out.h}`}
                {result && ` · ${bytes(result.size)}`}
              </p>
            </div>
          </Pane>
        </div>
      )}
    </ToolCard>
  );
}
