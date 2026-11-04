'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { FileDrop } from '@/components/FileDrop';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useByteFormat } from '@/lib/useByteFormat';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { bytesToBase64, decodeBase64, encodeText } from './logic';

type Mode = 'encode' | 'decode';
// A textarea holding tens of MB freezes the page; the full result is still copied and downloaded.
const PREVIEW_LIMIT = 200_000;

export default function Base64() {
  const t = useTranslations('tools.base64.ui');
  const tActions = useTranslations('ui.actions');
  const bytes = useByteFormat();
  const [text, setText, remember, setRemember] = useRememberedInput('base64', '');
  const [mode, setMode] = useState<Mode>('encode');
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [fileError, setFileError] = useState(false);
  const input = useDeferredValue(text);

  const result = useMemo(() => {
    if (mode === 'encode') return { ok: true as const, output: file ? bytesToBase64(file.bytes) : encodeText(input), data: null };
    const decoded = decodeBase64(input);
    return decoded.ok ? { ok: true as const, output: decoded.text ?? '', data: decoded.bytes } : { ok: false as const, output: '', data: null };
  }, [mode, file, input]);

  async function onFile(f: File) {
    try {
      if (mode === 'encode') setFile({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
      else setText(await f.text());
      setFileError(false);
    } catch {
      setFileError(true);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setFile(null);
  }

  const binary = mode === 'decode' && result.data && result.data.length > 0 && !result.output;
  const preview = result.output.length > PREVIEW_LIMIT ? result.output.slice(0, PREVIEW_LIMIT) : result.output;

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('mode')} value={mode} onChange={switchMode} options={[{ value: 'encode', label: t('encode') }, { value: 'decode', label: t('decode') }]} />
          <CopyButton text={result.output} className="max-sm:ml-auto" />
          {mode === 'encode'
            ? <DownloadButton data={result.output} filename={file ? `${file.name}.b64.txt` : 'base64.txt'} type="text/plain" />
            : <DownloadButton data={result.data} filename={binary ? 'decoded.bin' : 'decoded.txt'} type={binary ? 'application/octet-stream' : 'text/plain'} />}
        </>
      }
      options={<RememberToggle checked={remember} onChange={setRemember} />}
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('input')}
            htmlFor={file ? undefined : 'b64-input'}
            aside={(text || file) && (
              <Button variant="ghost" size="xs" onClick={() => { setText(''); setFile(null); }}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            {file ? (
              <div className="flex h-[36vh] min-h-52 flex-col items-center justify-center gap-2 p-4 text-center sm:h-[44vh] lg:h-[min(60vh,640px)]">
                <FileText aria-hidden className="size-8 text-muted-foreground" />
                <p className="font-medium break-all">{file.name}</p>
                <p className="font-mono text-sm text-muted-foreground">{bytes(file.bytes.length)}</p>
              </div>
            ) : (
              <textarea
                id="b64-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t(mode === 'encode' ? 'encodePlaceholder' : 'decodePlaceholder')}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                aria-invalid={!result.ok}
                aria-describedby={result.ok ? undefined : 'b64-error'}
                className={editorClass}
              />
            )}
            <div className="border-t border-dashed p-3">
              <FileDrop onFile={onFile} />
            </div>
            <div aria-live="polite">
              {!result.ok && (
                <p id="b64-error" className="flex items-center gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm font-medium text-destructive">
                  <CircleAlert aria-hidden className="size-4 shrink-0" />
                  {t('invalid')}
                </p>
              )}
              {fileError && <p className="border-t px-4 py-2.5 text-sm text-destructive">{t('fileError')}</p>}
            </div>
          </Pane>
        }
        right={
          <Pane
            label={t('output')}
            htmlFor="b64-output"
            className="max-lg:border-t"
            aside={(result.output || binary) && (
              <span className="font-mono text-xs text-muted-foreground">{/* Base64 is ASCII, so its length is its size; decoded output is measured in bytes. */}
                {bytes(result.data ? result.data.length : result.output.length)}</span>
            )}
          >
            <textarea
              id="b64-output"
              readOnly
              value={preview}
              placeholder={binary ? t('binary') : t('outputPlaceholder')}
              spellCheck={false}
              className={cn(editorClass, 'text-foreground/90', mode === 'encode' && 'break-all')}
            />
            {preview !== result.output && <p className="border-t px-4 py-2.5 text-sm text-muted-foreground">{t('truncated', { count: PREVIEW_LIMIT })}</p>}
          </Pane>
        }
      />
    </ToolCard>
  );
}
