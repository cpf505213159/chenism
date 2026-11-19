'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Mood } from './CompanionAvatar';
import { Live2DCharacter } from './Live2DCharacter';
import { RevealParticles } from './RevealParticles';
import { COMPANION_LOOK } from './models';
import { postAsk, type Citation } from '@/lib/ai/client';
import { SearchIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/format';

type Entry =
  | { role: 'user'; text: string }
  | { role: 'assistant'; citations: Citation[]; message?: string; reason?: string };

const EXAMPLES = ['哪个项目用到了时间序列', '有没有做过用户分层', '他会 Java 吗'];

/**
 * 悬浮的站内问答角色。
 * 交互原则：不遮挡正文、不弹模态遮罩、不自动抢焦点，默认只占右下角一小块。
 */
export function Companion() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  // 角色是否已经就位（Live2D 渲染完成，或降级为静态头像）；就位后收掉出场粒子
  const [figureReady, setFigureReady] = useState(false);
  const [mood, setMood] = useState<Mood>('idle');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const moodTimer = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 等首屏稳定再挂载，避免和 LCP 抢资源
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const handle = idle(() => setMounted(true));
    return () => {
      if (window.cancelIdleCallback && typeof handle === 'number') {
        window.cancelIdleCallback(handle);
      }
    };
  }, []);

  useEffect(
    () => () => {
      if (moodTimer.current) window.clearTimeout(moodTimer.current);
    },
    [],
  );

  // 第一次来的人，过一会儿冒个气泡；看过就不再打扰
  useEffect(() => {
    if (!mounted) return;
    try {
      if (localStorage.getItem('companion:seen') === '1') return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setPeek(true), 6000);
    return () => window.clearTimeout(timer);
  }, [mounted]);


  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setMood('idle');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // 打开时把焦点交给输入框（用户主动点开，不算抢焦点）
  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries, busy]);

  const ask = useCallback(
    async (raw?: string) => {
      const question = (raw ?? input).trim();
      if (question.length < 2 || busy) return;

      setInput('');
      setEntries((prev) => [...prev, { role: 'user', text: question }]);
      setBusy(true);
      setMood('thinking');

      const res = await postAsk(question);

      setBusy(false);
      setMood(res.ok && (res.citations?.length ?? 0) > 0 ? 'happy' : 'idle');
      setEntries((prev) => [
        ...prev,
        {
          role: 'assistant',
          citations: res.citations ?? [],
          message: res.message,
          reason: res.reason,
        },
      ]);

      // 清掉上一轮的复位定时器，否则它会在新一轮"思考中"把状态提前打回 idle
      if (moodTimer.current) window.clearTimeout(moodTimer.current);
      moodTimer.current = window.setTimeout(() => setMood('idle'), 2600);
    },
    [busy, input],
  );

  function toggle() {
    setOpen((v) => !v);
    setPeek(false);
    try {
      localStorage.setItem('companion:seen', '1');
    } catch {
      /* 隐私模式下忽略 */
    }
  }

  if (pathname?.startsWith('/admin')) return null;
  if (!mounted) return null;

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-end px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:right-5 sm:px-0">
      <div className="group/companion flex w-full flex-col items-end gap-2.5 sm:w-auto">
        {/* 面板 */}
        {open && (
          <section
            id="companion-panel"
            aria-label="站内问答"
            className="pointer-events-auto w-full overflow-hidden rounded-xl border border-line bg-surface shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)] sm:w-[372px]"
          >
            <header className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[0.85rem] font-medium">站内助手</span>
                <span className="font-mono text-[0.62rem] text-faint">只答站里写过的事</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/ask"
                  className="rounded border border-line px-1.5 py-0.5 font-mono text-[0.62rem] text-faint transition-colors hover:text-accent"
                >
                  完整页
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setMood('idle');
                  }}
                  aria-label="关闭问答面板"
                  className="rounded border border-line px-1.5 py-0.5 font-mono text-[0.62rem] text-faint transition-colors hover:text-ink"
                >
                  ESC
                </button>
              </div>
            </header>

            <div
              ref={listRef}
              className="max-h-[46dvh] space-y-3 overflow-y-auto px-3.5 py-3 sm:max-h-[340px]"
            >
              {entries.length === 0 && (
                <div>
                  <p className="text-[0.8rem] leading-relaxed text-muted">
                    我是这个站里的检索助手。问“做过哪些项目”“有没有用过某个技术”，我会翻出原文给你看，翻不到就说没有。
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {EXAMPLES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void ask(q)}
                        className="rounded-full border border-line px-2 py-0.5 text-[0.7rem] text-muted transition-colors hover:border-line-strong hover:text-ink"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {entries.map((entry, i) =>
                entry.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <p className="max-w-[85%] rounded-lg rounded-br-sm bg-ink px-2.5 py-1.5 text-[0.78rem] leading-relaxed text-bg">
                      {entry.text}
                    </p>
                  </div>
                ) : (
                  <div key={i} className="space-y-2">
                    {entry.citations.length > 0 ? (
                      entry.citations.map((c, j) => (
                        <Link
                          key={`${c.slug}-${j}`}
                          href={c.url}
                          className="block rounded-md border border-line bg-surface-2/60 px-2.5 py-2 transition-colors hover:border-line-strong"
                        >
                          <div className="mb-1 flex flex-wrap items-baseline gap-x-1.5">
                            <span className="font-mono text-[0.6rem] text-faint">[{j + 1}]</span>
                            <span className="text-[0.76rem] font-medium">{c.title}</span>
                            <span className="text-[0.62rem] text-faint">· {c.heading}</span>
                          </div>
                          <p className="line-clamp-3 text-[0.74rem] leading-relaxed text-muted">
                            {c.quote}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-md border border-dashed border-line-strong px-2.5 py-2">
                        <p className="text-[0.76rem] text-ink">
                          {entry.reason === 'rate_limited'
                            ? '问得有点快，歇一会儿'
                            : entry.reason === 'disabled'
                              ? '站内助手暂时关闭'
                              : '站内没有相关内容'}
                        </p>
                        <p className="mt-0.5 text-[0.72rem] leading-relaxed text-muted">
                          {entry.message ?? '它只覆盖本人写过的项目与简历，范围外不会猜。'}
                        </p>
                      </div>
                    )}
                  </div>
                ),
              )}

              {busy && (
                <div className="flex items-center gap-1.5 px-1 text-[0.72rem] text-faint">
                  <span className="companion-dot h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="companion-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: '140ms' }} />
                  <span className="companion-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: '280ms' }} />
                  <span className="ml-1">正在翻站内内容</span>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
              className="flex items-center gap-1.5 border-t border-line px-2.5 py-2"
            >
              <span className="text-faint">
                <SearchIcon size={14} />
              </span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={120}
                placeholder="问点什么…"
                aria-label="站内问题"
                className="min-w-0 flex-1 bg-transparent text-[0.8rem] text-ink outline-none placeholder:text-faint"
              />
              <button
                type="submit"
                disabled={busy || input.trim().length < 2}
                className="rounded-md bg-ink px-2.5 py-1 text-[0.72rem] text-bg disabled:opacity-35"
              >
                问
              </button>
            </form>
          </section>
        )}

        {/* 气泡 */}
        {!open && peek && (
          <button
            type="button"
            onClick={toggle}
            className="pointer-events-auto relative max-w-[178px] rounded-lg rounded-br-sm border border-line bg-surface px-2.5 py-1.5 text-left text-[0.74rem] leading-snug text-ink shadow-md sm:max-w-[220px]"
          >
            有什么想问的？点我聊聊
            <span
              aria-hidden
              className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 border-b border-r border-line bg-surface"
            />
          </button>
        )}

        <div className="pointer-events-auto relative flex items-end">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="companion-panel"
            aria-label={open ? '收起站内问答' : '站内助手 Hiyori，打开提问面板'}
            className="group relative flex h-[196px] w-[164px] items-end justify-center sm:h-[232px] sm:w-[194px]"
          >
            <span
              aria-hidden
              className="absolute bottom-1 h-3 w-20 rounded-full bg-ink/10 blur-[7px]"
            />
            {/* 出场粒子：垫在角色下面，角色就位后自动淡出并停止 */}
            <RevealParticles active={!figureReady} />
            <Live2DCharacter
              look={COMPANION_LOOK}
              mood={mood}
              onVisible={() => setFigureReady(true)}
              className={cn(
                'relative h-full w-full transition-transform duration-300',
                'group-hover:-translate-y-0.5',
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
