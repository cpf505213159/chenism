import { describe, expect, it } from 'vitest';
import { buildChunks } from './chunk';

/**
 * 切块的契约：后台能改的字段，必须都能被检索到。
 * 之前"个人简介"没进索引，导致改完简历搜不到——这类遗漏靠这条测试兜住。
 */
describe('buildChunks', () => {
  const chunks = buildChunks();

  it('每个项目都有概览块', () => {
    const summaries = chunks.filter((c) => c.kind === 'project-summary');
    expect(summaries.length).toBeGreaterThanOrEqual(6);
    for (const c of summaries) {
      expect(c.text).not.toContain('undefined');
      expect(c.url).toMatch(/^\/projects\/[a-z0-9-]+$/);
    }
  });

  it('简历的五个部分都进索引', () => {
    const resumeIds = chunks.filter((c) => c.slug === 'resume').map((c) => c.id);
    expect(resumeIds).toEqual(
      expect.arrayContaining([
        'resume::basics',
        'resume::work',
        'resume::education',
        'resume::skills',
        'resume::awards',
      ]),
    );
  });

  it('个人简介块包含姓名与 summary', () => {
    const basics = chunks.find((c) => c.id === 'resume::basics');
    expect(basics).toBeTruthy();
    expect(basics!.text.length).toBeGreaterThan(60);
    expect(basics!.url).toBe('/resume');
  });

  it('块数控制在设计上限内（<120）', () => {
    expect(chunks.length).toBeLessThan(120);
  });
});
