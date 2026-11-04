'use client';

import { useId, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = { actions?: ReactNode; options?: ReactNode; children: ReactNode };

/** Tool frame. On phones `actions` sit in a bar fixed to the bottom of the screen and `options` collapse behind a button. */
export function ToolCard({ actions, options, children }: Props) {
  const t = useTranslations('ui.actions');
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    // No backdrop-filter here: it would make this card the containing block of the fixed mobile action bar.
    <div className="rounded-2xl border bg-card shadow-[0_1px_0_rgb(0_0_0/0.03),0_12px_32px_-16px_rgb(10_40_70/0.18)]">
      {(actions || options) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-3 py-2.5 sm:px-4">
          {actions && (
            <div data-action-bar className="flex items-center gap-2 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:border-t max-sm:bg-background/90 max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:backdrop-blur-md">
              {actions}
            </div>
          )}
          {options && actions && (
            <Button variant="ghost" size="sm" className="sm:hidden" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
              <SlidersHorizontal />
              {t('options')}
            </Button>
          )}
          {options && (
            <div id={id} className={cn('w-full flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto sm:flex sm:w-auto', open || !actions ? 'flex' : 'hidden')}>
              {options}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

const labelClass = 'font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase';

type PaneProps = { label: string; htmlFor?: string; aside?: ReactNode; className?: string; children: ReactNode };

/** One labelled pane of a tool; `htmlFor` names the field the label is for, otherwise the label is a heading. */
export function Pane({ label, htmlFor, aside, className, children }: PaneProps) {
  return (
    <section className={cn('flex min-w-0 flex-col', className)}>
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-dashed px-4">
        {htmlFor ? <label htmlFor={htmlFor} className={labelClass}>{label}</label> : <h2 className={labelClass}>{label}</h2>}
        {aside}
      </div>
      {children}
    </section>
  );
}

export const editorClass =
  'block h-[36vh] min-h-52 w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground sm:h-[44vh] lg:h-[min(60vh,640px)]';

export const fieldClass =
  'h-9 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive pointer-coarse:h-11';
