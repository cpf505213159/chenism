import { describe, expect, it } from 'vitest';
import { retrieve, tokenize, invalidateSearchIndex } from './retrieve';

/**
 * 检索的核心契约（不是快照测试）：
 * - 站内确实写过的东西，问得出来就要命中对的 slug；
 * - 站内完全没有的东西，必须敢说"没有"，不能拿泛词硬凑。
 * 这些断言都基于 content/ 的真实内容，改内容时若语义变了，测试会提醒你。
 */
describe('tokenize', () => {
  it('剔除问句虚词后按二元切分', () => {
    const tokens = tokenize('有没有做过用户分层');
    expect(tokens).toContain('用户');
    expect(tokens).toContain('户分');
    expect(tokens).not.toContain('有没有');
  });

  it('英文与数字整词保留', () => {
    expect(tokenize('会用 SQL 吗')).toContain('sql');
  });
});

describe('retrieve', () => {
  it('主题词能命中对应项目', () => {
    const hits = retrieve('有没有做过用户流失相关的分析', 3);
    expect(hits.map((h) => h.slug)).toContain('ecom-churn');
  });

  it('技术名词能抬高项目排序', () => {
    const hits = retrieve('哪个项目用到了时间序列', 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.map((h) => h.slug)).toContain('cs-staffing');
  });

  it('简历块可被检索（含个人简介）', () => {
    const hits = retrieve('洛阳理工学院', 3);
    expect(hits.map((h) => h.slug)).toContain('resume');
  });

  it('站内没有的拉丁技术栈直接拒答', () => {
    expect(retrieve('有 iOS 原生开发经验吗', 3)).toEqual([]);
  });

  it('站内没有的英文工具同样拒答', () => {
    expect(retrieve('有没有做过 Kubernetes 集群运维', 3)).toEqual([]);
  });

  it('纯虚词不产生命中', () => {
    expect(retrieve('他', 3)).toEqual([]);
  });

  it('泛指浏览（做了什么项目）返回项目概览，而不是空', () => {
    const hits = retrieve('做了什么项目', 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.slug !== 'resume')).toBe(true);
  });

  it('仅名词"项目"也走浏览兜底', () => {
    expect(retrieve('项目', 3).length).toBeGreaterThan(0);
  });

  it('问简历概览落到 resume', () => {
    const hits = retrieve('介绍一下你的简历', 3);
    expect(hits.map((h) => h.slug)).toContain('resume');
  });

  it('浏览兜底不会把边界问题误判为有内容', () => {
    expect(retrieve('有没有做过实时数仓', 3)).toEqual([]);
    expect(retrieve('他期望薪资多少', 3)).toEqual([]);
    expect(retrieve('他厉害吗', 3)).toEqual([]);
  });

  it('清缓存后仍能正常检索', () => {
    invalidateSearchIndex();
    expect(retrieve('客服质检', 3).length).toBeGreaterThan(0);
  });
});
