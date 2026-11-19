'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// 后台编辑的是 content/*.json 的任意结构：字段由使用者在表单里动态增删改，
// 编译期无法穷举。索引值放开为 any，读写安全由服务端写入时的 zod 校验保证。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

type ProjectRecord = {
  slug: string;
  frontmatter: AnyRecord;
  body: string;
};

type State = {
  site: AnyRecord;
  resume: AnyRecord;
  projects: ProjectRecord[];
};

type Tab = 'site' | 'resume' | 'projects';

const input =
  'w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[0.85rem] text-ink outline-none transition-colors focus:border-accent';
const area =
  'w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[0.85rem] leading-relaxed text-ink outline-none transition-colors focus:border-accent';
const label = 'mb-1 block font-mono text-[0.65rem] uppercase tracking-[0.1em] text-faint';
const card = 'rounded-lg border border-line bg-surface/60 p-4';

function Field({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={label}>{title}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] text-faint">{hint}</span>}
    </label>
  );
}

export function AdminApp({ user }: { user: string }) {
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState<Tab>('site');
  const [activeSlug, setActiveSlug] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // 有未保存改动时拦截关闭，避免手滑丢掉一屏编辑
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    fetch('/api/admin/state')
      .then((r) => {
        if (r.status === 401) {
          // 会话失效要整页刷新，让服务端重新读 httpOnly Cookie 渲染登录页；
          // 用 router.push 不会重新走服务端鉴权，属于刻意保留的硬跳转。
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/admin';
          throw new Error('unauthorized');
        }
        return r.json();
      })
      .then((data: State) => {
        setState(data);
        setActiveSlug(data.projects[0]?.slug ?? '');
      })
      .catch(() => setError('读取内容失败，请确认开发服务器已启动'));
  }, []);

  const flash = useCallback((text: string, ok = true) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const post = useCallback(
    async (payload: AnyRecord) => {
      setBusy(true);
      try {
        const res = await fetch('/api/admin/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? '保存失败');
        flash('已保存 · 页面会自动刷新');
        setDirty(false);
        return json;
      } catch (e) {
        flash(e instanceof Error ? e.message : '保存失败', false);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [flash],
  );

  const project = useMemo(
    () => state?.projects.find((p) => p.slug === activeSlug),
    [state, activeSlug],
  );

  if (error) {
    return <p className="p-10 text-[0.9rem] text-accent">{error}</p>;
  }

  if (!state) {
    return <p className="p-10 text-[0.9rem] text-faint">正在读取内容…</p>;
  }

  const touch = () => setDirty(true);

  const patchSite = (patch: AnyRecord) => {
    touch();
    setState({ ...state, site: { ...state.site, ...patch } });
  };

  const patchResume = (patch: AnyRecord) => {
    touch();
    setState({ ...state, resume: { ...state.resume, ...patch } });
  };

  const patchProject = (patch: AnyRecord) => {
    touch();
    setState({
      ...state,
      projects: state.projects.map((p) =>
        p.slug === activeSlug ? { ...p, frontmatter: { ...p.frontmatter, ...patch } } : p,
      ),
    });
  };

  async function logout() {
    if (dirty && !window.confirm('有未保存的改动，确定退出吗？')) return;
    await fetch('/api/admin/logout', { method: 'POST' });
    // 同上：登出后需要整页刷新让服务端重新鉴权
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/admin';
  }

  async function createProject() {
    const slug = window.prompt('新项目的 slug（小写字母、数字、连字符，例如 ecom-rfm）');
    if (!slug) return;
    const title = window.prompt('项目标题') ?? '新项目';
    const json = await post({ kind: 'create-project', slug, title });
    if (json?.ok) {
      const res = await fetch('/api/admin/state').then((r) => r.json());
      setState(res);
      setActiveSlug(slug);
    }
  }

  async function removeProject(slug: string) {
    if (!window.confirm(`删除项目「${slug}」？文件会真的被删掉。`)) return;
    const json = await post({ kind: 'delete-project', slug });
    if (json?.ok) {
      const res = await fetch('/api/admin/state').then((r) => r.json());
      setState(res);
      setActiveSlug(res.projects[0]?.slug ?? '');
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-8">
      {/* 顶栏 */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="kicker mb-1">内容后台</p>
          <h1 className="text-[1.4rem] font-semibold tracking-[-0.02em]">编辑站点内容</h1>
          <p className="mt-1 text-[0.78rem] text-faint">
            改动只写入 <code className="font-mono">content/</code>，不碰代码；保存后页面与站内检索会立即刷新。
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Link
          href="/"
          className="rounded-md border border-line px-3 py-1.5 text-[0.82rem] text-muted hover:text-ink"
        >
          ← 返回站点
        </Link>
        <span className="font-mono text-[0.72rem] text-faint">
          {user}
          {dirty && <span className="ml-1.5 text-accent">· 未保存</span>}
        </span>
        <button
          type="button"
          onClick={logout}
          className="rounded-md border border-line px-3 py-1.5 text-[0.82rem] text-muted hover:text-accent"
        >
          退出
        </button>
        <nav className="flex gap-1">
          {(
            [
              ['site', '基本信息'],
              ['resume', '简历'],
              ['projects', '项目'],
            ] as Array<[Tab, string]>
          ).map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                tab === key
                  ? 'rounded-md bg-ink px-3 py-1.5 text-[0.82rem] text-bg'
                  : 'rounded-md border border-line px-3 py-1.5 text-[0.82rem] text-muted hover:text-ink'
              }
            >
              {text}
            </button>
          ))}
        </nav>
        </div>
      </div>

      {/* 基本信息 */}
      {tab === 'site' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field title="姓名">
              <input
                className={input}
                value={state.site.name ?? ''}
                onChange={(e) => patchSite({ name: e.target.value })}
              />
            </Field>
            <Field title="英文标识 handle">
              <input
                className={input}
                value={state.site.handle ?? ''}
                onChange={(e) => patchSite({ handle: e.target.value })}
              />
            </Field>
            <Field title="职位">
              <input
                className={input}
                value={state.site.role ?? ''}
                onChange={(e) => patchSite({ role: e.target.value })}
              />
            </Field>
            <Field title="所在地">
              <input
                className={input}
                value={state.site.location ?? ''}
                onChange={(e) => patchSite({ location: e.target.value })}
              />
            </Field>
            <Field title="邮箱">
              <input
                className={input}
                value={state.site.email ?? ''}
                onChange={(e) => patchSite({ email: e.target.value })}
              />
            </Field>
            <Field title="求职状态（首页顶部那行）">
              <input
                className={input}
                value={state.site.available ?? ''}
                onChange={(e) => patchSite({ available: e.target.value })}
              />
            </Field>
          </div>

          <Field title="首页一句话定位" hint="显示在姓名下方，建议一行为宜">
            <input
              className={input}
              value={state.site.tagline ?? ''}
              onChange={(e) => patchSite({ tagline: e.target.value })}
            />
          </Field>

          <Field title="站点描述" hint="用于搜索引擎与分享卡片">
            <textarea
              className={area}
              rows={3}
              value={state.site.description ?? ''}
              onChange={(e) => patchSite({ description: e.target.value })}
            />
          </Field>

          <div className={card}>
            <p className="mb-3 text-[0.85rem] font-medium">社交链接</p>
            <div className="space-y-2">
              {(state.site.socials ?? []).map((s: AnyRecord, i: number) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={input}
                    value={s.label ?? ''}
                    placeholder="名称"
                    onChange={(e) => {
                      const socials = [...state.site.socials];
                      socials[i] = { ...s, label: e.target.value };
                      patchSite({ socials });
                    }}
                  />
                  <input
                    className={input}
                    value={s.href ?? ''}
                    placeholder="链接"
                    onChange={(e) => {
                      const socials = [...state.site.socials];
                      socials[i] = { ...s, href: e.target.value };
                      patchSite({ socials });
                    }}
                  />
                  <select
                    className={input}
                    value={s.icon ?? 'github'}
                    onChange={(e) => {
                      const socials = [...state.site.socials];
                      socials[i] = { ...s, icon: e.target.value };
                      patchSite({ socials });
                    }}
                  >
                    <option value="github">GitHub</option>
                    <option value="mail">邮箱</option>
                    <option value="rss">RSS</option>
                  </select>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-line px-2 text-[0.75rem] text-faint hover:text-accent"
                    onClick={() =>
                      patchSite({ socials: state.site.socials.filter((_: unknown, j: number) => j !== i) })
                    }
                  >
                    删
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 rounded-md border border-line px-2.5 py-1 text-[0.78rem] text-muted hover:text-ink"
              onClick={() =>
                patchSite({ socials: [...(state.site.socials ?? []), { label: '', href: '', icon: 'github' }] })
              }
            >
              + 添加链接
            </button>
          </div>

          <button
            type="button"
            disabled={busy}
            className="rounded-md bg-ink px-4 py-2 text-[0.85rem] text-bg disabled:opacity-50"
            onClick={() => post({ kind: 'site', data: state.site })}
          >
            保存基本信息
          </button>
        </div>
      )}

      {/* 简历 */}
      {tab === 'resume' && (
        <div className="space-y-6">
          <Field title="个人概述">
            <textarea
              className={area}
              rows={4}
              value={state.resume.basics?.summary ?? ''}
              onChange={(e) =>
                patchResume({ basics: { ...state.resume.basics, summary: e.target.value } })
              }
            />
          </Field>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.9rem] font-medium">工作经历</p>
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 text-[0.75rem] text-muted hover:text-ink"
                onClick={() =>
                  patchResume({
                    work: [
                      ...state.resume.work,
                      {
                        name: '',
                        position: '',
                        startDate: '',
                        summary: '',
                        highlights: [],
                        stack: [],
                      },
                    ],
                  })
                }
              >
                + 新增一段
              </button>
            </div>
            <div className="space-y-3">
              {state.resume.work.map((w: AnyRecord, i: number) => (
                <div key={i} className={card}>
                  <div className="mb-2 grid gap-2 sm:grid-cols-4">
                    <Field title="公司">
                      <input
                        className={input}
                        value={w.name ?? ''}
                        onChange={(e) => {
                          const work = [...state.resume.work];
                          work[i] = { ...w, name: e.target.value };
                          patchResume({ work });
                        }}
                      />
                    </Field>
                    <Field title="职位">
                      <input
                        className={input}
                        value={w.position ?? ''}
                        onChange={(e) => {
                          const work = [...state.resume.work];
                          work[i] = { ...w, position: e.target.value };
                          patchResume({ work });
                        }}
                      />
                    </Field>
                    <Field title="开始（YYYY-MM）">
                      <input
                        className={input}
                        value={w.startDate ?? ''}
                        onChange={(e) => {
                          const work = [...state.resume.work];
                          work[i] = { ...w, startDate: e.target.value };
                          patchResume({ work });
                        }}
                      />
                    </Field>
                    <Field title="结束（留空=至今）">
                      <input
                        className={input}
                        value={w.endDate ?? ''}
                        onChange={(e) => {
                          const work = [...state.resume.work];
                          work[i] = { ...w, endDate: e.target.value };
                          patchResume({ work });
                        }}
                      />
                    </Field>
                  </div>
                  <Field title="这一段在做什么">
                    <input
                      className={input}
                      value={w.summary ?? ''}
                      onChange={(e) => {
                        const work = [...state.resume.work];
                        work[i] = { ...w, summary: e.target.value };
                        patchResume({ work });
                      }}
                    />
                  </Field>
                  <div className="mt-2">
                    <Field title="成果（一行一条）">
                      <textarea
                        className={area}
                        rows={4}
                        value={(w.highlights ?? []).join('\n')}
                        onChange={(e) => {
                          const work = [...state.resume.work];
                          work[i] = { ...w, highlights: e.target.value.split('\n').filter(Boolean) };
                          patchResume({ work });
                        }}
                      />
                    </Field>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
                    <Field title="技术栈（逗号分隔）">
                      <input
                        className={input}
                        value={(w.stack ?? []).join(', ')}
                        onChange={(e) => {
                          const work = [...state.resume.work];
                          work[i] = {
                            ...w,
                            stack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          };
                          patchResume({ work });
                        }}
                      />
                    </Field>
                    <Field title="城市">
                      <input
                        className={input}
                        value={w.location ?? ''}
                        onChange={(e) => {
                          const work = [...state.resume.work];
                          work[i] = { ...w, location: e.target.value };
                          patchResume({ work });
                        }}
                      />
                    </Field>
                    <button
                      type="button"
                      className="mt-5 h-8 rounded-md border border-line px-2 text-[0.75rem] text-faint hover:text-accent"
                      onClick={() =>
                        patchResume({ work: state.resume.work.filter((_: unknown, j: number) => j !== i) })
                      }
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.9rem] font-medium">教育背景</p>
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 text-[0.75rem] text-muted hover:text-ink"
                onClick={() =>
                  patchResume({
                    education: [
                      ...state.resume.education,
                      { institution: '', area: '', studyType: '', startDate: '', endDate: '' },
                    ],
                  })
                }
              >
                + 新增
              </button>
            </div>
            <div className="space-y-3">
              {state.resume.education.map((e: AnyRecord, i: number) => (
                <div key={i} className={card}>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ['学校', 'institution'],
                      ['专业', 'area'],
                      ['学历', 'studyType'],
                      ['开始（YYYY-MM）', 'startDate'],
                      ['结束（YYYY-MM）', 'endDate'],
                    ].map(([title, key]) => (
                      <Field key={key} title={title}>
                        <input
                          className={input}
                          value={e[key] ?? ''}
                          onChange={(ev) => {
                            const education = [...state.resume.education];
                            education[i] = { ...e, [key]: ev.target.value };
                            patchResume({ education });
                          }}
                        />
                      </Field>
                    ))}
                    <div className="flex items-end">
                      <button
                        type="button"
                        className="h-8 w-full rounded-md border border-line text-[0.75rem] text-faint hover:text-accent"
                        onClick={() =>
                          patchResume({
                            education: state.resume.education.filter(
                              (_: unknown, j: number) => j !== i,
                            ),
                          })
                        }
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.9rem] font-medium">技能分组</p>
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 text-[0.75rem] text-muted hover:text-ink"
                onClick={() =>
                  patchResume({
                    skills: [...state.resume.skills, { name: '', keywords: [], note: '' }],
                  })
                }
              >
                + 新增
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {state.resume.skills.map((g: AnyRecord, i: number) => (
                <div key={i} className={card}>
                  <div className="flex gap-2">
                    <input
                      className={input}
                      placeholder="分组名"
                      value={g.name ?? ''}
                      onChange={(e) => {
                        const skills = [...state.resume.skills];
                        skills[i] = { ...g, name: e.target.value };
                        patchResume({ skills });
                      }}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-md border border-line px-2 text-[0.75rem] text-faint hover:text-accent"
                      onClick={() =>
                        patchResume({
                          skills: state.resume.skills.filter((_: unknown, j: number) => j !== i),
                        })
                      }
                    >
                      删
                    </button>
                  </div>
                  <input
                    className={`${input} mt-2`}
                    placeholder="关键词，逗号分隔"
                    value={(g.keywords ?? []).join(', ')}
                    onChange={(e) => {
                      const skills = [...state.resume.skills];
                      skills[i] = {
                        ...g,
                        keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      };
                      patchResume({ skills });
                    }}
                  />
                  <input
                    className={`${input} mt-2`}
                    placeholder="补充说明（可选）"
                    value={g.note ?? ''}
                    onChange={(e) => {
                      const skills = [...state.resume.skills];
                      skills[i] = { ...g, note: e.target.value };
                      patchResume({ skills });
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.9rem] font-medium">荣誉</p>
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 text-[0.75rem] text-muted hover:text-ink"
                onClick={() =>
                  patchResume({
                    awards: [...state.resume.awards, { title: '', date: '', awarder: '' }],
                  })
                }
              >
                + 新增
              </button>
            </div>
            <div className="space-y-2">
              {state.resume.awards.map((a: AnyRecord, i: number) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={input}
                    placeholder="奖项"
                    value={a.title ?? ''}
                    onChange={(e) => {
                      const awards = [...state.resume.awards];
                      awards[i] = { ...a, title: e.target.value };
                      patchResume({ awards });
                    }}
                  />
                  <input
                    className={input}
                    placeholder="颁发方"
                    value={a.awarder ?? ''}
                    onChange={(e) => {
                      const awards = [...state.resume.awards];
                      awards[i] = { ...a, awarder: e.target.value };
                      patchResume({ awards });
                    }}
                  />
                  <input
                    className={`${input} max-w-[120px]`}
                    placeholder="YYYY-MM"
                    value={a.date ?? ''}
                    onChange={(e) => {
                      const awards = [...state.resume.awards];
                      awards[i] = { ...a, date: e.target.value };
                      patchResume({ awards });
                    }}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-line px-2 text-[0.75rem] text-faint hover:text-accent"
                    onClick={() =>
                      patchResume({ awards: state.resume.awards.filter((_: unknown, j: number) => j !== i) })
                    }
                  >
                    删
                  </button>
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            disabled={busy}
            className="rounded-md bg-ink px-4 py-2 text-[0.85rem] text-bg disabled:opacity-50"
            onClick={() => post({ kind: 'resume', data: state.resume })}
          >
            保存简历
          </button>
        </div>
      )}

      {/* 项目 */}
      {tab === 'projects' && (
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <aside>
            <div className="mb-2 flex items-center justify-between">
              <p className="kicker">项目列表</p>
              <button
                type="button"
                className="rounded border border-line px-1.5 py-0.5 text-[0.72rem] text-muted hover:text-ink"
                onClick={createProject}
              >
                + 新建
              </button>
            </div>
            <ul className="space-y-1">
              {state.projects.map((p) => (
                <li key={p.slug}>
                  <button
                    type="button"
                    onClick={() => setActiveSlug(p.slug)}
                    className={
                      p.slug === activeSlug
                        ? 'w-full rounded-md bg-surface-2 px-2 py-1.5 text-left text-[0.82rem] text-ink'
                        : 'w-full rounded-md px-2 py-1.5 text-left text-[0.82rem] text-muted hover:text-ink'
                    }
                  >
                    {p.frontmatter.title ?? p.slug}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-w-0 space-y-4">
            {!project && <p className="text-[0.85rem] text-faint">先选一个项目</p>}

            {project && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field title="标题（≤16 字，太长会压分享卡）">
                    <input
                      className={input}
                      value={project.frontmatter.title ?? ''}
                      onChange={(e) => patchProject({ title: e.target.value })}
                    />
                  </Field>
                  <Field title="分享卡短句（≤24 字，可留空）">
                    <input
                      className={input}
                      value={project.frontmatter.ogTagline ?? ''}
                      onChange={(e) => patchProject({ ogTagline: e.target.value })}
                    />
                  </Field>
                </div>

                <Field title="一句话摘要（40–120 字：做了什么 + 带来什么）">
                  <textarea
                    className={area}
                    rows={2}
                    value={project.frontmatter.summary ?? ''}
                    onChange={(e) => patchProject({ summary: e.target.value })}
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-4">
                  <Field title="我的角色">
                    <input
                      className={input}
                      value={project.frontmatter.role ?? ''}
                      onChange={(e) => patchProject({ role: e.target.value })}
                    />
                  </Field>
                  <Field title="开始（YYYY-MM）">
                    <input
                      className={input}
                      value={project.frontmatter.period?.start ?? ''}
                      onChange={(e) =>
                        patchProject({ period: { ...project.frontmatter.period, start: e.target.value } })
                      }
                    />
                  </Field>
                  <Field title="结束（留空=至今）">
                    <input
                      className={input}
                      value={project.frontmatter.period?.end ?? ''}
                      onChange={(e) =>
                        patchProject({ period: { ...project.frontmatter.period, end: e.target.value } })
                      }
                    />
                  </Field>
                  <Field title="排序（小的在前）">
                    <input
                      className={input}
                      type="number"
                      value={project.frontmatter.order ?? 90}
                      onChange={(e) => patchProject({ order: Number(e.target.value) })}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field title="状态">
                    <select
                      className={input}
                      value={project.frontmatter.status ?? 'shipped'}
                      onChange={(e) => patchProject({ status: e.target.value })}
                    >
                      <option value="shipped">已上线</option>
                      <option value="wip">进行中</option>
                      <option value="archived">已归档</option>
                      <option value="concept">概念</option>
                    </select>
                  </Field>
                  <Field title="团队">
                    <input
                      className={input}
                      value={project.frontmatter.team ?? ''}
                      onChange={(e) => patchProject({ team: e.target.value })}
                    />
                  </Field>
                  <Field title="所属公司">
                    <input
                      className={input}
                      value={project.frontmatter.company ?? ''}
                      onChange={(e) => patchProject({ company: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field title="技术栈（逗号分隔）">
                    <input
                      className={input}
                      value={(project.frontmatter.stack ?? []).join(', ')}
                      onChange={(e) =>
                        patchProject({
                          stack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                    />
                  </Field>
                  <Field title="标签（逗号分隔）">
                    <input
                      className={input}
                      value={(project.frontmatter.tags ?? []).join(', ')}
                      onChange={(e) =>
                        patchProject({
                          tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field title="源码链接">
                    <input
                      className={input}
                      value={project.frontmatter.repoUrl ?? ''}
                      onChange={(e) => patchProject({ repoUrl: e.target.value })}
                    />
                  </Field>
                  <Field title="演示链接（可选）">
                    <input
                      className={input}
                      value={project.frontmatter.demoUrl ?? ''}
                      onChange={(e) => patchProject({ demoUrl: e.target.value })}
                    />
                  </Field>
                  <Field title="更新日期（YYYY-MM-DD）">
                    <input
                      className={input}
                      value={project.frontmatter.updatedAt ?? ''}
                      onChange={(e) => patchProject({ updatedAt: e.target.value })}
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2 text-[0.82rem] text-muted">
                  <input
                    type="checkbox"
                    checked={Boolean(project.frontmatter.featured)}
                    onChange={(e) => patchProject({ featured: e.target.checked })}
                  />
                  首页精选（最多 3 个）
                </label>

                <Field title="脱敏声明（可选）">
                  <input
                    className={input}
                    value={project.frontmatter.confidentiality ?? ''}
                    onChange={(e) => patchProject({ confidentiality: e.target.value })}
                  />
                </Field>

                {/* 指标 */}
                <div className={card}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[0.85rem] font-medium">结果指标</p>
                    <button
                      type="button"
                      className="rounded border border-line px-2 py-0.5 text-[0.75rem] text-muted hover:text-ink"
                      onClick={() =>
                        patchProject({
                          metrics: [
                            ...(project.frontmatter.metrics ?? []),
                            { label: '', baseline: '', value: '', method: '', direction: '' },
                          ],
                        })
                      }
                    >
                      + 添加指标
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(project.frontmatter.metrics ?? []).map((m: AnyRecord, i: number) => (
                      <div key={i} className="grid gap-2 border-b border-line pb-3 last:border-0 last:pb-0 sm:grid-cols-12">
                        <div className="sm:col-span-3">
                          <Field title="指标名">
                            <input
                              className={input}
                              value={m.label ?? ''}
                              onChange={(e) => {
                                const metrics = [...project.frontmatter.metrics];
                                metrics[i] = { ...m, label: e.target.value };
                                patchProject({ metrics });
                              }}
                            />
                          </Field>
                        </div>
                        <div className="sm:col-span-2">
                          <Field title="基线">
                            <input
                              className={input}
                              value={m.baseline ?? ''}
                              onChange={(e) => {
                                const metrics = [...project.frontmatter.metrics];
                                metrics[i] = { ...m, baseline: e.target.value };
                                patchProject({ metrics });
                              }}
                            />
                          </Field>
                        </div>
                        <div className="sm:col-span-2">
                          <Field title="结果">
                            <input
                              className={input}
                              value={m.value ?? ''}
                              onChange={(e) => {
                                const metrics = [...project.frontmatter.metrics];
                                metrics[i] = { ...m, value: e.target.value };
                                patchProject({ metrics });
                              }}
                            />
                          </Field>
                        </div>
                        <div className="sm:col-span-4">
                          <Field title="衡量方式（必填）">
                            <input
                              className={input}
                              value={m.method ?? ''}
                              onChange={(e) => {
                                const metrics = [...project.frontmatter.metrics];
                                metrics[i] = { ...m, method: e.target.value };
                                patchProject({ metrics });
                              }}
                            />
                          </Field>
                        </div>
                        <div className="flex items-end gap-1 sm:col-span-1">
                          <select
                            className={input}
                            value={m.direction ?? ''}
                            onChange={(e) => {
                              const metrics = [...project.frontmatter.metrics];
                              metrics[i] = { ...m, direction: e.target.value };
                              patchProject({ metrics });
                            }}
                          >
                            <option value="">—</option>
                            <option value="up">↑</option>
                            <option value="down">↓</option>
                          </select>
                          <button
                            type="button"
                            className="shrink-0 rounded-md border border-line px-1.5 py-1 text-[0.7rem] text-faint hover:text-accent"
                            onClick={() =>
                              patchProject({
                                metrics: project.frontmatter.metrics.filter(
                                  (_: unknown, j: number) => j !== i,
                                ),
                              })
                            }
                          >
                            删
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Field title="正文（Markdown，五段骨架）" hint="## 背景与约束 / 我的角色 / 关键决策与取舍 / 结果 / 复盘">
                  <textarea
                    className={`${area} font-mono text-[0.8rem]`}
                    rows={22}
                    value={project.body}
                    onChange={(e) => {
                      touch();
                      setState({
                        ...state,
                        projects: state.projects.map((p) =>
                          p.slug === activeSlug ? { ...p, body: e.target.value } : p,
                        ),
                      });
                    }}
                  />
                </Field>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md bg-ink px-4 py-2 text-[0.85rem] text-bg disabled:opacity-50"
                    onClick={() =>
                      post({
                        kind: 'project',
                        slug: activeSlug,
                        frontmatter: project.frontmatter,
                        body: project.body,
                      })
                    }
                  >
                    保存这个项目
                  </button>
                  <a
                    href={`/projects/${activeSlug}`}
                    target="_blank"
                    className="rounded-md border border-line px-3 py-2 text-[0.82rem] text-muted hover:text-ink"
                  >
                    预览
                  </a>
                  <button
                    type="button"
                    className="ml-auto rounded-md border border-line px-3 py-2 text-[0.82rem] text-faint hover:text-accent"
                    onClick={() => removeProject(activeSlug)}
                  >
                    删除这个项目
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div
          className={
            toast.ok
              ? 'fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-ink px-4 py-2 text-[0.82rem] text-bg shadow-lg'
              : 'fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-accent px-4 py-2 text-[0.82rem] text-white shadow-lg'
          }
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
