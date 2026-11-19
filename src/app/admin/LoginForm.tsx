'use client';

import Link from 'next/link';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(true));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? '登录失败');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[380px] flex-col justify-center px-5">
      <div className="mb-7">
        <p className="kicker mb-2">内容后台</p>
        <h1 className="text-[1.35rem] font-semibold tracking-[-0.02em]">登录</h1>
        <p className="mt-1.5 text-[0.8rem] leading-relaxed text-faint">
          只有登录后才能修改简历与项目。会话保存在签名 Cookie 里，有效期 7 天。
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block font-mono text-[0.65rem] uppercase tracking-[0.1em] text-faint">
            账号
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-[0.65rem] uppercase tracking-[0.1em] text-faint">
            密码
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none focus:border-accent"
          />
        </label>

        {error && (
          <p className="rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-[0.8rem] text-accent">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="w-full rounded-md bg-ink px-4 py-2.5 text-[0.88rem] font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {busy ? '验证中…' : '进入后台'}
        </button>
      </form>

      {!configured && (
        <div className="mt-6 rounded-md border border-line bg-surface/60 p-3 text-[0.78rem] leading-relaxed text-muted">
          还没设置密码。在项目根目录新建
          <code className="mx-1 rounded border border-line bg-surface-2 px-1 font-mono text-[0.72rem]">
            .env.local
          </code>
          ，写入下面两行后重启 <code className="font-mono text-[0.72rem]">pnpm admin</code>：
          <pre className="mt-2 overflow-x-auto rounded bg-surface-2 p-2 font-mono text-[0.7rem] text-ink">{`ADMIN_PASSWORD=你的密码
ADMIN_USER=admin`}</pre>
        </div>
      )}

      <Link href="/" className="mt-6 text-center text-[0.78rem] text-faint hover:text-ink">
        ← 返回站点
      </Link>
    </div>
  );
}
