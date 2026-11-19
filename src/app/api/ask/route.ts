import { NextResponse } from 'next/server';
import { retrieve, listSlugs } from '@/lib/ai/retrieve';
import { checkRateLimit, getAiMode, isKilled, logQuery } from '@/lib/ai/guard';
import { isSummarizeEnabled } from '@/lib/ai/summarize';

// AI_MODE=off 时整个端点不存在（404），页面入口也不渲染
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { q?: unknown };

export async function POST(request: Request) {
  const mode = getAiMode();
  if (mode === 'off') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (isKilled()) {
    return NextResponse.json(
      {
        ok: false,
        mode,
        reason: 'disabled',
        message: '站内助手暂时关闭。可以直接翻项目列表。',
        projects: listSlugs(),
      },
      { status: 200 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 });
  }

  const q = typeof body.q === 'string' ? body.q.trim() : '';
  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, reason: 'too_short', message: '问题太短了，写两个字以上。' },
      { status: 400 },
    );
  }
  if (q.length > 120) {
    return NextResponse.json(
      { ok: false, reason: 'too_long', message: '问题请控制在 120 字以内。' },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const guard = checkRateLimit(ip);
  if (!guard.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'rate_limited',
        message: `问得有点快，${Math.ceil(guard.retryAfter / 60)} 分钟后再试。`,
        projects: listSlugs(),
      },
      { status: 429 },
    );
  }

  const started = Date.now();
  const citations = retrieve(q, 3);
  const latencyMs = Date.now() - started;

  logQuery({ query: q, hit: citations.length > 0, slugs: citations.map((c) => c.slug), latencyMs, mode });

  // 主端点始终只做检索直出，不等待任何模型调用。
  // enhance 只是"能力标记"：告诉前端可以去异步取一段可选小结，命中才有意义。
  return NextResponse.json({
    ok: true,
    mode,
    latencyMs,
    citations,
    reason: citations.length > 0 ? 'hit' : 'no_match',
    enhance: citations.length > 0 && isSummarizeEnabled(),
    ...(citations.length === 0
      ? {
          message: '站内没有找到相关内容。这个站只覆盖本人做过的项目与简历。',
          projects: listSlugs(),
        }
      : {}),
  });
}

export function GET() {
  return NextResponse.json(
    { error: 'method_not_allowed', hint: '用 POST，body: { "q": "你的问题" }' },
    { status: 405 },
  );
}
