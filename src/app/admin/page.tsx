import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/admin/auth';
import { isAdminEnabled } from '@/lib/admin/guard';
import { AdminApp } from './AdminApp';
import { LoginForm } from './LoginForm';

/**
 * 内容后台（入口：/admin）。
 * 默认关闭：生产环境必须显式设置 ADMIN_ENABLED=1 且配好 ADMIN_PASSWORD 才可访问，
 * 否则直接 404，可编辑界面不会被发布出去；即使开启也必须先登录。
 */
// 后台是否启用由运行期环境变量决定（ADMIN_ENABLED），不能静态化：
// 否则构建时没开的话，404 会被烤进产物，线上再设环境变量也进不去。
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '内容后台',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!isAdminEnabled()) notFound();

  const session = await getSession();

  return (
    <div data-admin className="min-h-dvh bg-bg">
      {session ? <AdminApp user={session.user} /> : <LoginForm />}
    </div>
  );
}
