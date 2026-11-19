import { NextResponse } from 'next/server';
import { isSameOrigin, requireAdmin } from '@/lib/admin/guard';
import {
  assertSlug,
  deleteProject,
  readProject,
  writeProject,
  writeResume,
  writeSite,
} from '@/lib/admin/store';
import { invalidateContent } from '@/lib/content/invalidate';
import type { Resume, SiteConfig } from '@/data/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Payload =
  | { kind: 'site'; data: SiteConfig }
  | { kind: 'resume'; data: Resume }
  | {
      kind: 'project';
      slug: string;
      frontmatter: Record<string, unknown>;
      body: string;
    }
  | { kind: 'create-project'; slug: string; title: string }
  | { kind: 'delete-project'; slug: string };

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ ok: false, error: '未登录或后台未启用' }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: '来源不合法' }, { status: 403 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: '请求体不是合法 JSON' }, { status: 400 });
  }

  try {
    switch (payload.kind) {
      case 'site':
        writeSite(payload.data);
        invalidateContent();
        return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });

      case 'resume':
        writeResume(payload.data);
        invalidateContent();
        return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });

      case 'project':
        writeProject(payload.slug, payload.frontmatter, payload.body);
        invalidateContent();
        return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });

      case 'create-project': {
        assertSlug(payload.slug);
        if (readProject(payload.slug)) {
          return NextResponse.json({ ok: false, error: '这个 slug 已存在' }, { status: 409 });
        }
        const today = new Date().toISOString().slice(0, 10);
        writeProject(
          payload.slug,
          {
            title: payload.title || '新项目',
            summary: '用一句话说清做了什么、带来什么结果。',
            role: '你的角色',
            period: { start: today.slice(0, 7) },
            stack: ['SQL'],
            status: 'shipped',
            featured: false,
            order: 90,
            metrics: [],
            tags: [],
            updatedAt: today,
          },
          [
            '## 背景与约束',
            '',
            '这个项目开始时面对的局面、硬约束是什么。',
            '',
            '## 我的角色',
            '',
            '你负责哪一部分，谁配合你。',
            '',
            '## 关键决策与取舍',
            '',
            '**决策一：** 你选了什么方案，放弃了什么，为什么。',
            '',
            '## 结果',
            '',
            '数字写在这里，并在 front matter 的 metrics 里补齐基线与衡量方式。',
            '',
            '## 复盘',
            '',
            '如果重来会怎么改。',
          ].join('\n'),
        );
        invalidateContent();
        return NextResponse.json({ ok: true, slug: payload.slug });
      }

      case 'delete-project':
        deleteProject(payload.slug);
        invalidateContent();
        return NextResponse.json({ ok: true });

      default:
        return NextResponse.json({ ok: false, error: '未知的操作类型' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '写入失败' },
      { status: 500 },
    );
  }
}
