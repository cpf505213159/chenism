import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { listProjects, readResume, readSite } from '@/lib/admin/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    site: readSite(),
    resume: readResume(),
    projects: listProjects(),
  });
}
