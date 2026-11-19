import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Resume, SiteConfig } from '@/data/types';

/**
 * 后台的读写层。
 * 只碰 content/ 下的内容文件，不生成、不修改任何 TypeScript 代码。
 */

const DATA_DIR = path.join(process.cwd(), 'content', 'data');
const PROJECT_DIR = path.join(process.cwd(), 'content', 'projects');
const SITE_FILE = path.join(DATA_DIR, 'site.json');
const RESUME_FILE = path.join(DATA_DIR, 'resume.json');

/** YAML 会把 2026-11-01 解析成 Date、把 0.78 解析成 number，统一转回字符串 */
function normalize<T>(input: T): T {
  if (input instanceof Date) return input.toISOString().slice(0, 10) as unknown as T;
  if (Array.isArray(input)) return input.map((item) => normalize(item)) as unknown as T;
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = normalize(value);
    }
    return out as T;
  }
  return input;
}

function writeJson(file: string, data: unknown) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function readSite(): SiteConfig {
  return JSON.parse(fs.readFileSync(SITE_FILE, 'utf8')) as SiteConfig;
}

export function writeSite(data: SiteConfig) {
  // url 保留在内容里作为默认值；部署时由 SITE_URL 环境变量覆盖
  writeJson(SITE_FILE, data);
}

export function readResume(): Resume {
  return JSON.parse(fs.readFileSync(RESUME_FILE, 'utf8')) as Resume;
}

export function writeResume(data: Resume) {
  writeJson(RESUME_FILE, data);
}

export type ProjectRecord = {
  slug: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

export function listProjects(): ProjectRecord[] {
  if (!fs.existsSync(PROJECT_DIR)) return [];
  return fs
    .readdirSync(PROJECT_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .sort()
    .map((file) => {
      const raw = fs.readFileSync(path.join(PROJECT_DIR, file), 'utf8');
      const { data, content } = matter(raw);
      return {
        slug: file.replace(/\.mdx$/, ''),
        frontmatter: normalize(data) as Record<string, unknown>,
        body: content.replace(/^\n+/, ''),
      };
    });
}

export function readProject(slug: string): ProjectRecord | null {
  const file = path.join(PROJECT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(raw);
  return { slug, frontmatter: normalize(data) as Record<string, unknown>, body: content.replace(/^\n+/, '') };
}

/** slug 只允许小写字母、数字与连字符，防止路径穿越 */
export function assertSlug(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('slug 只能包含小写字母、数字与连字符');
  }
}

export function writeProject(slug: string, frontmatter: Record<string, unknown>, body: string) {
  assertSlug(slug);
  if (!fs.existsSync(PROJECT_DIR)) fs.mkdirSync(PROJECT_DIR, { recursive: true });

  const clean: Record<string, unknown> = { ...frontmatter, slug };
  // 空字符串的可选字段直接删掉，避免 YAML 里出现 `end: ''`
  for (const key of Object.keys(clean)) {
    if (clean[key] === '' || clean[key] === undefined || clean[key] === null) {
      delete clean[key];
    }
  }

  const file = matter.stringify(`\n${body.trim()}\n`, clean);
  fs.writeFileSync(path.join(PROJECT_DIR, `${slug}.mdx`), file, 'utf8');
}

export function deleteProject(slug: string) {
  assertSlug(slug);
  const file = path.join(PROJECT_DIR, `${slug}.mdx`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
