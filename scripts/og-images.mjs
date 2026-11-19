#!/usr/bin/env node
/**
 * 生成分享卡 PNG：把 /og/<slug> 页面按 1200×630 截图存到 public/og/。
 * 需要服务已启动（先 pnpm build && pnpm start）。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync } from 'node:fs';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:3100';

const slugs = ['home'];
for (const file of readdirSync('content/projects').filter((f) => f.endsWith('.mdx'))) {
  slugs.push(file.replace(/\.mdx$/, ''));
}

mkdirSync('public/og', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
});

for (const slug of slugs) {
  await page.goto(`${BASE}/og/${slug}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `public/og/${slug}.png` });
  console.log(`✓ public/og/${slug}.png`);
}

await browser.close();
