import Link from 'next/link';
import { getAiMode } from '@/lib/ai/guard';
import { Container, Section } from '@/components/ui/Container';
import { ProjectCard } from '@/components/project/ProjectCard';
import { ArrowRight, ArrowUpRight, GithubIcon, DownloadIcon } from '@/components/ui/Icons';
import { getFeaturedProjects, getProofMetrics, getAllProjects } from '@/lib/content/repository';
import { getSiteStats } from '@/lib/site-stats';
import { DataSnapshot } from '@/components/egg/DataSnapshot';
import { getResume } from '@/data/resume';
import { site } from '@/data/site';
import { cn, formatPeriod } from '@/lib/utils/format';

export default function HomePage() {
  const resume = getResume();
  const stats = getSiteStats();
  const featured = getFeaturedProjects(3);
  const proofs = getProofMetrics(3);
  const total = getAllProjects().length;

  return (
    <>
      {/* Hero：5 秒内讲清我是谁、做过什么、去哪里看源码 */}
      <section className="border-b border-line">
        <Container className="pb-16 pt-14 sm:pb-24 sm:pt-20">
          <div className="grid gap-12 lg:grid-cols-[1.55fr_1fr] lg:items-end">
            <div>
              <p className="mb-6 inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-ok opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
                </span>
                {site.available}
              </p>

              <h1 className="display">
                {site.name}
                <span className="mt-2 block text-[0.42em] font-normal tracking-[-0.01em] text-muted">
                  {site.role}
                </span>
              </h1>

              <p className="mt-7 max-w-[30ch] text-[1.0625rem] leading-relaxed text-ink sm:max-w-[34ch]">
                {site.tagline}
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-[0.875rem] font-medium text-bg transition-opacity hover:opacity-85"
                >
                  看 {total} 个项目
                  <ArrowRight size={15} />
                </Link>
                <a
                  href="/resume.pdf"
                  className="inline-flex items-center gap-2 rounded-md border border-line-strong px-4 py-2 text-[0.875rem] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  <DownloadIcon size={15} />
                  下载简历 PDF
                </a>
                <a
                  href="https://github.com/chenism"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 px-1 text-[0.875rem] text-muted transition-colors hover:text-ink"
                >
                  <GithubIcon size={15} />
                  GitHub
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </div>

            {/* 右侧规格栏：像技术文档的元信息，而不是装饰 */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {[
                ['目前', site.location],
                ['经验', '3 年+ 全职 · 电商全链路'],
                ['擅长', '用户增长、商品经营与大促复盘'],
                ['偏好', '结论必须能说清口径'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="kicker mb-1">{k}</dt>
                  <dd className="text-[0.85rem] leading-relaxed text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* 三条硬指标：直接给数字，不铺垫 */}
      {proofs.length > 0 && (
        <section className="border-b border-line bg-surface/60">
          <Container className="py-10">
            <div className="grid gap-8 sm:grid-cols-3">
              {proofs.map((p) => (
                <Link
                  key={`${p.project.slug}-${p.label}`}
                  href={`/projects/${p.project.slug}`}
                  className="group border-l-2 border-accent/60 pl-4"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span
                      className={cn(
                        'font-semibold tracking-tight',
                        p.value.length > 9 ? 'text-[1.2rem]' : 'text-[1.45rem]',
                        // 中文在等宽字体里字面更大，含 CJK 时改用正文字体
                        /[\u4e00-\u9fa5]/.test(p.value) ? 'font-sans' : 'font-mono',
                      )}
                    >
                      {p.value}
                    </span>
                    {p.baseline && p.baseline.length <= 10 && (
                      <span className="font-mono text-[0.75rem] text-faint line-through">
                        {p.baseline}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[0.82rem] text-muted">{p.label}</p>
                  <p className="mt-1 font-mono text-[0.66rem] text-faint transition-colors group-hover:text-accent">
                    {p.project.title} ↗
                  </p>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* 精选项目 */}
      <Section
        label="01 — 精选"
        title="三个把指标写进结果的项目"
        description="每个详情页都按同一套骨架写：背景与约束 → 我的角色 → 关键决策与取舍 → 结果 → 复盘。指标都标了口径与统计方法，SQL 与 Python 代码在卡片上直接可达。"
        action={
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-[0.85rem] text-muted transition-colors hover:text-accent"
          >
            全部 {total} 个项目
            <ArrowRight size={14} />
          </Link>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => (
            <ProjectCard
              key={p.slug}
              project={p}
              index={String(i + 1).padStart(2, '0')}
              featured
            />
          ))}
        </div>
      </Section>

      {/* 经历摘要 */}
      <Section
        className="border-t border-line"
        label="02 — 经历"
        title="工作与实习"
        action={
          <Link
            href="/resume"
            className="inline-flex items-center gap-1.5 text-[0.85rem] text-muted transition-colors hover:text-accent"
          >
            完整简历
            <ArrowRight size={14} />
          </Link>
        }
      >
        <ol className="border-t border-line">
          {resume.work.map((job) => (
            <li
              key={`${job.name}-${job.startDate}`}
              className="grid gap-2 border-b border-line py-5 sm:grid-cols-[130px_1fr] sm:gap-6"
            >
              <div className="font-mono text-[0.72rem] text-faint sm:pt-1">
                {formatPeriod({ start: job.startDate, end: job.endDate })}
              </div>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <h3 className="text-[0.95rem] font-medium">{job.name}</h3>
                  <span className="text-[0.82rem] text-muted">{job.position}</span>
                </div>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-muted">
                  {job.highlights[0]}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* 技能 */}
      <Section className="border-t border-line" label="03 — 工具" title="日常在用的东西">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {resume.skills.map((group) => (
            <div key={group.name}>
              <p className="kicker mb-3">{group.name}</p>
              <ul className="flex flex-wrap gap-1.5">
                {group.keywords.map((k) => (
                  <li
                    key={k}
                    className="rounded border border-line px-1.5 py-[2px] font-mono text-[0.7rem] text-muted"
                  >
                    {k}
                  </li>
                ))}
              </ul>
              {group.note && (
                <p className="mt-2.5 text-[0.78rem] leading-relaxed text-faint">{group.note}</p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* 联系 */}
      <Section className="border-t border-line">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="kicker mb-3">04 — 联系</p>
            <h2 className="display max-w-[16ch] text-[clamp(1.75rem,3.4vw,2.5rem)]">
              有合适的岗位或想聊技术，直接发邮件。
            </h2>
            <p className="mt-4 text-[0.9rem] text-muted">{site.available}</p>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={`mailto:${site.email}`}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-[0.875rem] font-medium text-bg transition-opacity hover:opacity-85"
            >
              {site.email}
            </a>
            <a
              href="/resume.json"
              className="text-center font-mono text-[0.72rem] text-faint transition-colors hover:text-accent"
            >
              或取机器可读简历 /resume.json
            </a>
          </div>
        </div>
      </Section>

      {/* 彩蛋：默认不可见，Shift + D 打开 */}
      <DataSnapshot stats={stats} />

      {/* AI 入口：一行文字链，不是聊天框；AI_MODE=off 时整块不渲染 */}
      {getAiMode() !== 'off' && (
      <div className="border-t border-line">
        <Container className="py-6">
          <p className="text-[0.82rem] text-faint">
            没找到想看的内容？
            <Link
              href="/ask"
              className="ml-1 text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
            >
              问问站内助手 —— 它只回答这个站里写了什么
            </Link>
          </p>
        </Container>
      </div>
      )}
    </>
  );
}
