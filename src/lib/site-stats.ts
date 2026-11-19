import { getAllProjects, getAllStacks } from '@/lib/content/repository';

/**
 * 站点自身的统计。用于彩蛋面板与控制台提示——
 * 一个讲数据的站，用数据介绍自己，比放一句「Hello World」体面。
 */
export type SiteStats = {
  projects: number;
  metrics: number;
  words: number;
  stacks: Array<{ name: string; count: number }>;
  span: { from: string; to: string };
};

export function getSiteStats(): SiteStats {
  const projects = getAllProjects();

  const metrics = projects.reduce((sum, p) => sum + p.metrics.length, 0);

  const words = projects.reduce((sum, p) => {
    const cjk = (p.body.match(/[\u4e00-\u9fa5]/g) ?? []).length;
    return sum + cjk;
  }, 0);

  const years = projects
    .map((p) => p.period.start.slice(0, 4))
    .concat(projects.map((p) => p.period.end?.slice(0, 4) ?? '至今'))
    .filter(Boolean)
    .sort();

  return {
    projects: projects.length,
    metrics,
    words,
    stacks: getAllStacks().slice(0, 6),
    span: { from: years[0] ?? '—', to: years[years.length - 1] ?? '—' },
  };
}
