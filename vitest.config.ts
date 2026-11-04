import { defineConfig } from 'vitest/config';

// Playwright specs live in e2e/*.spec.ts; keep Vitest to unit tests only.
export default defineConfig({ test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] } });
