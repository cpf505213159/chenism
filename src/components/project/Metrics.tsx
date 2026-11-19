import type { Metric } from '@/lib/content/schema';
import { ArrowDown, ArrowUp } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/format';

/** 视觉宽度：中文字符按 2 计，用来决定字号，避免长短不一的指标看起来忽大忽小 */
function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    width += /[\u4e00-\u9fa5（）]/.test(ch) ? 2 : 1;
  }
  return width;
}

/** 单条指标的完整呈现：标签 → 基线 → 结果 → 测量方式 */
export function MetricRow({ metric, compact }: { metric: Metric; compact?: boolean }) {
  const hasBaseline = Boolean(metric.baseline);
  const w = displayWidth(metric.value);

  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-b border-line pb-4 last:border-0 last:pb-0',
        compact && 'pb-3',
      )}
    >
      <div className="kicker">{metric.label}</div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        {hasBaseline && (
          <>
            <span className="font-mono text-[0.95rem] text-faint line-through decoration-line-strong">
              {metric.baseline}
            </span>
            <span aria-hidden className="text-faint">
              →
            </span>
          </>
        )}
        <span
          className={cn(
            'font-semibold tracking-tight text-ink',
            // 中文在等宽字体里会明显偏大，含 CJK 时退回正文字体，字号才和数字一致
            /[\u4e00-\u9fa5]/.test(metric.value) ? 'font-sans' : 'font-mono',
            w > 13 ? 'text-[0.98rem]' : w > 10 ? 'text-[1.1rem]' : 'text-[1.35rem]',
          )}
        >
          {metric.value}
        </span>
        {metric.direction && (
          <span
            className={cn(
              'ml-0.5 inline-flex items-center gap-0.5 text-[0.7rem]',
              metric.direction === 'down' ? 'text-ok' : 'text-accent',
            )}
            title={metric.direction === 'down' ? '数值下降（延迟/错误类为改善）' : '数值上升'}
          >
            {metric.direction === 'down' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
          </span>
        )}
        {!hasBaseline && (
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-faint">
            绝对值
          </span>
        )}
      </div>
      <p className="text-[0.78rem] leading-relaxed text-faint">衡量方式：{metric.method}</p>
    </div>
  );
}

export function MetricsPanel({ metrics, title }: { metrics: Metric[]; title?: string }) {
  if (metrics.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line-strong p-5">
        <p className="kicker mb-2">结果</p>
        <p className="text-[0.9rem] leading-relaxed text-muted">
          这个项目还没有补充可量化结果。与其编一个数字，不如先空着——但空着本身也是一条信息：
          说明这部分贡献无法被度量，或者数据不可公开。
        </p>
      </div>
    );
  }

  return (
    <div>
      {title && <p className="kicker mb-4">{title}</p>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <MetricRow key={`${m.label}-${m.value}`} metric={m} />
        ))}
      </div>
    </div>
  );
}
