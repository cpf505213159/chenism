import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  checkCredentials,
  createToken,
  isConfigured,
} from '@/lib/admin/auth';
import { isAdminEnabled, isSameOrigin } from '@/lib/admin/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 登录失败限流：同一 IP 五分钟内 5 次 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'local'
  );
}

function tooMany(request: Request): number {
  const now = Date.now();
  const ip = clientIp(request);
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return 0;
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return Math.ceil((entry.resetAt - now) / 1000);
  }
  return 0;
}

export async function POST(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ ok: false, error: '后台未启用' }, { status: 404 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: '来源不合法' }, { status: 403 });
  }

  const retryAfter = tooMany(request);
  if (retryAfter > 0) {
    return NextResponse.json(
      { ok: false, error: `尝试次数过多，${Math.ceil(retryAfter / 60)} 分钟后再试` },
      { status: 429 },
    );
  }

  if (!isConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: '服务端未配置 ADMIN_PASSWORD（至少 6 位）。请在 .env.local 里设置后重启。',
      },
      { status: 500 },
    );
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: '请求体不合法' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!checkCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: '账号或密码不正确' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createToken(username), {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    secure: new URL(request.url).protocol === 'https:',
  });
  return response;
}
