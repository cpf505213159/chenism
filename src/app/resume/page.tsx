import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { PrintButton } from '@/components/resume/PrintButton';
import { ArrowUpRight } from '@/components/ui/Icons';
import { getResume } from '@/data/resume';
import { site, getSocial, socialHref } from '@/data/site';
import { durationMonths, formatDuration, formatMonth, formatPeriod } from '@/lib/utils/format';

/**
 * 每次请求重新渲染。
 *
 * 之前这里是默认的静态预渲染（build 时把 HTML 烤死，revalidate=false），
 * 结果在 /admin 里改完简历后，文件确实变了、/resume.json 也是新的，
 * 但页面 HTML 一直是构建时那份——因为 revalidatePath() 对非 ISR 的纯静态路由
 * 不会触发重新生成。简历页数据只有几 KB，SSR 成本可以忽略，换来"改完立刻生效"。
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '简历',
  description: `${site.name} 的结构化简历：工作经历、教育背景、技能与荣誉。可打印为 PDF，或取 /resume.json。`,
  alternates: { canonical: '/resume' },
};

export default function ResumePage() {
  const resume = getResume();
  const github = getSocial('github');
  return (
    <Container className="py-12 sm:py-16">
      {/* 抬头 */}
      <header className="mb-10 border-b border-line pb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-[clamp(1.9rem,3.6vw,2.4rem)] font-semibold tracking-[-0.03em]">
              {resume.basics.name}
            </h1>
            <p className="mt-1 text-[0.95rem] text-muted">{resume.basics.label}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.75rem] text-faint">
              <span>{resume.basics.email}</span>
              <span aria-hidden>·</span>
              <span>{site.location}</span>
              <span aria-hidden>·</span>
              {github && (
                <a
                  href={socialHref(github)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 transition-colors hover:text-accent"
                >
                  {github.href.replace(/^https?:\/\//, '')}
                  <ArrowUpRight size={11} />
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 no-print">
            <PrintButton />
            <a
              href="/resume.json"
              className="font-mono text-[0.68rem] text-faint transition-colors hover:text-accent"
            >
              JSON Resume 格式 →
            </a>
          </div>
        </div>
      </header>

      {/* 概述 */}
      <section className="mb-10">
        <p className="max-w-[68ch] text-[0.95rem] leading-relaxed text-muted">
          {resume.basics.summary}
        </p>
      </section>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          {/* 工作经历：时间线 */}
          <section className="mb-12">
            <p className="kicker mb-5">工作经历</p>
            <ol className="relative ml-1 border-l border-line-strong pl-6">
              {resume.work.map((job) => {
                const months = durationMonths({ start: job.startDate, end: job.endDate });
                return (
                  <li key={`${job.name}-${job.startDate}`} className="relative pb-8 last:pb-0 print-page">
                    <span
                      aria-hidden
                      className="absolute -left-[27px] top-[8px] h-[7px] w-[7px] rounded-full bg-accent/80 ring-4 ring-bg"
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h2 className="text-[1rem] font-semibold">
                        {job.name}
                        <span className="ml-2 text-[0.85rem] font-normal text-muted">
                          {job.position}
                        </span>
                      </h2>
                      <span className="font-mono text-[0.7rem] text-faint">
                        {formatPeriod({ start: job.startDate, end: job.endDate })}
                        <span className="ml-2.5 text-faint/60">· {formatDuration(months)}</span>
                      </span>
                    </div>

                    <p className="mt-1.5 text-[0.85rem] text-muted">{job.summary}</p>

                    <ul className="mt-3 space-y-1.5">
                      {job.highlights.map((h) => (
                        <li
                          key={h}
                          className="relative pl-4 text-[0.85rem] leading-relaxed text-ink/85 before:absolute before:left-0 before:top-[0.65em] before:h-px before:w-[7px] before:bg-line-strong"
                        >
                          {h}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-2.5 font-mono text-[0.68rem] text-faint">
                      {job.stack.join(' · ')}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* 教育 */}
          <section className="mb-12 print-page">
            <p className="kicker mb-5">教育背景</p>
            {resume.education.map((edu) => (
              <div key={edu.institution}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[0.95rem] font-medium">
                    {edu.institution}
                    <span className="ml-2 text-[0.85rem] font-normal text-muted">
                      {edu.studyType} · {edu.area}
                    </span>
                  </h2>
                  <span className="font-mono text-[0.7rem] text-faint">
                    {formatMonth(edu.startDate)} — {formatMonth(edu.endDate)}
                  </span>
                </div>
                {edu.score && (
                  <p className="mt-1 text-[0.82rem] text-muted">{edu.score}</p>
                )}
                {edu.highlights && (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {edu.highlights.map((h) => (
                      <li key={h} className="text-[0.82rem] text-muted">
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          {/* 荣誉 */}
          <section className="print-page">
            <p className="kicker mb-5">荣誉</p>
            <ul className="space-y-2">
              {resume.awards.map((a) => (
                <li key={a.title} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[0.85rem]">{a.title}</span>
                  <span className="font-mono text-[0.68rem] text-faint">
                    {a.awarder} · {formatMonth(a.date)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 侧栏：技能 */}
        <aside>
          <div className="sticky top-24 space-y-7">
            <div>
              <p className="kicker mb-3">技能</p>
              <div className="space-y-4">
                {resume.skills.map((g) => (
                  <div key={g.name}>
                    <p className="mb-1.5 text-[0.82rem] font-medium">{g.name}</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {g.keywords.map((k) => (
                        <li
                          key={k}
                          className="rounded border border-line px-1.5 py-[1px] font-mono text-[0.68rem] text-muted"
                        >
                          {k}
                        </li>
                      ))}
                    </ul>
                    {g.note && (
                      <p className="mt-1.5 text-[0.76rem] leading-relaxed text-faint">{g.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-5 no-print">
              <p className="kicker mb-2">说明</p>
              <p className="text-[0.76rem] leading-relaxed text-faint">
                这份简历与站点共用同一份数据源（
                <code className="font-mono">src/data/resume.ts</code>
                ）。要改内容只需改那一处，页面与 JSON 导出同步更新。
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-12 border-t border-line pt-5 no-print">
        <p className="text-[0.8rem] text-faint">
          更详细的判断过程在
          <Link href="/projects" className="mx-1 text-muted underline underline-offset-4 hover:text-accent">
            项目详情
          </Link>
          里，简历只放结论。
        </p>
      </div>
    </Container>
  );
}
