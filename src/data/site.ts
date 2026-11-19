import fs from 'node:fs';
import path from 'node:path';
import fallback from '../../content/data/site.json';
import type { SiteConfig, SocialIcon } from './types';

export { nav } from './nav';

/**
 * 站点级配置（名称、角色、社交链接、导航、可用状态…）。
 *
 * 内容在 content/data/site.json，可由 /admin 后台直接编辑。
 *
 * 为什么不是静态 import：
 * 之前直接 `import raw from '.../site.json'`，等于把配置在构建时焊进产物——
 * 后台改了邮箱、城市、GitHub 地址，页面还是构建时那份，只能重新部署。
 * 现在改成运行时读文件 + mtime 缓存，配合各页面 `force-dynamic`，改完刷新即可见。
 *
 * 用 Proxy 是为了不惊动那 ~80 处 `site.xxx` 的引用点：
 * 每次取属性都会重新 stat 一次文件（毫秒级，命中缓存时更便宜），
 * 有变化才重新解析。
 *
 * 注意：这个模块依赖 node:fs，只能被服务端组件引用。
 * 客户端组件请改用 `@/data/nav`（只含导航常量）。
 */
const FILE = path.join(process.cwd(), 'content', 'data', 'site.json');

type Raw = typeof fallback;

type Cached = { mtimeMs: number; data: SiteConfig };
let cached: Cached | null = null;

function normalize(raw: Raw): SiteConfig {
  return {
    ...raw,
    socials: raw.socials.map((s) => ({ ...s, icon: s.icon as SocialIcon })),
    // 部署地址只从环境变量来；没设才退回内容里的值
    url: process.env.SITE_URL ?? raw.url ?? 'http://localhost:3000',
  } as SiteConfig;
}

function load(): SiteConfig {
  try {
    const stat = fs.statSync(FILE);
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data;
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Raw;
    const data = normalize(raw);
    cached = { mtimeMs: stat.mtimeMs, data };
    return data;
  } catch {
    // 文件读不到就退回构建时的快照，站点不会白屏
    return normalize(fallback);
  }
}

export const site: SiteConfig = new Proxy({} as SiteConfig, {
  get(_target, prop) {
    if (typeof prop === 'symbol') return undefined;
    return (load() as unknown as Record<string, unknown>)[prop];
  },
  has(_target, prop) {
    return prop in (load() as unknown as Record<string, unknown>);
  },
  ownKeys() {
    return Reflect.ownKeys(load() as unknown as Record<string, unknown>);
  },
  getOwnPropertyDescriptor(_target, prop) {
    if (typeof prop === 'symbol') return undefined;
    const data = load() as unknown as Record<string, unknown>;
    if (!(prop in data)) return undefined;
    return { enumerable: true, configurable: true, value: data[prop] };
  },
});

/** 后台保存后可主动清缓存（与 resume/检索的失效一起调用） */
export function invalidateSiteCache() {
  cached = null;
}

export type SocialLink = { label: string; href: string; icon: SocialIcon };

/** 按图标取社交链接；后台没配就不渲染对应入口 */
export function getSocial(icon: SocialIcon): SocialLink | undefined {
  return site.socials.find((s) => s.icon === icon);
}

/** 邮箱类链接补上 mailto:（后台可能只填了裸地址） */
export function socialHref(link: SocialLink): string {
  if (link.icon === 'mail' && !/^mailto:/i.test(link.href)) {
    return `mailto:${link.href}`;
  }
  return link.href;
}
