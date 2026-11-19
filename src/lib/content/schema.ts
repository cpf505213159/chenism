import { z } from 'zod';

/**
 * 项目 front matter 的唯一真相。
 * 这个字段集在 T01 一次冻结：列表页、详情页、分享卡、GitHub 降级都从这里取，
 * 后续任何页面需要新信息，只能派生，不允许各自往 schema 里加字段。
 */

const VAGUE_WORDS = /显著|大幅|明显|很多|若干|极大|一定程度上|有效地/;

export const metricSchema = z.object({
  label: z.string().min(2, '指标名至少 2 个字'),
  // baseline 选填：拿不到同口径旧值时留空，页面会退化为"绝对值 + 口径"
  baseline: z.string().optional(),
  value: z
    .string()
    .min(1, '结果值不能为空')
    .refine((v) => !VAGUE_WORDS.test(v), {
      message:
        '结果必须是数字或可观察变化，不能用「显著 / 大幅 / 明显 / 很多」这类模糊词',
    }),
  method: z.string().min(4, '必须写清衡量方式：数据源 + 时间窗 + 样本范围'),
  direction: z.enum(['up', 'down']).optional(),
});

export const projectFrontmatterSchema = z.object({
  title: z
    .string()
    .min(2)
    .max(16, '项目名超过 16 字，分享卡会自动降字号，建议改短'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'slug 只能是小写字母、数字与连字符'),
  summary: z
    .string()
    .min(24, 'summary 太短：要写清「做了什么 + 带来什么」')
    .max(140, 'summary 超过 140 字，卡片与 og:description 会截断'),
  role: z.string().min(2),
  period: z.object({
    start: z.string().regex(/^\d{4}-\d{2}$/, '格式 YYYY-MM'),
    end: z.string().regex(/^\d{4}-\d{2}$/, '格式 YYYY-MM').optional(),
  }),
  team: z.string().optional(),
  company: z.string().optional(),
  stack: z.array(z.string()).min(1, '至少一个技术栈标签'),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  status: z.enum(['shipped', 'archived', 'wip', 'concept']),
  featured: z.boolean().default(false),
  order: z.number().int().default(100),
  metrics: z.array(metricSchema).default([]),
  cover: z
    .object({
      src: z.string(),
      width: z.number().int(),
      height: z.number().int(),
      alt: z.string().min(4),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  ogTagline: z.string().max(24, 'ogTagline 超过 24 字会溢出分享卡版式').optional(),
  repoSnapshot: z
    .object({
      stars: z.number().int().optional(),
      language: z.string().optional(),
      updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .optional(),
  repoSnapshotAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  links: z
    .array(z.object({ label: z.string(), url: z.string().url() }))
    .default([]),
  confidentiality: z.string().optional(),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '格式 YYYY-MM-DD'),
  draft: z.boolean().default(false),
});

export type ProjectFrontmatter = z.infer<typeof projectFrontmatterSchema>;
export type Metric = z.infer<typeof metricSchema>;

/**
 * 语义级检查：zod 管不了的"内容质量"，在这里给出可读的警告（不阻塞构建）。
 * 硬错误由 zod 负责，指向具体字段。
 */
export function auditProject(fm: ProjectFrontmatter): string[] {
  const warnings: string[] = [];

  if (fm.metrics.length === 0) {
    warnings.push(
      'metrics 为空：详情页会显式提示"该项目尚未补充可量化结果"，招聘方无法判断影响面',
    );
  } else {
    const missingBaseline = fm.metrics.filter((m) => !m.baseline).length;
    if (missingBaseline * 2 > fm.metrics.length) {
      warnings.push(
        `过半指标（${missingBaseline}/${fm.metrics.length}）没有基线：招聘方无法判断改善幅度，建议补同口径旧值或外部锚点`,
      );
    }
  }

  if (!fm.repoUrl && !fm.demoUrl && fm.status !== 'concept') {
    warnings.push('既没有 repoUrl 也没有 demoUrl：访客无处可去看真东西');
  }

  if (!fm.ogTagline) {
    warnings.push(
      '未提供 ogTagline：分享卡第 2 行会回落 summary 首句，可能被截成半句话',
    );
  }

  return warnings;
}
