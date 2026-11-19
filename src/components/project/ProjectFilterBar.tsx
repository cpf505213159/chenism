'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils/format';

type StackOption = { name: string; count: number };

/**
 * 渐进增强的筛选器：列表页的卡片全部由服务端静态渲染（SEO 与无 JS 可用），
 * 这里只负责按 URL 上的 ?stack= 切换可见性——不重新渲染卡片，只切属性。
 */
export function ProjectFilterBar({ stacks }: { stacks: StackOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get('stack');
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const activeStacks = useMemo(
    () => (active ? active.split(',').filter(Boolean) : []),
    [active],
  );

  useEffect(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-project-card]'),
    );

    let shown = 0;
    for (const card of cards) {
      const cardStacks = (card.dataset.stack ?? '').split('|');
      const match =
        activeStacks.length === 0 ||
        activeStacks.every((s) => cardStacks.includes(s));
      card.hidden = !match;
      if (match) shown += 1;
    }
    // 计数来自 DOM 里实际可见的卡片（渐进增强：无 JS 时也能筛选）
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同步 DOM 计算结果
    setVisibleCount(shown);

    const empty = document.getElementById('projects-empty');
    if (empty) empty.hidden = shown !== 0;
  }, [activeStacks]);

  function toggle(name: string) {
    const next = activeStacks.includes(name)
      ? activeStacks.filter((s) => s !== name)
      : [...activeStacks, name];
    const query = next.length ? `?stack=${next.map(encodeURIComponent).join(',')}` : '';
    router.replace(`${pathname}${query}`, { scroll: false });
  }

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className={cn(
            'rounded-full border px-2.5 py-1 font-mono text-[0.7rem] tracking-wide transition-colors',
            activeStacks.length === 0
              ? 'border-ink bg-ink text-bg'
              : 'border-line text-muted hover:border-line-strong hover:text-ink',
          )}
        >
          全部
        </button>
        {stacks.map((s) => {
          const isActive = activeStacks.includes(s.name);
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => toggle(s.name)}
              aria-pressed={isActive}
              className={cn(
                'rounded-full border px-2.5 py-1 font-mono text-[0.7rem] tracking-wide transition-colors',
                isActive
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {s.name}
              <span className="ml-1 text-[0.62rem] text-faint">{s.count}</span>
            </button>
          );
        })}
        {activeStacks.length > 0 && visibleCount !== null && (
          <span className="ml-1 font-mono text-[0.68rem] text-faint">
            命中 {visibleCount} 个
          </span>
        )}
      </div>
    </div>
  );
}
