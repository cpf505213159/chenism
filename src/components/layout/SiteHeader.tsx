import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { NavLinks } from '@/components/layout/NavLinks';
import { nav, site } from '@/data/site';
import { getAiMode } from '@/lib/ai/guard';

export function SiteHeader() {
  return (
    // 用不透明底色而不是 backdrop-blur：滚动时模糊滤镜每帧都要重算整块背景，
    // 是低端机上最容易被感知到的卡顿来源之一。
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[0.95rem] font-semibold tracking-[-0.03em]">
            {site.name}
          </span>
          <span className="hidden font-mono text-[0.68rem] tracking-wide text-faint transition-colors group-hover:text-muted sm:inline">
            / {site.handle}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <NavLinks items={getAiMode() === 'off' ? nav.filter((i) => i.href !== '/ask') : nav} />
        </div>
      </Container>
    </header>
  );
}
