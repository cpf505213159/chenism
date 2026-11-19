export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** '2024-03' → '2024.03' */
export function formatMonth(value: string): string {
  return value.replace('-', '.');
}

/** {start:'2023-04'} → '2023.04 — 至今' */
export function formatPeriod(period: { start: string; end?: string }): string {
  return `${formatMonth(period.start)} — ${period.end ? formatMonth(period.end) : '至今'}`;
}

/** 两个日期之间的月数，用于简历时间线的"时长"标注 */
export function durationMonths(period: { start: string; end?: string }): number {
  const [sy, sm] = period.start.split('-').map(Number);
  const end = period.end ?? new Date().toISOString().slice(0, 7);
  const [ey, em] = end.split('-').map(Number);
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
}

export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} 个月`;
  if (rest === 0) return `${years} 年`;
  return `${years} 年 ${rest} 个月`;
}

/** 粗略阅读时长：中文按 350 字/分钟，英文按 200 词/分钟 */
export function readingMinutes(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const words = (text.match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / 350 + words / 200));
}
