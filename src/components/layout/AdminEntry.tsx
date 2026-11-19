'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 后台的隐藏入口。
 * 由服务端 SiteFooter 依据运行期 isAdminEnabled() 决定是否渲染：
 * 未开启时这个组件根本不出现，线上站点不留下"这里有后台"的痕迹；
 * 云服务器设 ADMIN_ENABLED=1 后入口即可用（无需重新构建）。
 *
 * 两种进入方式：
 *   1. 任意页面按 Ctrl/Cmd + Shift + A
 *   2. 连点页脚那个看不见的小热区 3 次（1.5 秒内）
 */
export function AdminEntry() {
  const router = useRouter();
  const clicks = useRef<number[]>([]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        router.push('/admin');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  function tap() {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 1500), now];
    if (clicks.current.length >= 3) {
      clicks.current = [];
      router.push('/admin');
    }
  }

  return (
    <span
      aria-hidden
      data-admin-entry
      onClick={tap}
      className="ml-1.5 inline-block h-3 w-3 cursor-default align-middle select-none"
    />
  );
}
