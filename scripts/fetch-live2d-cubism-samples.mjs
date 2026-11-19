#!/usr/bin/env node
/**
 * 拉取 Live2D 官方示例模型（CubismWebSamples）到 public/live2d/<id>/。
 *
 * 目前只用到 Momose Hiyori：官方免费素材，Cubism 4（.moc3）格式，
 * 9 组 Idle + 1 组 TapBody，没有 pose 部件切换，渲染稳定。
 *
 * 用法：node scripts/fetch-live2d-cubism-samples.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const REPO = 'Live2D/CubismWebSamples/develop/Samples/Resources';
const MIRRORS = [
  'https://ghfast.top/https://raw.githubusercontent.com',
  'https://gh-proxy.com/https://raw.githubusercontent.com',
  'https://raw.githubusercontent.com',
];

/** [本地 id, 仓库内目录, 面板名, 描述] */
const WANTED = [['hiyori', 'Hiyori', 'Hiyori', '官方示例 · 桃瀬ひより']];

async function fetchRepoFile(repoPath) {
  const encoded = repoPath.split('/').map(encodeURIComponent).join('/');
  let lastErr;
  for (const base of MIRRORS) {
    try {
      const res = await fetch(`${base}/${REPO}/${encoded}`, { signal: AbortSignal.timeout(40_000) });
      if (!res.ok) throw new Error(`${res.status} ${repoPath}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function save(id, relPath, data) {
  const target = join('public', 'live2d', id, relPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, data);
  return data.length;
}

for (const [id, dir, name, hint] of WANTED) {
  process.stdout.write(`→ ${name} ... `);
  const entryName = `${dir}.model3.json`;
  let raw;
  try {
    raw = JSON.parse((await fetchRepoFile(`${dir}/${entryName}`)).toString('utf8'));
  } catch (e) {
    console.error(`✗ 配置拉取失败 ${e.message}`);
    continue;
  }

  const ref = raw.FileReferences ?? {};
  const wanted = new Set();
  for (const key of ['Moc', 'Physics', 'Pose', 'UserData', 'DisplayInfo']) {
    if (ref[key]) wanted.add(ref[key]);
  }
  for (const t of ref.Textures ?? []) wanted.add(t);
  for (const list of Object.values(ref.Motions ?? {})) {
    for (const m of list) if (m.File) wanted.add(m.File);
  }

  let bytes = 0;
  const failed = new Set();
  for (const file of wanted) {
    try {
      bytes += await save(id, file, await fetchRepoFile(`${dir}/${file}`));
    } catch {
      failed.add(file);
    }
  }

  // 缺文件就从配置里摘掉，避免运行时反复 404
  const cleaned = structuredClone(raw);
  const cRef = cleaned.FileReferences ?? {};
  for (const key of ['Physics', 'Pose', 'UserData', 'DisplayInfo']) {
    if (cRef[key] && failed.has(cRef[key])) delete cRef[key];
  }
  for (const [group, list] of Object.entries(cRef.Motions ?? {})) {
    cRef.Motions[group] = list.filter((m) => !failed.has(m.File));
    if (cRef.Motions[group].length === 0) delete cRef.Motions[group];
  }

  bytes += await save(id, entryName, Buffer.from(JSON.stringify(cleaned, null, 2)));
  await save(id, 'entry.json', Buffer.from(JSON.stringify({ file: entryName, name, hint })));

  const skipped = failed.size ? `（跳过 ${failed.size} 个缺失文件）` : '';
  console.log(`${wanted.size - failed.size} 个文件 · ${(bytes / 1024 / 1024).toFixed(2)} MB ${skipped}`);
}
