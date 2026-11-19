'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, SearchIcon } from '@/components/ui/Icons';
import { postAsk, postSummarize, type AskResponse } from '@/lib/ai/client';

type ApiResponse = AskResponse;

const EXAMPLES = [
  '哪个项目用到了时间序列',
  '有没有做过用户流失相关的分析',
  '他在上一家公司主要负责什么',
  '有没有做过客服质检',
  '指标口径是怎么统一的',
];

export function AskPanel() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const summaryAbort = useRef<AbortController | null>(null);

  // 卸载时取消在途的小结请求，避免 setState on unmounted
  useEffect(() => () => summaryAbort.current?.abort(), []);

  async function ask(raw?: string) {
    const q = (raw ?? query).trim();
    if (q.length < 2) return;
    if (raw) setQuery(raw);

    // 每次新提问先取消上一轮还在飞的小结，防止旧结果盖住新问题
    summaryAbort.current?.abort();
    setSummary(null);
    setState('loading');
    setResult(null);

    const data = await postAsk(q);
    setResult(data);
    setState('done'); // 原文摘录立即显示，不等模型

    // 可选增强：命中且服务端开启了小结能力时，异步补一段 AI 归纳。
    // 失败/超时/404 都返回 null，静默不渲染，已展示的原文完全不受影响。
    if (data.ok && data.enhance && (data.citations?.length ?? 0) > 0) {
      const controller = new AbortController();
      summaryAbort.current = controller;
      void postSummarize(q, controller.signal).then((text) => {
        if (!controller.signal.aborted && text) setSummary(text);
      });
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
            <SearchIcon size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={120}
            placeholder="问这个站里写了什么，例如：哪个项目用到了时间序列"
            aria-label="站内问题"
            className="w-full rounded-md border border-line bg-surface py-3 pl-10 pr-3 text-[0.9rem] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={state === 'loading' || query.trim().length < 2}
          className="rounded-md bg-ink px-5 py-3 text-[0.875rem] font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {state === 'loading' ? '检索中…' : '提问'}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[0.66rem] uppercase tracking-widest text-faint">
          试试
        </span>
        {EXAMPLES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void ask(q)}
            className="rounded-full border border-line px-2.5 py-1 text-[0.72rem] text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 结果区 */}
      <div className="mt-10" aria-live="polite">
        {state === 'loading' && (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-[104px] animate-pulse rounded-md border border-line bg-surface-2"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </ul>
        )}

        {state === 'done' && result?.ok && result.citations && result.citations.length > 0 && (
          <div>
            <p className="mb-4 font-mono text-[0.68rem] uppercase tracking-widest text-faint">
              站内命中 {result.citations.length} 处 · {result.latencyMs ?? 0}ms · 原文直出
            </p>

            {/* 可选 AI 小结：原文先显示，这段异步到达后才叠加，失败则完全不出现 */}
            {result.enhance && (
              <div className="mb-4 rounded-md border border-line-strong/60 bg-surface-2/50 p-4">
                <p className="mb-1.5 font-mono text-[0.66rem] uppercase tracking-widest text-faint">
                  AI 小结 · 可选
                </p>
                {summary ? (
                  <p className="text-[0.875rem] leading-relaxed text-ink">{summary}</p>
                ) : (
                  <p className="text-[0.8rem] leading-relaxed text-faint">
                    正在归纳…（下方原文已可用，无需等待）
                  </p>
                )}
                <p className="mt-2 text-[0.72rem] leading-relaxed text-faint">
                  由站内原文摘录归纳，只作速读；结论一律以带链接的原文为准。
                </p>
              </div>
            )}

            <ul className="space-y-3">
              {result.citations.map((c, i) => (
                <li
                  key={`${c.slug}-${c.heading}-${i}`}
                  className="rounded-md border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[0.66rem] text-faint">[{i + 1}]</span>
                    <span className="text-[0.9rem] font-medium">{c.title}</span>
                    <span className="text-[0.72rem] text-faint">· {c.heading}</span>
                  </div>
                  <p className="text-[0.875rem] leading-relaxed text-muted">{c.quote}</p>
                  <Link
                    href={c.url}
                    className="mt-2.5 inline-flex items-center gap-1 font-mono text-[0.72rem] text-accent underline underline-offset-4"
                  >
                    查看原文
                    <ArrowUpRight size={11} />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.75rem] leading-relaxed text-faint">
              以上为站内原文摘录，检索直出、可逐条核对。{result.enhance
                ? '上方的 AI 小结是附加的速读辅助，来源仍限于这些原文。'
                : '未经任何模型改写，这也是它不会胡说的原因——代价是不替你做总结。'}
            </p>
          </div>
        )}

        {state === 'done' && result && (!result.ok || (result.citations?.length ?? 0) === 0) && (
          <div className="rounded-md border border-dashed border-line-strong p-5">
            <p className="text-[0.9rem] font-medium">
              {result.reason === 'rate_limited' ? '先歇一下' : '站内没有找到相关内容'}
            </p>
            <p className="mt-1.5 text-[0.85rem] leading-relaxed text-muted">
              {result.message ??
                '这个站只覆盖本人写过的项目与简历。范围之外的，它不会猜。'}
            </p>
            {result.projects && result.projects.length > 0 && (
              <div className="mt-4">
                <p className="kicker mb-2">现有项目</p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {result.projects.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/projects/${p.slug}`}
                        className="text-[0.82rem] text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent"
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {state === 'idle' && (
          <p className="text-[0.8rem] leading-relaxed text-faint">
            它不生成文字，只在站内检索并返回带出处的原文片段。检索不到时会直接说没有。
          </p>
        )}
      </div>
    </div>
  );
}
