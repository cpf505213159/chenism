import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/admin/auth';
import { isAdminEnabled } from '@/lib/admin/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  if (!isAdminEnabled()) {
    return NextResponse.json({ ok: false, error: '后台未启用' }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
