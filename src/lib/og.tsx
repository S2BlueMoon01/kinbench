import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND } from './site';

// Build time only. Satori can't read WOFF2 (what next/font ships), so the WOFF files come from @fontsource.
// Each subset gets its own family name: Satori keeps only one font per name/weight/style, so a shared name
// dropped the Vietnamese file and "Đếm" fell back to a different font. fontFamily below lists both.
const fonts = Promise.all(
  (['latin', 'vietnamese'] as const).map(async (subset) => ({
    name: `BVP ${subset}`,
    data: await readFile(join(process.cwd(), `node_modules/@fontsource/be-vietnam-pro/files/be-vietnam-pro-${subset}-600-normal.woff`)),
    weight: 600 as const,
    style: 'normal' as const,
  })),
);

export const ogSize = { width: 1200, height: 630 };

/** The shared Open Graph card: brand, an eyebrow line, a big title and the "local only" badge. */
export async function ogImage({ eyebrow, title, badge }: { eyebrow: string; title: string; badge: string }) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#f3f6f9', color: '#131820', fontFamily: 'BVP latin, BVP vietnamese', fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 36, fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 16, background: '#7cc8f8', color: '#0b1a2a', fontSize: 30 }}>k/</div>
          {BRAND}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 30, color: '#0a64a0', textTransform: 'uppercase', letterSpacing: 3 }}>{eyebrow}</div>
          <div style={{ display: 'flex', fontSize: title.length > 28 ? 68 : 84, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1.5 }}>{title}</div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 26px', borderRadius: 999, border: '2px solid #17744a', color: '#17744a', background: '#ffffff', fontSize: 30, fontWeight: 600 }}>
            <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 999, background: '#17744a' }} />
            {badge}
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts: await fonts },
  );
}
