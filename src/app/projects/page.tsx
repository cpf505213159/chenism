import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/ui/Container';
import { ProjectCard } from '@/components/project/ProjectCard';
import { ProjectFilterBar } from '@/components/project/ProjectFilterBar';
import { getAllProjects, getAllStacks } from '@/lib/content/repository';
import { getAiMode } from '@/lib/ai/guard';

export const metadata: Metadata = {
  title: '项目',
  description:
    '按「背景与约束 → 我的角色 → 关键决策与取舍 → 结果 → 复盘」写的项目详情，每个都带可核验的指标与源码入口。',
  alternates: { canonical: '/projects' },
};

export default function ProjectsPage() {
  const projects = getAllProjects();
  // 只展示出现频次最高的 10 个技术栈，否则筛选条会变成一面墙
  const stacks = getAllStacks().slice(0, 10);

  return (
    <Container className="py-14 sm:py-20">
      <header className="mb-10 max-w-[62ch]">
        <p className="kicker mb-4">项目库</p>
        <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
          {projects.length} 个项目，每个都写了失败的判断
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">
          只写自己真正做过决策的部分。指标都标了衡量方式——没有测量方式的结果，和广告词没有区别。
        </p>
      </header>

      <Suspense fallback={<div className="mb-8 h-8" />}>
        <ProjectFilterBar stacks={stacks} />
      </Suspense>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => (
          <div
            key={p.slug}
            data-project-card
            data-stack={p.stack.join('|')}
            className="h-full"
          >
            <ProjectCard project={p} index={String(i + 1).padStart(2, '0')} />
          </div>
        ))}
      </div>

      <div
        id="projects-empty"
        hidden
        className="rounded-md border border-dashed border-line-strong p-8 text-center"
      >
        <p className="text-[0.9rem] text-muted">
          这个组合下没有项目。
        </p>
        <p className="mt-2 text-[0.82rem] text-faint">
          换个技术栈试试
          {getAiMode() !== 'off' && (
            <>
              ，或者
              <a href="/ask" className="ml-1 text-accent underline underline-offset-4">
                直接问站内助手
              </a>
            </>
          )}
          。
        </p>
      </div>
    </Container>
  );
}
