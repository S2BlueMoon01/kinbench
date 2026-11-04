// Set NEXT_PUBLIC_SITE_URL at build time; canonical, hreflang, sitemap and OG URLs depend on it.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kinbench.example';
export const BRAND = 'Kinbench';
