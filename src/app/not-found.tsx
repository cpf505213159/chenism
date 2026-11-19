import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { getAllProjects } from '@/lib/content/repository';

export default function NotFound() {
  const projects = getAllProjects().slice(0, 4);

  return (
    <Container size="narrow" className="py-20">
      <p className="kicker mb-4">404</p>
      <h1 className="text-[clamp(1.75rem,4vw,2.4rem)] font-semibold tracking-[-0.03em]">
        这个地址不存在
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
        可能是链接写错了，或者项目改过 slug。下面是几个可以去的地方。
      </p>

      <div className="mt-8 flex flex-wrap gap-2.5">
        <Link
          href="/"
          className="rounded-md bg-ink px-4 py-2 text-[0.875rem] font-medium text-bg"
        >
          回到首页
        </Link>
        <Link
          href="/projects"
          className="rounded-md border border-line-strong px-4 py-2 text-[0.875rem] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          全部项目
        </Link>
      </div>

      {projects.length > 0 && (
        <div className="mt-12 border-t border-line pt-6">
          <p className="kicker mb-3">或者看看这些</p>
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="text-[0.9rem] text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent"
                >
                  {p.title}
                </Link>
                <span className="ml-2 text-[0.78rem] text-faint">{p.summary.slice(0, 30)}…</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Container>
  );
}
