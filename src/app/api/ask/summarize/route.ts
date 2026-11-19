import { NextResponse } from 'next/server';
import { summarizeQuestion, isSummarizeEnabled } from '@/lib/ai/summarize';
import { checkSummarizeLimit } from '@/lib/ai/guard';

/**
 * 可选的「答案小结」端点。与 /api/ask 完全解耦：
 * - 前端在拿到主检索结果（原文摘录）之后，才 fire-and-forget 调这里；
 * - 摘要慢/失败/超时都只影响这一小段文字，主检索的速度与结果不受任何影响；
 * - 未启用（默认）时返回 404，前端据此静默跳过，零额外开销。
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { q?: unknown };

export async function POST(request: Request) {
  if (!isSummarizeEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const q = typeof body.q === 'string' ? body.q.trim() : '';
  if (q.length < 2 || q.length > 120) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const guard = checkSummarizeLimit(ip);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  const result = await summarizeQuestion(q);
  // result 为 null 表示"这次没有小结"，是正常结果而非错误：不让前端抛异常
  return NextResponse.json({ ok: true, summary: result?.text ?? null });
}

export function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
}
