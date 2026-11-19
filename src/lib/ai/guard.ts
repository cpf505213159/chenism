/**
 * 限流与预算闸门。内存实现，按实例计——个人站的量级不需要引入 Redis，
 * 这里的目的不是防攻击，而是防止一个刷接口的人把额度烧掉。
 */

type Bucket = { count: number; resetAt: number };

const perIp = new Map<string, Bucket>();
const globalBucket: Bucket = { count: 0, resetAt: 0 };

const IP_LIMIT = Number(process.env.ASK_IP_LIMIT ?? 30);
const IP_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_LIMIT = Number(process.env.ASK_GLOBAL_LIMIT ?? 500);
const GLOBAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 过期桶的清理：不做的话长期运行会一直增长 */
function sweep(map: Map<string, Bucket>, now: number) {
  if (map.size < 500) return;
  for (const [key, bucket] of map) {
    if (now > bucket.resetAt) map.delete(key);
  }
}

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: 'rate_limited'; retryAfter: number };

/** 可选小结端点的独立限流：与主检索分开计，避免一次提问消耗两次配额，也防止刷模型烧额度 */
const summarizeIp = new Map<string, Bucket>();
const SUMMARIZE_IP_LIMIT = Number(process.env.SUMMARIZE_IP_LIMIT ?? 15);

export function checkSummarizeLimit(ip: string): GuardResult {
  const now = Date.now();
  sweep(summarizeIp, now);
  const bucket = summarizeIp.get(ip);
  if (!bucket || now > bucket.resetAt) {
    summarizeIp.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= SUMMARIZE_IP_LIMIT) {
    return {
      ok: false,
      reason: 'rate_limited',
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  bucket.count += 1;
  return { ok: true };
}

export function checkRateLimit(ip: string): GuardResult {
  const now = Date.now();
  sweep(perIp, now);

  if (now > globalBucket.resetAt) {
    globalBucket.count = 0;
    globalBucket.resetAt = now + GLOBAL_WINDOW_MS;
  }
  if (globalBucket.count >= GLOBAL_LIMIT) {
    return { ok: false, reason: 'rate_limited', retryAfter: 3600 };
  }

  const bucket = perIp.get(ip);
  if (!bucket || now > bucket.resetAt) {
    perIp.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    globalBucket.count += 1;
    return { ok: true };
  }

  if (bucket.count >= IP_LIMIT) {
    return {
      ok: false,
      reason: 'rate_limited',
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  globalBucket.count += 1;
  return { ok: true };
}

export type AiMode = 'off' | 'retrieval' | 'answer';

export function getAiMode(): AiMode {
  const raw = process.env.AI_MODE;
  if (raw === 'off' || raw === 'answer' || raw === 'retrieval') return raw;
  // 默认 retrieval：零模型成本，随时可关
  return 'retrieval';
}

export function isKilled(): boolean {
  return process.env.AI_KILL === '1';
}

/**
 * 匿名日志：默认只记录问题的哈希与命中情况，不记录原始文本、IP、UA。
 * 这是判断"这个功能值不值得留"的唯一依据，也是后续造评测集的原料。
 */
export function logQuery(entry: {
  query: string;
  hit: boolean;
  slugs: string[];
  latencyMs: number;
  mode: AiMode;
}): void {
  const daySalt = new Date().toISOString().slice(0, 10);
  const hash = simpleHash(`${entry.query}::${daySalt}`);

  const line = JSON.stringify({
    qHash: hash,
    hit: entry.hit,
    slugs: entry.slugs,
    latencyMs: entry.latencyMs,
    mode: entry.mode,
    at: new Date().toISOString(),
  });

  console.log(`[ask] ${line}`);

  if (process.env.AI_LOG_QUERIES === '1') {
    // 显式的 14 天收集模式：作者可打开，用于补评测集；默认关闭
    console.log(`[ask:full] ${JSON.stringify({ ...entry, q: entry.query })}`);
  }
}

function simpleHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}
