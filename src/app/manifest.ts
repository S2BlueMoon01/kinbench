import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/site';

export const dynamic = 'force-static';

// shortcut: SVG icon only; some platforms want 192/512 px PNGs to offer "Install", add them if installing matters.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND,
    short_name: BRAND,
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f6f9',
    theme_color: '#f3f6f9',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
