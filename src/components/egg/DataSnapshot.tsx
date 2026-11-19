'use client';

import { useEffect, useState } from 'react';
import type { SiteStats } from '@/lib/site-stats';

/**
 * 彩蛋：Shift + D 打开「本站数据快照」。
 * 一个数据分析师的站点，用站点自己的数据介绍自己——不打扰任何人，
 * 默认完全不可见，键盘党或翻控制台的人才会撞见。
 */
export function DataSnapshot({ stats }: { stats: SiteStats }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 控制台里留一行提示，只打一次
    const bars = stats.stacks
      .map((s) => {
        const len = Math.max(1, Math.round((s.count / stats.stacks[0].count) * 18));
        return `   ${s.name.padEnd(12, ' ')} ${'█'.repeat(len)} ${s.count}`;
      })
      .join('\n');

    console.log(
      `%c 数据快照 %c 按 Shift + D 打开\n\n${bars}\n\n 样本量 n=${stats.projects}，置信区间就不算了。`,
      'background:#9a3b22;color:#fff;padding:2px 6px;border-radius:2px',
      'color:#888',
    );

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (event.shiftKey && (event.key === 'D' || event.key === 'd') && !typing) {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stats]);

  if (!open) return null;

  const max = stats.stacks[0]?.count ?? 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="本站数据快照"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[520px] rounded-xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="kicker mb-1">Easter egg · Shift + D</p>
            <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">本站数据快照</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-line px-2 py-0.5 font-mono text-[0.7rem] text-faint hover:text-ink"
          >
            ESC
          </button>
        </div>

        <dl className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['项目', String(stats.projects)],
            ['指标', String(stats.metrics)],
            ['正文', `${stats.words.toLocaleString()} 字`],
            ['跨度', `${stats.span.from}–${stats.span.to}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="kicker mb-1">{k}</dt>
              <dd className="font-mono text-[1.05rem] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="kicker mb-2.5">技术栈出现频次</p>
          <ul className="space-y-1.5">
            {stats.stacks.map((s) => (
              <li key={s.name} className="flex items-center gap-2">
                <span className="w-[92px] shrink-0 truncate font-mono text-[0.72rem] text-muted">
                  {s.name}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-sm bg-surface-2">
                  <span
                    className="block h-full rounded-sm bg-accent/70"
                    style={{ width: `${Math.max(6, (s.count / max) * 100)}%` }}
                  />
                </span>
                <span className="w-4 shrink-0 text-right font-mono text-[0.7rem] text-faint">
                  {s.count}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 border-t border-line pt-3 text-[0.72rem] leading-relaxed text-faint">
          数据来自这个站点自己的内容文件，构建时算好。<span className="text-muted">样本量 n={stats.projects}，置信区间就不算了。</span>
        </p>
      </div>
    </div>
  );
}
