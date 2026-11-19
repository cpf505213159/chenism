#!/usr/bin/env node
/**
 * 构建时拉取 GitHub 仓库元数据 —— 浏览器端永不直连 GitHub API。
 *
 * 策略：GraphQL 批量 1 次请求（失败降级 REST 逐仓）→ 写 .cache/github-repos.json
 *      → --sync-snapshot 时把结果回填到 front matter 的 repoSnapshot（幂等）。
 *
 * 原则：任何失败都只 warning，恒 exit 0。个人站的部署不该因为第三方限流变红。
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const DIR = 'content/projects';
const CACHE = '.cache/github-repos.json';
const TTL_HOURS = 24;
const SYNC = process.argv.includes('--sync-snapshot');
const STRICT = process.argv.includes('--strict');
const TOKEN = process.env.GITHUB_TOKEN;

function parseRepo(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;
    const [owner, repo] = u.pathname.replace(/^\//, '').split('/');
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, ''), key: `${owner}/${repo.replace(/\.git$/, '')}` };
  } catch {
    return null;
  }
}

function loadProjects() {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((file) => {
      const raw = readFileSync(join(DIR, file), 'utf8');
      const { data } = matter(raw);
      return { file, repo: parseRepo(data.repoUrl) };
    })
    .filter((p) => p.repo);
}

async function fetchGraphQL(repos) {
  const query = `query {
    ${repos
      .map(
        (r, i) => `r${i}: repository(owner: "${r.owner}", name: "${r.repo}") {
          stargazerCount
          primaryLanguage { name }
          pushedAt
          isArchived
          repositoryTopics(first: 6) { nodes { topic { name } } }
        }`,
      )
      .join('\n')}
  }`;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${TOKEN}`,
      'content-type': 'application/json',
      'user-agent': 'chenism-site-build',
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) throw new Error(`GraphQL ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors[0])}`);

  const out = {};
  repos.forEach((r, i) => {
    const node = json.data?.[`r${i}`];
    if (!node) return;
    out[r.key] = {
      stars: node.stargazerCount,
      language: node.primaryLanguage?.name,
      pushedAt: node.pushedAt,
      archived: node.isArchived,
      topics: node.repositoryTopics?.nodes?.map((n) => n.topic.name) ?? [],
    };
  });
  return out;
}

async function fetchRest(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'chenism-site-build',
      ...(TOKEN ? { authorization: `bearer ${TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`REST ${res.status}`);
  const json = await res.json();
  return {
    stars: json.stargazers_count,
    language: json.language,
    pushedAt: json.pushed_at,
    archived: json.archived,
    topics: json.topics ?? [],
  };
}

function readCache() {
  try {
    return JSON.parse(readFileSync(CACHE, 'utf8'));
  } catch {
    return null;
  }
}

function isFresh(cache) {
  if (!cache?.fetchedAt) return false;
  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  return age < TTL_HOURS * 3600 * 1000;
}

/** 只改 repoSnapshot / repoSnapshotAt，其余字节原样保留 */
function syncSnapshot(file, entry, fetchedAt) {
  const path = join(DIR, file);
  const raw = readFileSync(path, 'utf8');
  const date = fetchedAt.slice(0, 10);
  const pushed = entry.pushedAt?.slice(0, 10);

  const block = [
    'repoSnapshot:',
    `  stars: ${entry.stars}`,
    ...(entry.language ? [`  language: ${entry.language}`] : []),
    ...(pushed ? [`  updatedAt: ${pushed}`] : []),
    `repoSnapshotAt: ${date}`,
  ].join('\n');

  let next;
  if (/^repoSnapshot:/m.test(raw)) {
    next = raw.replace(/^repoSnapshot:[\s\S]*?^repoSnapshotAt:.*$/m, block);
  } else {
    next = raw.replace(/^updatedAt:/m, `${block}\nupdatedAt:`);
  }

  if (next !== raw) {
    writeFileSync(path, next);
    return true;
  }
  return false;
}

async function main() {
  const projects = loadProjects();
  if (projects.length === 0) {
    console.log('没有找到带 repoUrl 的项目，跳过。');
    return;
  }

  const existing = readCache();
  if (isFresh(existing) && !process.argv.includes('--force')) {
    console.log(`缓存仍然新鲜（${existing.fetchedAt}），跳过拉取。用 --force 强制刷新。`);
    if (SYNC) applySync(projects, existing);
    return;
  }

  if (!TOKEN) {
    console.warn('未设置 GITHUB_TOKEN：本地未认证请求限额 60/h，且不写缓存。');
  }

  let repos = {};
  try {
    repos = await fetchGraphQL(projects.map((p) => p.repo));
    console.log(`GraphQL 批量取到 ${Object.keys(repos).length}/${projects.length} 个仓库`);
  } catch (error) {
    console.warn(`GraphQL 失败（${error.message}），降级为 REST 逐仓`);
    for (const p of projects) {
      try {
        repos[p.repo.key] = await fetchRest(p.repo);
      } catch (e) {
        console.warn(`  跳过 ${p.repo.key}：${e.message}`);
      }
    }
  }

  if (Object.keys(repos).length === 0) {
    console.warn('一个仓库都没取到，保留旧缓存、继续构建。');
    return;
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    ttlHours: TTL_HOURS,
    repos: { ...(existing?.repos ?? {}), ...repos },
  };

  mkdirSync('.cache', { recursive: true });
  writeFileSync(CACHE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`✓ 写入 ${CACHE}（${Object.keys(payload.repos).length} 条）`);

  if (SYNC) applySync(projects, payload);
}

function applySync(projects, payload) {
  let changed = 0;
  for (const p of projects) {
    const entry = payload.repos?.[p.repo.key];
    if (!entry) continue;
    if (syncSnapshot(p.file, entry, payload.fetchedAt)) changed += 1;
  }
  console.log(`--sync-snapshot：回填 ${changed} 个文件（值未变的不写入）`);
}

main().catch((error) => {
  console.warn(`! fetch-repos 未预期失败，继续构建：${error.message}`);
  if (STRICT) process.exit(1);
  process.exit(0);
});
