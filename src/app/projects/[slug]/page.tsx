import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { CoverArt } from '@/components/ui/CoverArt';
import { MetricsPanel } from '@/components/project/Metrics';
import { RepoStatBadges, SourceButtons, StatusBadge } from '@/components/project/ProjectCard';
import { ArrowRight, ArrowUpRight } from '@/components/ui/Icons';
import {
  getAdjacentProjects,
  getAllProjects,
  getProject,
} from '@/lib/content/repository';
import { compileMdx, extractHeadings } from '@/lib/content/mdx';
import { formatPeriod } from '@/lib/utils/format';
import { site } from '@/data/site';

type Params = { slug: string };

/**
 * 每次请求重新渲染：后台改完项目详情后要立刻反映（原因见 /resume）。
 * generateStaticParams 保留——构建时仍枚举 slug（sitemap / 静态导出兜底会用到），
 * 只是页面本身不再被烤成静态 HTML。
 */
export const dynamic = 'force-dynamic';

export function generateStaticParams(): Params[] {
  return getAllProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: '项目不存在' };

  const title = project.title;
  const description = project.ogTagline ?? project.summary;

  return {
    title,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: 'article',
      title: `${project.title} · ${site.name}`,
      description,
      url: `/projects/${project.slug}`,
      publishedTime: `${project.period.start}-01`,
      modifiedTime: project.updatedAt,
      tags: project.stack,
      images: [
        {
          url: `/og/${project.slug}.png`,
          width: 1200,
          height: 630,
          alt: `${project.title} · ${description}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} · ${site.name}`,
      description,
      images: [`/og/${project.slug}.png`],
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const MDX = await compileMdx(project.body);
  const headings = extractHeadings(project.body);
  const { prev, next } = getAdjacentProjects(slug);
  const index = getAllProjects().findIndex((p) => p.slug === slug) + 1;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    abstract: project.summary,
    datePublished: `${project.period.start}-01`,
    dateModified: project.updatedAt,
    creativeWorkStatus: project.status,
    keywords: project.stack.join(', '),
    author: { '@type': 'Person', name: site.name, url: site.url },
    ...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
    ...(project.repo.language
      ? { programmingLanguage: project.repo.language }
      : { programmingLanguage: project.stack[0] }),
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 头部 */}
      <header className="border-b border-line">
        <Container className="pb-10 pt-8 sm:pb-14 sm:pt-10">
          <nav className="mb-8 flex items-center gap-2 font-mono text-[0.7rem] text-faint">
            <Link href="/projects" className="transition-colors hover:text-accent">
              项目
            </Link>
            <span aria-hidden>/</span>
            <span className="text-muted">{project.slug}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <StatusBadge status={project.status} />
                <span className="font-mono text-[0.7rem] text-faint">
                  {formatPeriod(project.period)}
                </span>
              </div>

              <h1 className="text-[clamp(1.9rem,4.2vw,2.85rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
                {project.title}
              </h1>

              <p className="mt-4 max-w-[52ch] text-[1rem] leading-relaxed text-muted">
                {project.summary}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <SourceButtons project={project} />
                <RepoStatBadges project={project} />
              </div>
            </div>

            <div className="aspect-[16/9] overflow-hidden rounded-lg border border-line lg:aspect-[16/10]">
              {project.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.cover.src}
                  alt={project.cover.alt}
                  width={project.cover.width}
                  height={project.cover.height}
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                />
              ) : (
                <CoverArt
                  seed={project.slug}
                  title={project.title}
                  index={String(index).padStart(2, '0')}
                />
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* TL;DR 元信息 */}
      <div className="border-b border-line bg-surface/60">
        <Container className="grid gap-6 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['角色', project.role],
            ['周期', formatPeriod(project.period)],
            ['团队', project.team ?? '—'],
            ['技术栈', project.stack.join(' · ')],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="kicker mb-1.5">{k}</p>
              <p className="text-[0.85rem] leading-relaxed text-ink">{v}</p>
            </div>
          ))}
        </Container>
      </div>

      <Container className="py-12 sm:py-16">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16">
          <div className="min-w-0">
            {project.metrics.length > 0 && (
              <section className="mb-14 rounded-lg border border-line bg-surface p-6 sm:p-7">
                <MetricsPanel metrics={project.metrics} title="结果（含衡量方式）" />
              </section>
            )}

            {project.confidentiality && (
              <p className="mb-8 border-l-2 border-line-strong pl-3 text-[0.78rem] leading-relaxed text-faint">
                {project.confidentiality}
              </p>
            )}

            <div className="prose-site">
              <MDX />
            </div>

            {project.links.length > 0 && (
              <div className="mt-12 border-t border-line pt-6">
                <p className="kicker mb-3">附加材料</p>
                <ul className="flex flex-col gap-1.5">
                  {project.links.map((l) => (
                    <li key={l.url}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 text-[0.85rem] text-accent underline underline-offset-4"
                      >
                        {l.label}
                        <ArrowUpRight size={12} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 目录 */}
          {headings.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="kicker mb-3">本文目录</p>
                <ul className="space-y-2 border-l border-line pl-3">
                  {headings.map((h) => (
                    <li key={h.id} className={h.level === 3 ? 'pl-3' : undefined}>
                      <a
                        href={`#${h.id}`}
                        className="block text-[0.78rem] leading-snug text-muted transition-colors hover:text-accent"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
                {project.repo.source !== 'none' && (
                  <p className="mt-6 border-t border-line pt-3 font-mono text-[0.65rem] leading-relaxed text-faint">
                    {project.repo.source === 'cache'
                      ? `仓库数据：构建时缓存${project.repo.asOf ? `（截至 ${project.repo.asOf}）` : ''}`
                      : `仓库数据：仓库快照${project.repo.asOf ? `（截至 ${project.repo.asOf}）` : ''}`}
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>
      </Container>

      {/* 上一个 / 下一个 */}
      <nav className="border-t border-line" aria-label="项目导航">
        <Container className="grid gap-4 py-8 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/projects/${prev.slug}`}
              className="group flex flex-col gap-1 border-line py-2 sm:border-r sm:pr-6"
            >
              <span className="kicker">← 上一个</span>
              <span className="text-[0.9rem] transition-colors group-hover:text-accent">
                {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/projects/${next.slug}`}
              className="group flex flex-col gap-1 py-2 sm:items-end sm:pl-6 sm:text-right"
            >
              <span className="kicker">下一个 →</span>
              <span className="text-[0.9rem] transition-colors group-hover:text-accent">
                {next.title}
              </span>
            </Link>
          ) : (
            <Link
              href="/projects"
              className="group flex flex-col gap-1 py-2 sm:items-end sm:pl-6 sm:text-right"
            >
              <span className="kicker">回到</span>
              <span className="inline-flex items-center gap-1.5 text-[0.9rem] transition-colors group-hover:text-accent">
                全部项目
                <ArrowRight size={13} />
              </span>
            </Link>
          )}
        </Container>
      </nav>
    </article>
  );
}
