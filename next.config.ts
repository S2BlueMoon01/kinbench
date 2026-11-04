import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withCn } from 'cn/next';

const config: NextConfig = {
  output: 'export',
  // The static export serves public/index.html at "/", but `next dev` only serves it at "/index.html".
  ...(process.env.NODE_ENV === 'development' && { rewrites: async () => [{ source: '/', destination: '/index.html' }] }),
};

export default withCn(
  createNextIntlPlugin({ experimental: { messages: { path: './messages', locales: 'infer', format: 'json', precompile: true } } })(config),
);
