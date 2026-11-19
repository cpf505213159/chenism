import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  auditProject,
  projectFrontmatterSchema,
  type Metric,
  type ProjectFrontmatter,
} from './schema';
import { readingMinutes } from '@/lib/utils/format';
import { getRepoStat, type RepoStat } from '@/lib/github/readCache';

export type Project = ProjectFrontmatter & {
  body: string;
  readMinutes: number;
  warnings: string[];
  repo: RepoStat;
};

const CONTENT_DIR = path.join(process.cwd(), 'content', 'projects');

let cache: Project[] | null = null;

/** 后台写入后调用：丢掉项目缓存，下次请求重新读文件 */
export function invalidateProjectCache() {
  cache = null;
}

function fail(file: string, details: string): never {
  throw new Error(
    `\n[content] ${file} 的 front matter 校验失败：\n${details}\n` +
      `请运行 pnpm check:content 查看全部问题。\n`,
  );
}

/**
 * YAML 会把 `2026-11-01` 解析成 Date、把 `0.78` 解析成 number。
 * 在读取层统一规整，作者不必记得加引号。
 */
function normalizeDates<T>(input: T): T {
  if (input instanceof Date) {
    return input.toISOString().slice(0, 10) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => normalizeDates(item)) as unknown as T;
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = normalizeDates(value);
    }
    return out as T;
  }
  return input;
}

function loadFile(file: string): Project {
  const fullPath = path.join(CONTENT_DIR, file);
  const filename = file.replace(/\.mdx?$/, '');
  const raw = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(raw);

  const normalized = normalizeDates(data) as Record<string, unknown>;

  // metrics 里的 value / baseline 允许写裸数字（0.78、3），统一转成字符串
  if (Array.isArray(normalized.metrics)) {
    normalized.metrics = (normalized.metrics as Array<Record<string, unknown>>).map((m) => {
      if (!m || typeof m !== 'object') return m;
      const out = { ...m };
      if (typeof out.value === 'number') out.value = String(out.value);
      if (typeof out.baseline === 'number') out.baseline = String(out.baseline);
      return out;
    });
  }

  const parsed = projectFrontmatterSchema.safeParse({
    ...normalized,
    slug: data.slug ?? filename,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  · ${issue.path.join('.') || '(root)'}：${issue.message}`)
      .join('\n');
    fail(file, details);
  }

  if (parsed.data.slug !== filename) {
    fail(
      file,
      `  · slug：front matter 写的是「${parsed.data.slug}」，与文件名「${filename}」不一致。二者必须相同，否则路由会与索引对不上。`,
    );
  }

  const repo = getRepoStat(
    parsed.data.repoUrl,
    parsed.data.repoSnapshot,
    parsed.data.repoSnapshotAt,
  );

  return {
    ...parsed.data,
    body: content,
    readMinutes: readingMinutes(content),
    warnings: auditProject(parsed.data),
    repo,
  };
}

export function getAllProjects(options: { includeDrafts?: boolean } = {}): Project[] {
  const includeDrafts = options.includeDrafts ?? process.env.NODE_ENV !== 'production';
  if (cache && includeDrafts) return cache;

  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => /\.mdx?$/.test(f) && !f.startsWith('_'));

  const projects = files
    .map(loadFile)
    .filter((p) => includeDrafts || !p.draft)
    .sort((a, b) => a.order - b.order || b.updatedAt.localeCompare(a.updatedAt));

  if (includeDrafts) cache = projects;
  return projects;
}

export function getProject(slug: string): Project | undefined {
  return getAllProjects().find((p) => p.slug === slug);
}

export function getFeaturedProjects(limit = 3): Project[] {
  return getAllProjects()
    .filter((p) => p.featured)
    .slice(0, limit);
}

/** 全部技术栈，按出现频次排序，供列表页筛选 */
export function getAllStacks(): Array<{ name: string; count: number }> {
  const counter = new Map<string, number>();
  for (const p of getAllProjects()) {
    for (const s of p.stack) counter.set(s, (counter.get(s) ?? 0) + 1);
  }
  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** 首页 ProofStrip：取 featured 项目里 baseline 齐全的前 N 条指标 */
export function getProofMetrics(limit = 3) {
  // 每个精选项目只贡献一条：三条数字来自三个不同项目，比同一项目的三条更有说服力
  const rows: Array<Metric & { project: Project }> = [];
  for (const project of getAllProjects()) {
    if (!project.featured) continue;
    const metric = project.metrics.find((m) => m.baseline);
    if (metric) rows.push({ ...metric, project });
    if (rows.length >= limit) break;
  }
  return rows;
}

export function getAdjacentProjects(slug: string): {
  prev?: Project;
  next?: Project;
} {
  const all = getAllProjects();
  const index = all.findIndex((p) => p.slug === slug);
  if (index < 0) return {};
  return {
    prev: index > 0 ? all[index - 1] : undefined,
    next: index < all.length - 1 ? all[index + 1] : undefined,
  };
}
