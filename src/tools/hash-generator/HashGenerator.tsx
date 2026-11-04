'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { proxy } from 'comlink';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileDrop } from '@/components/FileDrop';
import { RememberToggle } from '@/components/RememberToggle';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { useByteFormat } from '@/lib/useByteFormat';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { useWorker } from '@/lib/useWorker';
import { algorithms, type Hashes } from './logic';
import type { HashApi } from './hash.worker';
import { cn } from '@/lib/utils';

export default function HashGenerator() {
  const t = useTranslations('tools.hash-generator.ui');
  const tActions = useTranslations('ui.actions');
  const bytes = useByteFormat();
  const [text, setText, remember, setRemember] = useRememberedInput('hash-generator', '');
  const [file, setFile] = useState<File | null>(null);
  const [hashes, setHashes] = useState<Hashes | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const api = useWorker<HashApi>(() => new Worker(new URL('./hash.worker.ts', import.meta.url), { type: 'module' }));
  const run = useRef(0);

  useEffect(() => {
    const id = ++run.current;
    const current = () => id === run.current;
    setFailed(false);
    if (!file && !text) { setHashes(null); setProgress(null); return; }
    const timer = setTimeout(async () => {
      try {
        if (file) setProgress(0);
        const result = file
          ? await api().hashFile(file, proxy((p: number) => current() && setProgress(p)))
          : await api().hashText(text);
        if (current()) { setHashes(result); setProgress(null); }
      } catch {
        if (current()) { setFailed(true); setProgress(null); }
      }
    }, file ? 0 : 150);
    return () => clearTimeout(timer);
  }, [file, text]);

  return (
    <ToolCard options={<RememberToggle checked={remember} onChange={setRemember} />}>
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('input')}
            htmlFor={file ? undefined : 'hash-input'}
            aside={(text || file) && (
              <Button variant="ghost" size="xs" onClick={() => { setText(''); setFile(null); }}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            {file ? (
              <div className="flex h-[36vh] min-h-52 flex-col items-center justify-center gap-2 p-4 text-center sm:h-[44vh] lg:h-[min(50vh,520px)]">
                <FileText aria-hidden className="size-8 text-muted-foreground" />
                <p className="font-medium break-all">{file.name}</p>
                <p className="font-mono text-sm text-muted-foreground">{bytes(file.size)}</p>
              </div>
            ) : (
              <textarea
                id="hash-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('placeholder')}
                spellCheck={false}
                className={cn(editorClass, 'lg:h-[min(50vh,520px)]')}
              />
            )}
            <div className="border-t border-dashed p-3">
              <FileDrop onFile={setFile} />
            </div>
          </Pane>
        }
        right={
          <Pane label={t('output')} className="max-lg:border-t" aside={file && <span className="font-mono text-xs text-muted-foreground">{t('ofFile')}</span>}>
            <div aria-live="polite">
              {progress !== null && (
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">{t('hashing', { percent: Math.round(progress * 100) })}</p>
                  <progress max={1} value={progress} aria-label={t('progress')} className="mt-2 h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary" />
                </div>
              )}
              {failed && <p className="px-4 py-3 text-sm text-destructive">{t('failed')}</p>}
            </div>
            {hashes && progress === null ? (
              <ValueRows rows={(Object.keys(algorithms) as (keyof Hashes)[]).map((k) => ({ label: algorithms[k], value: hashes[k] }))} />
            ) : (
              progress === null && !failed && <p className="p-4 text-sm text-muted-foreground">{t('empty')}</p>
            )}
          </Pane>
        }
      />
    </ToolCard>
  );
}
