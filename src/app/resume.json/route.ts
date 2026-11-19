import { getResume } from '@/data/resume';
import { site } from '@/data/site';

// 后台改完简历要立刻反映到导出的 JSON，所以不能预渲染成静态文件
export const dynamic = 'force-dynamic';

/**
 * /resume.json —— 对齐 JSON Resume schema 的机器可读简历。
 * 与 /resume 页面共用 src/data/resume.ts，不会出现"页面所见 ≠ 导出所见"。
 */
export function GET() {
  const resume = getResume();
  const payload = {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: resume.basics.name,
      label: resume.basics.label,
      email: resume.basics.email,
      url: site.url,
      summary: resume.basics.summary,
      location: {
        city: resume.basics.location.city,
        countryCode: resume.basics.location.countryCode,
      },
      profiles: resume.basics.profiles,
    },
    work: resume.work.map((w) => ({
      name: w.name,
      position: w.position,
      startDate: w.startDate,
      ...(w.endDate ? { endDate: w.endDate } : {}),
      summary: w.summary,
      highlights: w.highlights,
      location: w.location,
    })),
    education: resume.education.map((e) => ({
      institution: e.institution,
      area: e.area,
      studyType: e.studyType,
      startDate: e.startDate,
      endDate: e.endDate,
      score: e.score,
      ...(e.highlights ? { courses: e.highlights } : {}),
    })),
    skills: resume.skills.map((s) => ({
      name: s.name,
      keywords: s.keywords,
      ...(s.note ? { level: s.note } : {}),
    })),
    awards: resume.awards.map((a) => ({
      title: a.title,
      date: a.date,
      awarder: a.awarder,
    })),
    meta: {
      version: 'v1.0.0',
      lastModified: new Date().toISOString(),
      canonical: `${site.url}/resume.json`,
    },
  };

  // 后台在线改完简历要立刻反映到导出的 JSON，所以不能被 CDN / 浏览器缓存。
  // force-dynamic 只保证服务端每次重新执行，响应头仍决定中间层是否留存旧副本。
  return Response.json(payload, {
    headers: { 'cache-control': 'no-store, max-age=0' },
  });
}
