'use client';

import type { ComponentProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink(props: ComponentProps<typeof Link> & { href: string }) {
  return <Link {...props} aria-current={usePathname() === props.href ? 'page' : undefined} />;
}
