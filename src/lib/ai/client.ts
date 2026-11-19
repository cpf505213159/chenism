/**
 * /api/ask 的客户端封装。
 * /ask 页与悬浮角色共用同一份协议处理，避免两处各写一套判断。
 */

export type Citation = {
  slug: string;
  title: string;
  heading: string;
  quote: string;
  url: string;
  score: number;
};

export type AskResponse = {
  ok: boolean;
  mode?: string;
  latencyMs?: number;
  citations?: Citation[];
  reason?: string;
  message?: string;
  projects?: Array<{ slug: string; title: string }>;
  /** 服务端是否具备"可选小结"能力。为 true 时前端可异步再取一段 AI 小结 */
  enhance?: boolean;
};

/**
 * 可选小结：独立端点的封装。
 * 失败（404 未启用 / 429 限流 / 超时 / 网络错）一律返回 null，
 * 调用方把它当作"这次没有小结"，绝不影响已经展示的原文摘录。
 */
export async function postSummarize(question: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch('/api/ask/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: question.trim() }),
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { summary?: string | null };
    return typeof data.summary === 'string' && data.summary.length > 0 ? data.summary : null;
  } catch {
    return null;
  }
}

export async function postAsk(question: string): Promise<AskResponse> {
  const q = question.trim();
  if (q.length < 2) {
    return { ok: false, reason: 'too_short', message: '问题太短了，写两个字以上。' };
  }

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q }),
    });

    // 端点可能被 AI_MODE=off 整块关掉（404），也可能被限流（429）。
    // 这两种都不是"没命中"，要给出准确的说法，别让用户以为站里没内容。
    if (res.status === 404) {
      return {
        ok: false,
        reason: 'disabled',
        message: '站内助手暂时关闭，可以直接翻项目列表。',
      };
    }

    const data = (await res.json()) as AskResponse;
    return data;
  } catch {
    return {
      ok: false,
      reason: 'network',
      message: '请求失败了。这通常是站点正在重新部署，稍后再试。',
    };
  }
}
