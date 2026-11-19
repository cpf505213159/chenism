'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@/components/ui/Icons';

type Theme = 'light' | 'dark';

/**
 * 主题切换。首屏无闪烁由 layout 里的内联脚本负责（在 HTML 解析前设置 data-theme），
 * 这个组件只处理点击与状态同步。
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // 主题是 layout 内联脚本在 hydration 前写到 <html> 上的，
    // 只能在挂载后读取，否则会和服务端 HTML 不一致（闪烁）。
    const current = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 从 DOM 同步外部状态
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* 隐私模式下 localStorage 可能不可写，忽略 */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      aria-pressed={theme === 'dark'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {theme === 'dark' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
    </button>
  );
}
