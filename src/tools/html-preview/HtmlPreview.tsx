'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RememberToggle } from '@/components/RememberToggle';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';

const SAMPLE = `<!doctype html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #1e293b; }
    .card { max-width: 28rem; padding: 1.25rem 1.5rem; border-radius: 16px; background: linear-gradient(135deg, #e0f2fe, #ede9fe); }
    h1 { margin: 0 0 .5rem; }
    button { padding: .5rem 1rem; border: 0; border-radius: 8px; background: #0284c7; color: white; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Xin chào 👋</h1>
    <p>This page is rendered <strong>in your browser</strong>. Nothing is uploaded.</p>
    <button>Button</button>
  </div>
</body>
</html>
`;

export default function HtmlPreview() {
  const t = useTranslations('tools.html-preview.ui');
  const tActions = useTranslations('ui.actions');
  const [input, setInput, remember, setRemember] = useRememberedInput('html-preview', '');
  const frame = useRef<HTMLIFrameElement>(null);
  // The sandboxed frame has an opaque origin, which no target origin but '*' can name. It loads only our own
  // /html-preview.html and cannot navigate away (see that file), so the HTML goes nowhere else.
  useEffect(() => frame.current?.contentWindow?.postMessage(input, '*'), [input]);

  return (
    <ToolCard options={<RememberToggle checked={remember} onChange={setRemember} />}>
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label="HTML"
            htmlFor="html-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <div className="relative">
              <textarea id="html-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('placeholder')} spellCheck={false} className={editorClass} />
              {!input && (
                <Button variant="secondary" size="sm" className="absolute bottom-4 left-4" onClick={() => setInput(SAMPLE)}>
                  {t('sample')}
                </Button>
              )}
            </div>
          </Pane>
        }
        right={
          <Pane label={t('preview')} className="max-lg:border-t">
            {/* allow-scripts only for the frame's own receiver script: its CSP blocks every other script. */}
            <iframe
              ref={frame}
              src="/html-preview.html"
              sandbox="allow-scripts"
              title={t('preview')}
              hidden={!input}
              onLoad={(e) => e.currentTarget.contentWindow?.postMessage(input, '*')}
              className="h-[36vh] min-h-52 w-full bg-white sm:h-[44vh] lg:h-[min(60vh,640px)]"
            />
            {!input && <p className="h-[36vh] min-h-52 p-4 text-sm text-muted-foreground sm:h-[44vh] lg:h-[min(60vh,640px)]">{t('empty')}</p>}
            <p className="border-t border-dashed px-4 py-3 text-xs text-muted-foreground">{t('note')}</p>
          </Pane>
        }
      />
    </ToolCard>
  );
}
