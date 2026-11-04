'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { diffStats, diffTexts, unifiedPatch, type Change, type DiffMode } from './logic';

const SAMPLE = {
  a: 'Kinbench formats JSON.\nIt runs on a server.\nData is uploaded.\n',
  b: 'Kinbench formats JSON.\nIt runs in your browser.\nNothing is uploaded.\nIt works offline.\n',
};

/** Line view with old and new line numbers; each change's value may span several lines. */
function LineView({ changes }: { changes: Change[] }) {
  let oldNo = 0;
  let newNo = 0;
  const rows = changes.flatMap((c, ci) =>
    c.value.replace(/\n$/, '').split('\n').map((line, li) => {
      const o = c.added ? '' : ++oldNo;
      const n = c.removed ? '' : ++newNo;
      return (
        <div key={`${ci}-${li}`} className={cn('grid grid-cols-[2.5rem_2.5rem_1.25rem_minmax(0,1fr)]', c.added && 'bg-success/12', c.removed && 'bg-destructive/12')}>
          <span className="pr-2 text-right text-muted-foreground select-none">{o}</span>
          <span className="pr-2 text-right text-muted-foreground select-none">{n}</span>
          <span aria-hidden className={cn('select-none', c.added && 'text-success', c.removed && 'text-destructive')}>{c.added ? '+' : c.removed ? '−' : ' '}</span>
          <span className="break-all whitespace-pre-wrap">
            {c.added || c.removed ? <span className="sr-only">{c.added ? '+ ' : '− '}</span> : null}
            {line}
          </span>
        </div>
      );
    }),
  );
  return <div className="py-2 font-mono text-[13px] leading-relaxed">{rows}</div>;
}

export default function TextDiff() {
  const t = useTranslations('tools.text-diff.ui');
  const tActions = useTranslations('ui.actions');
  const [texts, setTexts, remember, setRemember] = useRememberedInput('text-diff', { a: '', b: '' });
  const [mode, setMode] = useState<DiffMode>('lines');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const { a, b } = useDeferredValue(texts);
  const changes = useMemo(() => diffTexts(a, b, mode, ignoreWhitespace), [a, b, mode, ignoreWhitespace]);
  const stats = diffStats(changes, mode);
  const patch = useMemo(() => (a || b ? unifiedPatch(a, b, ['original.txt', 'changed.txt']) : ''), [a, b]);
  const same = (a || b) && stats.added === 0 && stats.removed === 0;

  const pane = (key: 'a' | 'b', label: string) => (
    <Pane label={label} htmlFor={`diff-${key}`} className={key === 'b' ? 'max-lg:border-t' : undefined}>
      <textarea id={`diff-${key}`} value={texts[key]} onChange={(e) => setTexts({ ...texts, [key]: e.target.value })} spellCheck={false} className={cn(editorClass, 'h-[28vh] sm:h-[32vh] lg:h-[min(36vh,380px)]')} />
    </Pane>
  );

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('mode')} value={mode} onChange={setMode} options={[{ value: 'lines', label: t('lines') }, { value: 'words', label: t('words') }]} />
          <CopyButton text={patch} className="max-sm:ml-auto" />
          <DownloadButton data={patch} filename="changes.patch" type="text/x-diff" />
        </>
      }
      options={
        <>
          {mode === 'lines' && (
            <label className="inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground pointer-coarse:min-h-11">
              <input type="checkbox" checked={ignoreWhitespace} onChange={(e) => setIgnoreWhitespace(e.target.checked)} className="size-4 accent-primary" />
              {t('ignoreWhitespace')}
            </label>
          )}
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes label={tActions('resize')} left={pane('a', t('original'))} right={pane('b', t('changed'))} />
      <div className="border-t">
        <Pane
          label={t('result')}
          aside={(a || b) && (
            <span aria-live="polite" className="font-mono text-xs">
              <span className="text-success">+{stats.added}</span> <span className="text-destructive">−{stats.removed}</span>
            </span>
          )}
        >
          {!a && !b ? (
            <div className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
              {t('empty')}
              <button type="button" onClick={() => setTexts(SAMPLE)} className="rounded font-medium text-link underline underline-offset-4 hover:no-underline pointer-coarse:py-3">{t('sample')}</button>
            </div>
          ) : same ? (
            <p className="p-4 text-sm text-muted-foreground">{t('identical')}</p>
          ) : mode === 'lines' ? (
            <LineView changes={changes} />
          ) : (
            <p className="p-4 font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap">
              {changes.map((c, i) =>
                c.added ? <ins key={i} className="rounded-sm bg-success/15 text-success no-underline">{c.value}</ins>
                : c.removed ? <del key={i} className="rounded-sm bg-destructive/15 text-destructive">{c.value}</del>
                : <span key={i}>{c.value}</span>,
              )}
            </p>
          )}
        </Pane>
      </div>
    </ToolCard>
  );
}
