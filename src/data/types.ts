/**
 * 站点内容的数据形状。
 * 内容本身放在 content/data/*.json，页面只依赖这里的类型——
 * 这样后台改内容时不需要动 TypeScript 代码。
 */

export type SocialIcon = 'github' | 'mail' | 'rss';

export type SiteConfig = {
  name: string;
  handle: string;
  role: string;
  tagline: string;
  description: string;
  url: string;
  locale: string;
  email: string;
  location: string;
  available: string;
  socials: Array<{ label: string; href: string; icon: SocialIcon }>;
  nav: Array<{ label: string; href: string }>;
};

export type ResumeWork = {
  name: string;
  position: string;
  startDate: string; // YYYY-MM
  endDate?: string; // 缺省 = 至今
  summary: string;
  highlights: string[];
  stack: string[];
  location?: string;
};

export type ResumeEducation = {
  institution: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate: string;
  score?: string;
  highlights?: string[];
};

export type ResumeSkillGroup = {
  name: string;
  keywords: string[];
  note?: string;
};

export type ResumeAward = {
  title: string;
  date: string;
  awarder: string;
};

export type Resume = {
  basics: {
    name: string;
    label: string;
    email: string;
    url: string;
    summary: string;
    location: { city: string; countryCode: string };
    profiles: Array<{ network: string; username: string; url: string }>;
  };
  work: ResumeWork[];
  education: ResumeEducation[];
  skills: ResumeSkillGroup[];
  awards: ResumeAward[];
};
