#!/usr/bin/env node
/**
 * 用本机 Chrome 截图做视觉验收（不下载浏览器，走 channel: 'chrome'）。
 * 用法：node scripts/shoot.mjs [--theme dark|light] [--width 1440]
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync } from 'node:fs';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const BASE = getArg('--base', 'http://localhost:3100');
const theme = getArg('--theme', 'dark');
const width = Number(getArg('--width', 1440));
const outDir = '.shots';
mkdirSync(outDir, { recursive: true });

// 从内容目录取真实 slug，避免内容替换后截图打到 404
const firstSlug = readdirSync('content/projects')
  .filter((f) => f.endsWith('.mdx'))
  .sort()[0]
  ?.replace(/\.mdx$/, '');

const pages = [
  ['home', '/', 2600],
  ['projects', '/projects', 2200],
  ['detail', `/projects/${firstSlug}`, 3200],
  ['resume', '/resume', 2600],
  ['ask', '/ask', 1400],
];

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: theme,
});

for (const [name, path, height] of pages) {
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
  await page.waitForTimeout(350);
  await page.screenshot({
    path: `${outDir}/${name}-${theme}-${width}.png`,
    fullPage: false,
    clip: { x: 0, y: 0, width, height: Math.min(height, 4000) },
  });
  console.log(`✓ ${name} → ${outDir}/${name}-${theme}-${width}.png`);
  await page.close();
}

await browser.close();
