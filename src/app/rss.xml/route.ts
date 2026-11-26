import { getAllProjects } from '@/lib/content/repository';
import { site } from '@/data/site';

/**
 * /rss.xml —— 站内真实可用的 RSS 2.0 订阅源。
 *
 * 之前 site.json 里挂着一个 `href: "/rss.xml"` 的社交链接，但根本没有这个路由，
 * 等于一个死链。这里补上真实实现：项目列表即订阅内容，按 updatedAt 排序。
 * 数据每次请求重建（与项目页一致），后台改完内容后订阅也会跟着变。
 */
export const dynamic = 'force-dynamic';

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export function GET() {
  const base = site.url.replace(/\/$/, '');
  const projects = [...getAllProjects()].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  );

  const items = projects
    .map((p) => {
      const url = `${base}/projects/${p.slug}`;
      const date = new Date(`${p.updatedAt}T00:00:00Z`).toUTCString();
      return [
        '    <item>',
        `      <title>${escapeXml(p.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${date}</pubDate>`,
        `      <description>${escapeXml(p.summary)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${site.name} · 项目与简历`)}</title>
    <link>${escapeXml(base)}</link>
    <description>${escapeXml(site.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
