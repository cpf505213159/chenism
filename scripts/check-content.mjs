#!/usr/bin/env node
/**
 * 内容体检：在 CI 里跑，把"上线前人工检查"变成机器检查。
 * 注意：zod 的强校验在构建期（src/lib/content/schema.ts）执行，
 * 这里只做构建能过、但内容质量不过关的检查，以及跨文件的一致性检查。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const DIR = 'content/projects';
const REQUIRED = [
  'title',
  'slug',
  'summary',
  'role',
  'period',
  'stack',
  'status',
  'updatedAt',
];
const VAGUE = /显著|大幅|明显|很多|若干|极大|一定程度上|有效地/;

const errors = [];
const warnings = [];

if (!existsSync(DIR)) {
  console.error(`找不到 ${DIR}`);
  process.exit(1);
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.mdx'));
if (files.length === 0) errors.push('content/projects 下没有任何 .mdx');

const slugs = new Map();
let featured = 0;

for (const file of files) {
  const path = join(DIR, file);
  const raw = readFileSync(path, 'utf8');
  const { data, content } = matter(raw);
  const filename = file.replace(/\.mdx$/, '');

  for (const key of REQUIRED) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      errors.push(`${file}：缺少必填字段 ${key}`);
    }
  }

  if (data.slug && data.slug !== filename) {
    errors.push(`${file}：slug「${data.slug}」与文件名不一致`);
  }
  if (slugs.has(data.slug)) {
    errors.push(`${file}：slug「${data.slug}」与 ${slugs.get(data.slug)} 重复`);
  } else {
    slugs.set(data.slug, file);
  }

  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push(`${file}：slug 只能是小写字母、数字与连字符`);
  }

  if (data.featured === true) featured += 1;

  if (data.draft === true) {
    warnings.push(`${file}：draft: true，生产构建不会包含它（确认不是漏删）`);
  }

  const metrics = data.metrics ?? [];
  if (metrics.length === 0) {
    warnings.push(`${file}：没有 metrics，详情页会显示"尚未补充可量化结果"`);
  } else {
    const noBaseline = metrics.filter((m) => !m.baseline).length;
    if (noBaseline * 2 > metrics.length) {
      warnings.push(
        `${file}：${noBaseline}/${metrics.length} 条指标没有基线，招聘方无法判断改善幅度`,
      );
    }
    for (const m of metrics) {
      if (!m.label || !m.value || !m.method) {
        errors.push(`${file}：指标「${m.label ?? '?'}」缺少 label / value / method`);
      }
      if (m.value && VAGUE.test(String(m.value))) {
        errors.push(`${file}：指标「${m.label}」的值「${m.value}」使用了模糊词，必须是数字或可观察变化`);
      }
    }
  }

  if (data.title && String(data.title).length > 16) {
    warnings.push(`${file}：title 超过 16 字，分享卡会降字号`);
  }
  if (!data.ogTagline) {
    warnings.push(`${file}：没有 ogTagline，分享卡第 2 行会回落 summary`);
  }
  if (!data.repoUrl && !data.demoUrl) {
    warnings.push(`${file}：既无 repoUrl 也无 demoUrl，访客无处可去看真东西`);
  }

  // 死链检查：只校验站内相对链接与 obvious typos，不发网络请求
  const internalLinks = [...content.matchAll(/\]\((\/[^)\s]+)\)/g)].map((m) => m[1]);
  for (const link of internalLinks) {
    if (link.startsWith('/projects/')) {
      const target = link.replace('/projects/', '').split('#')[0];
      if (!files.some((f) => f === `${target}.mdx`)) {
        errors.push(`${file}：正文里的站内链接 ${link} 指向不存在的项目`);
      }
    }
  }

  // 图片体积（若将来加了真实截图）
  if (data.cover?.src?.startsWith('/')) {
    const imgPath = `public${data.cover.src}`;
    if (existsSync(imgPath)) {
      const kb = statSync(imgPath).size / 1024;
      if (kb > 150) errors.push(`${file}：封面 ${imgPath} 为 ${kb.toFixed(0)}KB，超过 150KB 预算`);
    }
  }
}

if (featured > 3) {
  errors.push(`featured 项目有 ${featured} 个，首页精选最多 3 个`);
}

console.log(`检查 ${files.length} 个项目文件`);
if (warnings.length) {
  console.log(`\n警告 ${warnings.length} 条：`);
  for (const w of warnings) console.log(`  · ${w}`);
}
if (errors.length) {
  console.log(`\n错误 ${errors.length} 条：`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\n✓ 内容检查通过');
