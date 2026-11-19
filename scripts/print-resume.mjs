#!/usr/bin/env node
/**
 * 预生成 PDF 简历：用本机 Chrome 打印 /resume，产出 public/resume.pdf。
 * 失败不阻塞部署（保留上一版 PDF）——招聘方要的是"能下载"，不是"每次都重新生成"。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:3100';

mkdirSync('public', { recursive: true });

if (!existsSync('public/resume.pdf')) {
  console.log('提示：public/resume.pdf 不存在，本次将首次生成。');
}

try {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: 'public/resume.pdf',
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await browser.close();
  console.log('✓ public/resume.pdf 已生成');
} catch (error) {
  console.warn(`! PDF 生成失败（保留上一版）：${error.message}`);
  process.exit(0);
}
