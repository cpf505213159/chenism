import { notFound } from 'next/navigation';
import { getAllProjects, getProject } from '@/lib/content/repository';
import { site } from '@/data/site';

/**
 * 分享卡渲染页（1200×630）。构建时由 scripts/og-images.mjs 截图成 PNG。
 *
 * 为什么不用 next/og（Satori）：它只接受 TTF/OTF/WOFF，中文就得往仓库里塞一个
 * 几 MB 的字体子集，还有"字体+图片+JSX ≤500KB"的硬上限。用浏览器渲染同一套 CSS，
 * 直接复用系统字体与站点样式，没有任何字体格式的地雷。
 */

export function generateStaticParams() {
  return [{ slug: 'home' }, ...getAllProjects().map((p) => ({ slug: p.slug }))];
}

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function OgCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug === 'home') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          overflow: 'hidden',
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'var(--bg)',
          color: 'var(--text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--ok)' }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'var(--faint)',
            }}
          >
            {site.handle}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 92, fontWeight: 650, letterSpacing: -4, lineHeight: 1.05 }}>
            {site.name}
          </div>
          <div style={{ fontSize: 34, color: 'var(--muted)', letterSpacing: -0.5 }}>
            {site.role} · {site.tagline}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: '1px solid var(--line)',
            paddingTop: 24,
            fontSize: 20,
            fontFamily: 'var(--font-mono)',
            color: 'var(--faint)',
          }}
        >
          <span>{new URL(site.url).hostname}</span>
          <span>{site.location}</span>
        </div>
      </div>
    );
  }

  const project = getProject(slug);
  if (!project) notFound();

  const tagline = project.ogTagline ?? project.summary.split('。')[0];
  const startYear = project.period.start.slice(0, 4);
  const endYear = project.period.end?.slice(0, 4);
  const year = !endYear
    ? `${startYear} — 至今`
    : endYear === startYear
      ? startYear
      : `${startYear}–${endYear}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'var(--faint)',
          }}
        >
          {site.name} / 项目
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            color: 'var(--faint)',
          }}
        >
          {project.status === 'shipped' ? '已上线' : project.status}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div
          style={{
            fontSize: project.title.length > 12 ? 68 : 82,
            fontWeight: 650,
            letterSpacing: -3,
            lineHeight: 1.1,
          }}
        >
          {project.title}
        </div>
        <div style={{ fontSize: 32, color: 'var(--muted)', letterSpacing: -0.5, lineHeight: 1.4 }}>
          {tagline}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          {project.stack.slice(0, 4).map((s) => (
            <span
              key={s}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                color: 'var(--faint)',
                border: '1px solid var(--line)',
                borderRadius: 4,
                padding: '4px 10px',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '1px solid var(--line)',
          paddingTop: 24,
          fontSize: 20,
          fontFamily: 'var(--font-mono)',
          color: 'var(--faint)',
        }}
      >
        <span>
          {year} · {project.role}
        </span>
        <span>{new URL(site.url).hostname}</span>
      </div>
    </div>
  );
}
