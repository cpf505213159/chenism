import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSummaryMessages,
  isSummarizeEnabled,
  summarizeQuestion,
} from './summarize';
import type { Citation } from './retrieve';

const CITES: Citation[] = [
  {
    slug: 'cs-staffing',
    title: '客服排班预测',
    heading: '项目概览',
    quote: '用时间序列模型预测每小时进线量，误差下降 18%。',
    url: '/projects/cs-staffing',
    score: 3.2,
  },
  {
    slug: 'ecom-churn',
    title: '电商流失预警',
    heading: '关键决策',
    quote: '把用户分层与流失预测结合，AUC 从 0.69 提升到 0.78。',
    url: '/projects/ecom-churn',
    score: 2.1,
  },
];

/** 关掉真实网络；每个用例显式决定 fetch 行为 */
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '  这是基于原文的小结。  ' } }] }),
    })),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isSummarizeEnabled（默认关闭，需显式开启 + 配 key）', () => {
  it('默认 retrieval、无 key → 关闭', () => {
    vi.stubEnv('AI_MODE', 'retrieval');
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    expect(isSummarizeEnabled()).toBe(false);
  });

  it('answer 但没配 key → 仍关闭（不能退化成裸奔）', () => {
    vi.stubEnv('AI_MODE', 'answer');
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    expect(isSummarizeEnabled()).toBe(false);
  });

  it('配了 key 但仍是 retrieval → 关闭', () => {
    vi.stubEnv('AI_MODE', 'retrieval');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
    expect(isSummarizeEnabled()).toBe(false);
  });

  it('answer + key → 开启', () => {
    vi.stubEnv('AI_MODE', 'answer');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
    vi.stubEnv('AI_KILL', '0');
    expect(isSummarizeEnabled()).toBe(true);
  });

  it('AI_KILL=1 时即使配置齐全也关闭', () => {
    vi.stubEnv('AI_MODE', 'answer');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
    vi.stubEnv('AI_KILL', '1');
    expect(isSummarizeEnabled()).toBe(false);
  });
});

describe('buildSummaryMessages（grounded 约束）', () => {
  const messages = buildSummaryMessages('哪个项目用到了时间序列', CITES);

  it('system 明确禁止外部知识与推断', () => {
    expect(messages[0].content).toContain('禁止引入任何外部知识');
    expect(messages[0].content).toContain('站内没有提到');
  });

  it('证据块包含每条摘录并带编号', () => {
    const user = messages[1].content;
    expect(user).toContain('[1]');
    expect(user).toContain('[2]');
    expect(user).toContain('时间序列模型预测');
    expect(user).toContain('AUC 从 0.69');
  });
});

describe('summarizeQuestion（速度优先：失败一律静默回退）', () => {
  it('未启用时不发起任何网络请求', async () => {
    vi.stubEnv('AI_MODE', 'retrieval');
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    const result = await summarizeQuestion('时间序列');
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('启用且命中时返回小结并去掉首尾空白', async () => {
    vi.stubEnv('AI_MODE', 'answer');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
    vi.stubEnv('AI_KILL', '0');
    const result = await summarizeQuestion('哪个项目用到了时间序列');
    expect(result?.text).toBe('这是基于原文的小结。');
    expect(result?.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('站内没有命中时不调用模型（省钱省时）', async () => {
    vi.stubEnv('AI_MODE', 'answer');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
    vi.stubEnv('AI_KILL', '0');
    const result = await summarizeQuestion('有 Kubernetes 集群运维经验吗');
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('非 2xx 静默回退', async () => {
    vi.stubEnv('AI_MODE', 'answer');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
    vi.stubEnv('AI_KILL', '0');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    expect(await summarizeQuestion('时间序列')).toBeNull();
  });

  it('网络抛错静默回退', async () => {
    vi.stubEnv('AI_MODE', 'answer');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
    vi.stubEnv('AI_KILL', '0');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    expect(await summarizeQuestion('时间序列')).toBeNull();
  });

  it('空内容静默回退', async () => {
    vi.stubEnv('AI_MODE', 'answer');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
    vi.stubEnv('AI_KILL', '0');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    })));
    expect(await summarizeQuestion('时间序列')).toBeNull();
  });

  it('超时（abort）静默回退，且请求带 signal 与 Bearer 头', async () => {
    vi.stubEnv('AI_MODE', 'answer');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
    vi.stubEnv('AI_KILL', '0');
    vi.stubEnv('DEEPSEEK_TIMEOUT_MS', '5');
    // 模拟一个被 signal 中断的请求
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      ),
    );
    expect(await summarizeQuestion('时间序列')).toBeNull();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeTruthy();
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-test');
  });
});
