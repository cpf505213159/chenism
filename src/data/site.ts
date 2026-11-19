import raw from '../../content/data/site.json';
import type { SiteConfig, SocialIcon } from './types';

/**
 * 站点级常量。
 * 内容在 content/data/site.json，可由 /admin 后台直接编辑；
 * 只有 SITE_URL 留给环境变量（部署地址不该写进内容）。
 */
export const site: SiteConfig = {
  ...raw,
  socials: raw.socials.map((s) => ({ ...s, icon: s.icon as SocialIcon })),
  url: process.env.SITE_URL ?? raw.url ?? 'http://localhost:3000',
};

export const nav = site.nav;
