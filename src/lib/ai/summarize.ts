import { retrieve, type Citation } from './retrieve';
import { getAiMode, isKilled } from './guard';

/**
 * 可选的「答案小结」层（DeepSeek）。
 *
 * 设计约束（都很重要，改之前先读完）：
 *
 * 1. **默认关闭**。只有 `AI_MODE=answer` 且配置了 `DEEPSEEK_API_KEY` 时才启用。
 *    默认的 `retrieval` 模式是纯 BM25，零模型调用、零额外延迟、零成本。
 * 2. **不参与检索，也不参与命中判定**。命中与否完全由 retrieve() 决定。
 *    在线更新简历/项目后能否被检索到，取决于 mtime 指纹与缓存失效，与本模块无关。
 *    因此引入模型不会、也不应该改变检索速度与命中率。
 * 3. **证据只来自站内**。服务端用 q 重新 retrieve，不信任前端传来的任何"证据"，
 *    避免被注入伪造内容。模型只能改写这几条原文摘录，不能引入外部知识。
 * 4. **严格超时 + 静默失败**。超时/网络错/非 2xx/空内容一律返回 null，
 *    前端拿到 null 就不渲染小结区，已经展示的原文摘录完全不受影响。
 * 5. **秘钥只在服务端读**。绝不硬编码、绝不下发到客户端、绝不写进日志。
 */

const DEFAULT_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_TIMEOUT_MS = 2500;
/** 小结只是一段速读文字，限制 token 既省钱也保证响应快 */
const MAX_TOKENS = 220;

/** 供 /api/ask 在响应里带出"是否具备小结能力"，前端据此决定是否发第二次请求 */
export function isSummarizeEnabled(): boolean {
  if (getAiMode() !== 'answer') return false;
  if (isKilled()) return false;
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export type SummaryMessage = { role: 'system' | 'user'; content: string };

const SYSTEM_PROMPT = [
  '你是个人简历站里的「原文小结」助手。用户会给你一个问题，以及从站内检索到的几条原文摘录。',
  '硬性规则：',
  '1. 只能使用摘录里明确写出的信息回答，禁止引入任何外部知识、常识或推断；',
  '2. 摘录里没有的信息，直接说明「站内没有提到」，绝对不要猜测或补充；',
  '3. 用简洁中文回答，2 到 4 句话，不要复述问题，不要用标题、列表或 Markdown；',
  '4. 每个事实后面用 [1] [2] [3] 标注它来自第几条摘录；',
  '5. 这是「改写摘录」而不是「回答问题」：如果摘录不足以回答，就如实说站内内容不足。',
].join('\n');

/** 拼装发送给模型的证据块，导出以便于单测验证 grounded 约束 */
export function buildSummaryMessages(question: string, citations: Citation[]): SummaryMessage[] {
  const evidence = citations
    .map((c, i) => `[${i + 1}] 《${c.title}》· ${c.heading}\n${c.quote}`)
    .join('\n\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `问题：${question}\n\n站内原文摘录（唯一可用信息）：\n${evidence}`,
    },
  ];
}

type ChatCompletion = {
  choices?: Array<{ message?: { content?: string } }>;
};

export type SummaryResult = { text: string; latencyMs: number } | null;

/**
 * 生成小结。任何失败都返回 null —— 调用方必须把 null 当成"没有小结"，
 * 而不是当成错误，这样模型不可用时主检索结果依然完整可用。
 */
export async function summarizeQuestion(question: string): Promise<SummaryResult> {
  if (!isSummarizeEnabled()) return null;

  // 服务端重新检索：证据只可能来自当前索引（后台改完内容立即反映），前端传什么都不信。
  const citations = retrieve(question, 3);
  if (citations.length === 0) return null;

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;

  const endpoint = process.env.DEEPSEEK_ENDPOINT?.trim() || DEFAULT_ENDPOINT;
  const model = process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;
  const parsedTimeout = Number(process.env.DEEPSEEK_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildSummaryMessages(question, citations),
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        stream: false,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = (await res.json()) as ChatCompletion;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    return { text: text.slice(0, 800), latencyMs: Date.now() - started };
  } catch {
    // 超时（abort）、网络错误、JSON 解析失败：一律静默回退到"无小结"
    return null;
  } finally {
    clearTimeout(timer);
  }
}
