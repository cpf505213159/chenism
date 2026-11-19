import Link from 'next/link';
import { CoverArt } from '@/components/ui/CoverArt';
import { ArrowUpRight, GithubIcon } from '@/components/ui/Icons';
import type { Project } from '@/lib/content/repository';
import { cn, formatPeriod } from '@/lib/utils/format';

const STATUS_LABEL: Record<Project['status'], string> = {
  shipped: '已上线',
  archived: '已归档',
  wip: '进行中',
  concept: '概念',
};

export function StatusBadge({ status }: { status: Project['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-[2px] font-mono text-[0.625rem] uppercase tracking-[0.12em]',
        status === 'shipped'
          ? 'border-line-strong text-muted'
          : 'border-line text-faint',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-[5px] w-[5px] rounded-full',
          status === 'shipped' ? 'bg-ok' : status === 'wip' ? 'bg-accent' : 'bg-faint',
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function RepoStatBadges({ project }: { project: Project }) {
  const { repo } = project;
  if (repo.source === 'none') return null;

  const asOfLabel = repo.asOf ? `截至 ${repo.asOf}` : null;

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-[0.7rem] text-faint">
      {repo.language && <span>{repo.language}</span>}
      {repo.stars !== undefined && (
        <span className="inline-flex items-center gap-1" title={asOfLabel ?? undefined}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9.5l6.1-.9L12 3Z" />
          </svg>
          {repo.stars}
        </span>
      )}
      {repo.source === 'snapshot' && (
        <span className="text-faint/60" title={asOfLabel ?? undefined}>
          · 快照
        </span>
      )}
    </span>
  );
}

export function SourceButtons({
  project,
  size = 'default',
}: {
  project: Project;
  size?: 'default' | 'small';
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {project.repoUrl && (
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-line-strong bg-surface font-medium text-ink transition-colors hover:border-accent hover:text-accent',
            size === 'small' ? 'px-2.5 py-1 text-[0.75rem]' : 'px-3 py-1.5 text-[0.8125rem]',
          )}
          data-event="source-click"
        >
          <GithubIcon size={size === 'small' ? 12 : 14} />
          源码
          <ArrowUpRight size={size === 'small' ? 11 : 12} />
        </a>
      )}
      {project.demoUrl && (
        <a
          href={project.demoUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-line bg-transparent font-medium text-muted transition-colors hover:border-accent hover:text-accent',
            size === 'small' ? 'px-2.5 py-1 text-[0.75rem]' : 'px-3 py-1.5 text-[0.8125rem]',
          )}
        >
          演示
          <ArrowUpRight size={size === 'small' ? 11 : 12} />
        </a>
      )}
    </div>
  );
}

export function ProjectCard({
  project,
  index,
  featured,
}: {
  project: Project;
  index: string;
  featured?: boolean;
}) {
  const leadMetric = project.metrics[0];
  const maxTags = featured ? 4 : 3;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface card-hover">
      <Link
        href={`/projects/${project.slug}`}
        className="relative block aspect-[16/9] overflow-hidden border-b border-line"
        aria-label={`查看项目：${project.title}`}
      >
        {project.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover.src}
            alt={project.cover.alt}
            width={project.cover.width}
            height={project.cover.height}
            className="h-full w-full object-cover"
          />
        ) : (
          <CoverArt seed={project.slug} title={project.title} index={index} />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <StatusBadge status={project.status} />
          <span className="font-mono text-[0.68rem] tracking-wide text-faint">
            {formatPeriod(project.period)}
          </span>
        </div>

        <h3 className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em]">
          <Link href={`/projects/${project.slug}`} className="hover:text-accent transition-colors">
            {project.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-[0.875rem] leading-relaxed text-muted">
          {project.summary}
        </p>

        {leadMetric && (
          <div className="mt-3.5 flex items-baseline gap-2 border-l-2 border-accent/50 pl-2.5">
            <span className="font-mono text-[0.95rem] font-semibold text-ink">
              {leadMetric.value}
            </span>
            <span className="text-[0.72rem] text-faint">{leadMetric.label}</span>
          </div>
        )}

        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {project.stack.slice(0, maxTags).map((s) => (
            <span
              key={s}
              className="rounded border border-line px-1.5 py-[1px] font-mono text-[0.68rem] text-faint"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0 overflow-hidden">
            <RepoStatBadges project={project} />
          </div>
          <SourceButtons project={project} size="small" />
        </div>
      </div>
    </article>
  );
}
