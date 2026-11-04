'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, LoaderCircle, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { cn } from '@/lib/utils';
import { decrypt, encrypt } from './logic';

type Mode = 'encrypt' | 'decrypt';

// No "remember input": keeping the plaintext in localStorage would defeat encrypting it.
export default function AesEncryption() {
  const t = useTranslations('tools.aes-encryption.ui');
  const tActions = useTranslations('ui.actions');
  const [mode, setMode] = useState<Mode>('encrypt');
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [output, setOutput] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');

  async function run() {
    setState('busy');
    const result = mode === 'encrypt' ? await encrypt(input, password) : await decrypt(input, password);
    setOutput(result ?? '');
    setState(result === null ? 'failed' : 'idle');
  }

  const reset = (fn: () => void) => { fn(); setOutput(''); setState('idle'); };
  const canRun = state !== 'busy' && password !== '' && (mode === 'encrypt' || input.trim() !== '');

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('mode')} value={mode} onChange={(m) => reset(() => setMode(m))} options={[{ value: 'encrypt', label: t('encrypt') }, { value: 'decrypt', label: t('decrypt') }]} />
          <Button onClick={run} disabled={!canRun}>
            {state === 'busy' ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : mode === 'encrypt' ? <LockKeyhole /> : <LockKeyholeOpen />}
            <span className="max-sm:sr-only">{t(state === 'busy' ? 'working' : mode)}</span>
          </Button>
          <CopyButton text={output} className="max-sm:ml-auto" />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane label={t(mode === 'encrypt' ? 'plaintext' : 'ciphertext')} htmlFor="aes-input">
            <textarea id="aes-input" value={input} onChange={(e) => reset(() => setInput(e.target.value))} placeholder={t(mode === 'encrypt' ? 'plainPlaceholder' : 'cipherPlaceholder')} spellCheck={false} className={cn(editorClass, 'lg:h-[min(44vh,460px)]')} />
            <div className="space-y-2 border-t border-dashed p-4">
              <label htmlFor="aes-password" className="text-sm text-muted-foreground">{t('password')}</label>
              <input id="aes-password" type="password" value={password} onChange={(e) => reset(() => setPassword(e.target.value))} autoComplete="off" className={cn(fieldClass, 'w-full text-base')} />
              <p className="text-xs text-muted-foreground">{t('passwordNote')}</p>
            </div>
          </Pane>
        }
        right={
          <Pane label={t(mode === 'encrypt' ? 'ciphertext' : 'plaintext')} htmlFor="aes-output" className="max-lg:border-t">
            <textarea id="aes-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'lg:h-[min(44vh,460px)]', mode === 'encrypt' && 'break-all')} />
            <div aria-live="polite">
              {state === 'failed' && (
                <p className="flex items-center gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm font-medium text-destructive">
                  <CircleAlert aria-hidden className="size-4 shrink-0" />
                  {t('decryptFailed')}
                </p>
              )}
            </div>
            <p className="border-t border-dashed px-4 py-3 text-xs text-muted-foreground">{t('format')}</p>
          </Pane>
        }
      />
    </ToolCard>
  );
}
