import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { AskPanel } from '@/components/ai/AskPanel';
import { getAiMode } from '@/lib/ai/guard';

export const metadata: Metadata = {
  title: '站内问答',
  description:
    '只回答"这个站里有什么"的检索型助手：返回带出处的原文片段，检索不到就明说没有。',
  alternates: { canonical: '/ask' },
  robots: { index: false, follow: true },
};

export default function AskPage() {
  // AI_MODE=off 时整个功能不存在：页面 404，入口也不渲染
  if (getAiMode() === 'off') notFound();

  return (
    <Container size="narrow" className="py-14 sm:py-20">
      <header className="mb-9">
        <p className="kicker mb-4">站内检索</p>
        <h1 className="text-[clamp(1.75rem,3.8vw,2.35rem)] font-semibold leading-[1.15] tracking-[-0.03em]">
          问这个站里写了什么
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">
          它不是聊天机器人，只是项目列表的另一种查询方式。检索范围只有本站的项目详情与简历，
          返回的是<span className="text-ink">带出处的原文片段</span>，检索直出、可逐条核对{getAiMode() === 'answer' ? '；开启时另附一段仅基于这些原文的速读小结' : ''}。
        </p>
      </header>

      <AskPanel />

      <section className="mt-14 border-t border-line pt-6">
        <p className="kicker mb-3">设计取舍</p>
        <ul className="space-y-2 text-[0.82rem] leading-relaxed text-muted">
          <li>
            · <span className="text-ink">检索永远不等模型</span>：命中只由 BM25 决定，原文直出。
            可选小结是命中之后才异步叠加的一段速读文字，慢了、超时、失败都不影响结果。
          </li>
          <li>
            · <span className="text-ink">不把全库塞进 prompt</span>：只把命中的 3 条原文交给模型改写，
            既便宜又快，也不会把两个项目的事说串。
          </li>
          <li>
            · <span className="text-ink">允许它说「没有」</span>：问 iOS 经验时它会回答站内没有，
            而不是从&quot;做过前端&quot;推断出&quot;应该也会&quot;。
          </li>
        </ul>
        <p className="mt-4 font-mono text-[0.7rem] text-faint">
          检索实现：BM25（进程内索引，按 mtime 自动重建）· 主链路零模型 · 限流 30 次/小时/IP
        </p>
      </section>
    </Container>
  );
}
