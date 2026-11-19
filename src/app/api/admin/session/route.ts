import { NextResponse } from 'next/server';
import { getSession, isConfigured } from '@/lib/admin/auth';
import { isAdminEnabled } from '@/lib/admin/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const session = await getSession();
  return NextResponse.json({
    authenticated: Boolean(session),
    user: session?.user ?? null,
    configured: isConfigured(),
  });
}
