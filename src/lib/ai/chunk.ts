import { getAllProjects } from '@/lib/content/repository';
import { getResume } from '@/data/resume';

export type Chunk = {
  id: string;
  /** 简历块统一用 resume 作为 slug */
  slug: string;
  title: string;
  heading: string;
  text: string;
  url: string;
  /**
   * 块类型决定检索先验：
   * 项目概览块是"这个项目是什么"的权威入口，简历技能块则罗列了所有技术名词，
   * 若不降权，任何技术名查询都会被技能块抢走。
   */
  kind: 'project-summary' | 'project-section' | 'resume';
};

/**
 * 切块策略：按 MDX 的 ## 标题切，块内保留标题路径；每块 300–800 字。
 * 简历按 work / education / skills / awards 各成一块。
 * 目标是 < 120 块 —— 这个量级下 BM25 比向量检索更准、更可解释，且零基建。
 */
export function buildChunks(): Chunk[] {
  const chunks: Chunk[] = [];
  const resume = getResume();

  for (const project of getAllProjects()) {
    const baseUrl = `/projects/${project.slug}`;

    // 项目级摘要块：回答"有没有做过 X"这类问题靠它
    chunks.push({
      id: `${project.slug}::summary`,
      slug: project.slug,
      title: project.title,
      heading: '项目概览',
      kind: 'project-summary',
      text: [
        project.title,
        project.summary,
        `角色：${project.role}`,
        `时间：${project.period.start} 至 ${project.period.end ?? '至今'}`,
        project.company ? `所属：${project.company}` : '',
        `技术栈：${project.stack.join('、')}`,
        project.tags.length ? `主题：${project.tags.join('、')}` : '',
        project.metrics.length
          ? `结果：${project.metrics
              .map((m) => `${m.label}${m.baseline ? ` 从 ${m.baseline}` : ''} 为 ${m.value}`)
              .join('；')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
      url: baseUrl,
    });

    // 正文按二级标题切块
    const sections = splitByHeading(project.body);
    for (const section of sections) {
      chunks.push({
        id: `${project.slug}::${section.heading}`,
        kind: 'project-section',
        slug: project.slug,
        title: project.title,
        heading: section.heading,
        // 注意：正文块不重复技术栈。若每块都带上 stack，
        // "技术栈"这类词的文档频率会接近 100%，idf 趋零，反而检索不到。
        text: `${project.title}\n${section.heading}\n${section.text}`,
        url: `${baseUrl}#${section.anchor}`,
      });
    }
  }

  // 简历块
  // 注意：提问的人不会用数据字段的措辞。这里刻意补上"毕业院校""上一家公司""目前"
  // 这类自然问法里的词——这正是 doc-search 那个项目的结论：真正提升召回的是
  // 让内容说人话，而不是把排序算法调得更花。
  const workText = resume.work
    .map((w, i) => {
      const current = !w.endDate;
      const timeWord = current
        ? '目前、最近一份工作、现在'
        : i === 1
          ? '上一家公司、上一份工作、前一家公司'
          : '更早的一份工作';
      const teamWord = w.summary.includes('带') ? '带过团队' : '';
      return [
        `${timeWord}：在${w.name}任${w.position}（${w.startDate} 至 ${w.endDate ?? '至今'}）。`,
        `${w.summary}${teamWord ? '（团队规模：带过人）' : ''}`,
        `主要职责与成果：${w.highlights.join('；')}`,
        `技术栈：${w.stack.join('、')}`,
      ].join('\n');
    })
    .join('\n\n');

  // 个人简介：回答"他是谁/在做什么/什么背景"这类问题。
  // 后台改简历时这段经常被顺手改，必须进索引，否则改了搜不到。
  chunks.push({
    id: 'resume::basics',
    kind: 'resume',
    slug: 'resume',
    title: '个人简介',
    heading: '个人简介',
    text: [
      `${resume.basics.name}，${resume.basics.label}。`,
      resume.basics.summary,
      `常驻地：${resume.basics.location.city}。`,
      resume.basics.profiles.map((p) => `${p.network}：${p.url}`).join('；'),
    ]
      .filter(Boolean)
      .join('\n'),
    url: '/resume',
  });

  chunks.push({
    id: 'resume::work',
    kind: 'resume',
    slug: 'resume',
    title: '工作经历',
    heading: '工作经历',
    text: `工作经历（按时间倒序，最近的在前）。关于"他在上一家公司主要负责什么""他现在在做什么""带过多大的团队"这类问题的答案都在这里。\n\n${workText}`,
    url: '/resume',
  });

  chunks.push({
    id: 'resume::education',
    kind: 'resume',
    slug: 'resume',
    title: '教育背景',
    heading: '教育背景',
    text: resume.education
      .map(
        (e) =>
          `教育背景：毕业于${e.institution}（学校），学历是${e.studyType}，专业是${e.area}，就读时间 ${e.startDate} 至 ${e.endDate}。${e.score ?? ''}`,
      )
      .join('\n'),
    url: '/resume',
  });

  chunks.push({
    id: 'resume::skills',
    kind: 'resume',
    slug: 'resume',
    title: '技能',
    heading: '技能',
    text: [
      '技能与技术栈（他会什么）：以 SQL 与 Python 为主，Python 侧主要用 Pandas、NumPy 与 scikit-learn；BI 工具用 Power BI；也会 Java。整体偏数据分析与建模，不是纯工程开发。',
      ...resume.skills.map(
        (g) => `${g.name}：${g.keywords.join('、')}${g.note ? `（${g.note}）` : ''}`,
      ),
    ].join('\n'),
    url: '/resume',
  });

  chunks.push({
    id: 'resume::awards',
    kind: 'resume',
    slug: 'resume',
    title: '荣誉',
    heading: '荣誉',
    text: `获奖与荣誉：${resume.awards.map((a) => `${a.title}（${a.awarder}，${a.date}）`).join('；')}`,
    url: '/resume',
  });

  return chunks;
}

function splitByHeading(body: string): Array<{ heading: string; anchor: string; text: string }> {
  const lines = body.split('\n');
  const sections: Array<{ heading: string; anchor: string; text: string }> = [];
  let current: { heading: string; anchor: string; lines: string[] } | null = null;
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;

    const match = !inFence && /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      if (current) {
        sections.push({ ...current, text: current.lines.join('\n').trim() });
      }
      const heading = match[1].replace(/[*`_]/g, '').trim();
      current = { heading, anchor: slugify(heading), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) sections.push({ ...current, text: current.lines.join('\n').trim() });

  return sections.filter((s) => s.text.length > 40);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[!-/:-@[-`{-~]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
