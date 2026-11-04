'use client';

import dynamic from 'next/dynamic';
import { useEffect, type ComponentType } from 'react';
import { rememberVisit } from '@/lib/search';
import type { Slug } from './registry';

// The registry's lazy "component" field. next/dynamic in a client module gives each tool its own chunk,
// which loads (and server-renders) only on that tool's page.
const components: Record<Slug, ComponentType> = {
  'json-formatter': dynamic(() => import('./json-formatter/JsonFormatter')),
  'css-formatter': dynamic(() => import('./css-formatter/CssFormatter')),
  'image-converter': dynamic(() => import('./image-converter/ImageConverter')),
  'text-counter': dynamic(() => import('./text-counter/TextCounter')),
  base64: dynamic(() => import('./base64/Base64')),
  'jwt-decoder': dynamic(() => import('./jwt-decoder/JwtDecoder')),
  'hash-generator': dynamic(() => import('./hash-generator/HashGenerator')),
  'uuid-generator': dynamic(() => import('./uuid-generator/UuidGenerator')),
  'function-runner': dynamic(() => import('./function-runner/FunctionRunner')),
  'unix-timestamp': dynamic(() => import('./unix-timestamp/UnixTimestamp')),
  'case-converter': dynamic(() => import('./case-converter/CaseConverter')),
  'url-encoder': dynamic(() => import('./url-encoder/UrlEncoder')),
  'html-entities': dynamic(() => import('./html-entities/HtmlEntities')),
  'hmac-generator': dynamic(() => import('./hmac-generator/HmacGenerator')),
  'aes-encryption': dynamic(() => import('./aes-encryption/AesEncryption')),
  'password-generator': dynamic(() => import('./password-generator/PasswordGenerator')),
  'color-converter': dynamic(() => import('./color-converter/ColorConverter')),
  'number-base': dynamic(() => import('./number-base/NumberBase')),
  'px-rem': dynamic(() => import('./px-rem/PxRem')),
  'chmod-calculator': dynamic(() => import('./chmod-calculator/ChmodCalculator')),
  'cidr-calculator': dynamic(() => import('./cidr-calculator/CidrCalculator')),
  'text-diff': dynamic(() => import('./text-diff/TextDiff')),
  'regex-tester': dynamic(() => import('./regex-tester/RegexTester')),
  'curl-converter': dynamic(() => import('./curl-converter/CurlConverter')),
  'cron-parser': dynamic(() => import('./cron-parser/CronParser')),
  'box-shadow-generator': dynamic(() => import('./box-shadow-generator/BoxShadowGenerator')),
  'gradient-generator': dynamic(() => import('./gradient-generator/GradientGenerator')),
  'cubic-bezier': dynamic(() => import('./cubic-bezier/CubicBezier')),
  'json-converter': dynamic(() => import('./json-converter/JsonConverter')),
  'json-to-types': dynamic(() => import('./json-to-types/JsonToTypes')),
  'sql-formatter': dynamic(() => import('./sql-formatter/SqlFormatter')),
  'code-formatter': dynamic(() => import('./code-formatter/CodeFormatter')),
  'markdown-preview': dynamic(() => import('./markdown-preview/MarkdownPreview')),
  'svg-optimizer': dynamic(() => import('./svg-optimizer/SvgOptimizer')),
  'exif-viewer': dynamic(() => import('./exif-viewer/ExifViewer')),
  'image-resize': dynamic(() => import('./image-resize/ImageResize')),
  'favicon-generator': dynamic(() => import('./favicon-generator/FaviconGenerator')),
  'qr-code': dynamic(() => import('./qr-code/QrCode')),
  'pdf-tools': dynamic(() => import('./pdf-tools/PdfTools')),
  'video-to-gif': dynamic(() => import('./video-to-gif/VideoToGif')),
  'function-benchmark': dynamic(() => import('./function-benchmark/FunctionBenchmark')),
  'html-preview': dynamic(() => import('./html-preview/HtmlPreview')),
};

export function ToolComponent({ slug }: { slug: Slug }) {
  const Tool = components[slug];
  useEffect(() => rememberVisit(slug), [slug]);
  return <Tool />;
}
