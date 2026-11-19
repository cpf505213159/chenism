import Link from 'next/link';
import { getAiMode } from '@/lib/ai/guard';
import { Container } from '@/components/ui/Container';
import { GithubIcon, MailIcon } from '@/components/ui/Icons';
import { site } from '@/data/site';
import { isAdminEnabled } from '@/lib/admin/guard';
import { AdminEntry } from './AdminEntry';

export function SiteFooter() {
  const year = new Date().getFullYear();
  // 后台不可用的环境下，入口连渲染都不渲染
  const adminEnabled = isAdminEnabled();

  return (
    <footer className="mt-8 border-t border-line">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-[0.95rem] font-medium">{site.name}</p>
            <p className="mt-1.5 max-w-[36ch] text-[0.85rem] leading-relaxed text-muted">
              {site.role} · {site.location}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href={`mailto:${site.email}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[0.78rem] text-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <MailIcon size={13} />
                {site.email}
              </a>
              <a
                href="https://github.com/chenism"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[0.78rem] text-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <GithubIcon size={13} />
                GitHub
              </a>
            </div>
          </div>

          <nav aria-label="页脚导航">
            <p className="kicker mb-3">浏览</p>
            <ul className="space-y-1.5 text-[0.85rem]">
              {(getAiMode() === 'off' ? site.nav.filter((i) => i.href !== '/ask') : site.nav).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted transition-colors hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="kicker mb-3">其他</p>
            <ul className="space-y-1.5 text-[0.85rem]">
              {getAiMode() !== 'off' && (
                <li>
                  <Link href="/ask" className="text-muted transition-colors hover:text-ink">
                    站内问答
                  </Link>
                </li>
              )}
              <li>
                <a href="/resume.json" className="text-muted transition-colors hover:text-ink">
                  简历 JSON
                </a>
              </li>
              <li>
                <Link href="/resume" className="text-muted transition-colors hover:text-ink">
                  打印版简历
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 font-mono text-[0.68rem] text-faint">
          <p
            title={
              adminEnabled
                ? '按 Shift + D 看数据快照 · Ctrl(⌘) + Shift + A 进后台'
                : '按 Shift + D 看看这个站自己的数据快照'
            }
          >
            © {year} {site.name} · 内容与代码均为本人作品
            {adminEnabled && <AdminEntry />}
          </p>
          <p>Next.js 静态生成 · 无第三方追踪</p>
        </div>
      </Container>
    </footer>
  );
}
