'use client';

import { useRef, type ReactNode } from 'react';

type Props = { labels: Record<'openMenu' | 'close' | 'tools', string>; icons: { menu: ReactNode; close: ReactNode }; footer: ReactNode; children: ReactNode };
const iconButton = 'grid size-11 place-items-center rounded-lg hover:bg-muted [&_svg]:size-5';

/**
 * Native <dialog>: showModal() gives focus trapping, Esc to close and an inert background
 * without shipping a dialog library on every page. Icons and footer are rendered by the server.
 */
export function NavDrawer({ labels, icons, footer, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" className={`${iconButton} -ml-2 lg:hidden`} aria-label={labels.openMenu} aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        {icons.menu}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="nav-drawer-title"
        // Click on the backdrop (the dialog box itself, outside the panel) or on any link closes it.
        onClick={(e) => (e.target === e.currentTarget || (e.target as HTMLElement).closest('a')) && close()}
        className="drawer fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none border-r bg-popover p-0 text-popover-foreground shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-xs lg:hidden"
      >
        <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
          <div className="flex items-center justify-between py-2 pr-2 pl-5">
            <h2 id="nav-drawer-title" className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{labels.tools}</h2>
            <button type="button" className={iconButton} onClick={close} aria-label={labels.close}>
              {icons.close}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">{children}</div>
          <div className="border-t p-4 sm:hidden">{footer}</div>
        </div>
      </dialog>
    </>
  );
}
