import fs from 'node:fs';
import path from 'node:path';
import type { Resume } from './types';

export type {
  Resume,
  ResumeWork,
  ResumeEducation,
  ResumeSkillGroup,
  ResumeAward,
} from './types';

/**
 * 结构化简历数据（对齐 JSON Resume 的字段名）。
 * 内容在 content/data/resume.json，可由 /admin 后台直接编辑。
 *
 * 这里刻意用"运行时读文件 + mtime 缓存"，而不是 `import raw from '...json'`：
 * 静态 import 会把内容焊进构建产物，后台改完必须重新 build 才生效。
 * 线上要支持在线更新简历，就必须在每次请求时看一眼文件有没有变。
 */
const FILE = path.join(process.cwd(), 'content', 'data', 'resume.json');

let cached: { mtimeMs: number; data: Resume } | null = null;

export function getResume(): Resume {
  const { mtimeMs } = fs.statSync(FILE);
  if (!cached || cached.mtimeMs !== mtimeMs) {
    cached = { mtimeMs, data: JSON.parse(fs.readFileSync(FILE, 'utf8')) as Resume };
  }
  return cached.data;
}

/** 后台保存后主动丢弃缓存，避免 mtime 精度（1s 级）导致读不到新内容 */
export function invalidateResumeCache() {
  cached = null;
}
