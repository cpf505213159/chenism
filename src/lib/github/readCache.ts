import fs from 'node:fs';
import path from 'node:path';

/**
 * GitHub 仓库元数据的读取侧。浏览器端永不直连 GitHub API：
 * 这里只读构建时产出的 .cache/github-repos.json，并与 front matter 的 repoSnapshot 合并。
 */

export type RepoStat = {
  stars?: number;
  language?: string;
  updatedAt?: string;
  archived?: boolean;
  topics?: string[];
  /** 数据截止日，用于在界面上标注"截至 X"，避免旧值被误读为实时 */
  asOf?: string;
  source: 'cache' | 'snapshot' | 'none';
};

type CacheFile = {
  fetchedAt: string;
  ttlHours: number;
  repos: Record<
    string,
    {
      stars?: number;
      forks?: number;
      language?: string;
      pushedAt?: string;
      archived?: boolean;
      topics?: string[];
    }
  >;
};

const CACHE_PATH = path.join(process.cwd(), '.cache', 'github-repos.json');

let cachedFile: CacheFile | null | undefined;

function readCacheFile(): CacheFile | null {
  if (cachedFile !== undefined) return cachedFile;
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    cachedFile = JSON.parse(raw) as CacheFile;
  } catch {
    cachedFile = null;
  }
  return cachedFile;
}

/** 从 repoUrl 里取出 owner/repo；取不到返回 null（非法 URL 不该让构建失败） */
export function repoKey(repoUrl?: string): string | null {
  if (!repoUrl) return null;
  try {
    const url = new URL(repoUrl);
    if (!/github\.com$/.test(url.hostname)) return null;
    const [owner, repo] = url.pathname.replace(/^\//, '').split('/');
    if (!owner || !repo) return null;
    return `${owner}/${repo.replace(/\.git$/, '')}`;
  } catch {
    return null;
  }
}

/**
 * 三层降级：新鲜缓存 → 过期缓存（stale-while-error）→ front matter.repoSnapshot → 不渲染。
 * 任何一层缺失都不抛错，调用方按 source 决定渲染什么。
 */
export function getRepoStat(
  repoUrl: string | undefined,
  snapshot?: { stars?: number; language?: string; updatedAt?: string },
  snapshotAt?: string,
): RepoStat {
  const key = repoKey(repoUrl);
  const file = readCacheFile();

  if (key && file?.repos?.[key]) {
    const entry = file.repos[key];
    return {
      stars: entry.stars,
      language: entry.language,
      updatedAt: entry.pushedAt?.slice(0, 10),
      archived: entry.archived,
      topics: entry.topics,
      asOf: file.fetchedAt?.slice(0, 10),
      source: 'cache',
    };
  }

  if (snapshot && (snapshot.stars !== undefined || snapshot.language)) {
    return {
      stars: snapshot.stars,
      language: snapshot.language,
      updatedAt: snapshot.updatedAt,
      asOf: snapshotAt,
      source: 'snapshot',
    };
  }

  return { source: 'none' };
}
