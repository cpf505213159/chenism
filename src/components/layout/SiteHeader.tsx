import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { NavLinks } from '@/components/layout/NavLinks';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { nav, site } from '@/data/site';
import { getAiMode } from '@/lib/ai/guard';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="group flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[0.95rem] font-semibold tracking-[-0.02em]">
            {site.name}
          </span>
          <span className="hidden font-mono text-[0.7rem] text-faint sm:inline">
            / {site.handle}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <NavLinks items={getAiMode() === 'off' ? nav.filter((i) => i.href !== '/ask') : nav} />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
