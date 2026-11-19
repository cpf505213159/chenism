'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/format';
import { nav } from '@/data/site';

export function NavLinks({
  className,
  items = nav,
}: {
  className?: string;
  /** 由服务端传入：AI_MODE=off 时会滤掉 /ask（客户端读不到这个环境变量） */
  items?: typeof nav;
}) {
  const pathname = usePathname();

  return (
    <ul className={cn('flex items-center gap-1 overflow-x-auto', className)}>
      {items.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-block rounded px-2.5 py-1.5 text-[0.8125rem] transition-colors',
                active
                  ? 'text-ink'
                  : 'text-muted hover:text-ink',
              )}
            >
              {item.label}
              {active && (
                <span
                  aria-hidden
                  className="mx-auto mt-1 block h-[1.5px] w-full max-w-[14px] bg-accent"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
