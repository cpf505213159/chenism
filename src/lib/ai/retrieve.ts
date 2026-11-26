import fs from 'node:fs';
import path from 'node:path';
import { buildChunks, type Chunk } from './chunk';

export type Citation = {
  slug: string;
  title: string;
  heading: string;
  quote: string;
  url: string;
  score: number;
};

const K1 = 1.2;
const B = 0.75;
/** 绝对分下限：低于它的匹配基本是噪声（"或者""可以"这类词） */
const SCORE_FLOOR = 0.9;
/**
 * 证据强度下限：最相关词的 idf 太低，说明只命中了泛词。
 * 阈值不能太高——"技术栈"这种到处都出现的词 idf 只有 0.8 左右，
 * 但它是完全合理的查询。
 */
const MIN_MAX_IDF = 0.7;

/** 块类型先验：项目概览是"这个项目是什么"的权威入口，简历块罗列了所有技术名，需降权 */
const PRIOR: Record<Chunk['kind'], number> = {
  'project-summary': 1.4,
  'project-section': 1,
  resume: 0.7,
};

/**
 * 明确的"确实没做过 / 不在覆盖范围"的边界主题。
 *
 * 难点在于：这些词并非完全没在正文出现——"数仓"出现在 tracking-quality 的团队分工里
 * （数仓同学负责接调度），"实时"出现在 ecom-segment 的"不做实时、T+1 够用"这类否决句里。
 * 光靠 BM25 的二元词命中，会把"提到过"误当成"做过"，从而对"有没有做过实时数仓"答"有"。
 * 这类能力/诉求站内没有真实产出，直接按无内容处理，宁缺毋滥。
 */
const OUT_OF_SCOPE: RegExp[] = [
  /数仓|数据仓库|实时计算/,
  /kubernetes|k8s|容器编排|docker swarm/,
  /期望薪资|薪资|package/,
  /内推|面试建议/,
];

/** 问句里的高频虚词：不剔除会污染 BM25（"有没有做过"几乎命中所有块） */
const STOP_PHRASES = [
  '有没有',
  '做过',
  '哪些',
  '哪个',
  '什么',
  '怎么',
  '如何',
  '相关',
  '东西',
  '项目',
  '一下',
  '可以',
  '他在',
  '他的',
  '主要',
  '负责',
  '他',
  '的',
  '了',
  '吗',
  '呢',
  // 话语词：它们几乎出现在每篇正文里，留着只会制造假命中
  '或者',
  '建议',
  '帮我',
  '需要',
  '应该',
  '请问',
  '麻烦',
  '谢谢',
  '不能',
  '能不能',
  '能否',
  '是不是',
  '会不会',
  '涉及',
  '用到了',
  '期望',
  '多少',
  '情况',
  '方面',
];

/**
 * 同义词扩展。（搜索 / 检索）这类词在中文里指向同一件事，
 * 但字面完全不同 —— 不做扩展就会出现"两个跟搜索有关的项目"只命中一半。
 */
const SYNONYMS: Record<string, string[]> = {
  搜索: ['检索'],
  检索: ['搜索'],
  组件库: ['设计系统'],
  设计系统: ['组件库'],
  监控: ['可观测性'],
  可观测性: ['监控'],
  延迟: ['耗时'],
  耗时: ['延迟'],
};

type Index = {
  chunks: Chunk[];
  tokens: string[][];
  docFreq: Map<string, number>;
  avgLen: number;
};

let index: Index | null = null;
/** 建索引时内容的"指纹"（各文件 mtime），用于发现外部改动（git pull / 手改文件） */
let indexSignature = '';

/**
 * 内容指纹：项目 MDX + resume.json 的 mtime 拼起来。
 * 每次检索多 9 次 stat（亚毫秒），换来"改完内容立刻能命中"。
 */
function contentSignature(): string {
  const root = path.join(process.cwd(), 'content');
  const files = [path.join(root, 'data', 'resume.json')];
  const projects = path.join(root, 'projects');
  if (fs.existsSync(projects)) {
    for (const f of fs.readdirSync(projects)) {
      if (f.endsWith('.mdx')) files.push(path.join(projects, f));
    }
  }
  return files
    .map((f) => {
      try {
        // turbopackIgnore：content/ 是运行时可写的数据目录（后台在线更新就靠它），
        // 不该被静态 file-tracing 焊进构建产物。这里的路径是运行时拼出来的，
        // 不加注记会让 Turbopack 保守地把整个项目（含 public/）trace 进去，
        // 拖慢云部署甚至超体积上限。
        return `${f}:${fs.statSync(/* turbopackIgnore: true */ f).mtimeMs}`;
      } catch {
        return `${f}:0`;
      }
    })
    .join('|');
}

/** 后台保存后主动调用，避免 mtime 精度问题导致读到旧索引 */
export function invalidateSearchIndex() {
  index = null;
  indexSignature = '';
  // 兜底导航（未命中时列出的"现有项目"）另有独立缓存。
  // 后台新建/删除项目后若不清它，用户会看到已经被删掉的项目。
  slugCache = null;
}

export function tokenize(raw: string): string[] {
  let text = raw.toLowerCase();
  for (const p of STOP_PHRASES) {
    text = text.split(p).join(' ');
  }

  const tokens: string[] = [];

  for (const m of text.matchAll(/[a-z0-9][a-z0-9+#._-]*/g)) {
    tokens.push(m[0]);
  }

  const cjkRuns = text.match(/[\u4e00-\u9fa5]+/g) ?? [];
  for (const run of cjkRuns) {
    if (run.length === 1) {
      tokens.push(run);
      continue;
    }
    for (let i = 0; i < run.length - 1; i += 1) {
      tokens.push(run.slice(i, i + 2));
    }
  }

  return tokens;
}

function buildIndex(): Index {
  const chunks = buildChunks();
  const tokens = chunks.map((c) => tokenize(c.text));
  const docFreq = new Map<string, number>();

  for (const list of tokens) {
    for (const term of new Set(list)) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }

  const totalLen = tokens.reduce((sum, t) => sum + t.length, 0);

  return {
    chunks,
    tokens,
    docFreq,
    avgLen: totalLen / Math.max(1, tokens.length),
  };
}

function getIndex(): Index {
  // 构建一次（< 10ms / 120 块）后常驻；内容变了（mtime 指纹变化）再重建，
  // 这样线上后台改完简历/项目，检索立刻能命中新内容。
  const signature = contentSignature();
  if (!index || signature !== indexSignature) {
    index = buildIndex();
    indexSignature = signature;
  }
  return index;
}

function idf(term: string, idx: Index): number {
  const df = idx.docFreq.get(term) ?? 0;
  const n = idx.chunks.length;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

const isLatin = (t: string) => /^[a-z]/.test(t);

/**
 * 浏览 / 列举意图。
 *
 * "做了什么项目""有哪些作品""介绍一下简历"这类泛指问题，词全被 STOP_PHRASES 剥掉，
 * 没有任何具体主题词可匹配，BM25 会直接空手而归——但站里明明有一堆项目和一份简历，
 * 回一句"站内没有找到相关内容"是错的。这里识别这类问题，直接给概览。
 */
const LIST_NOUN = /(项目|作品|案例|经历|经验|简历|背景|介绍|干什么|做的是什么)/;
const LIST_ASK =
  /(有哪些|有什么|做过什么|做了什么|做过哪些|哪些项目|都有什么|都做过|列一下|列举|看看|所有|全部|概览|介绍)/;

function isListingIntent(query: string): boolean {
  if (!LIST_NOUN.test(query)) return false;
  if (LIST_ASK.test(query)) return true;
  // 极短的名词式提问（"项目""简历""经历"）也按浏览处理
  return query.trim().length <= 4;
}

/** 列举意图的兜底结果：给项目概览或简历概览，而不是 no_match */
function listingCitations(query: string, topK: number): Citation[] {
  const idx = getIndex();
  const wantsResume = /(简历|经历|经验|背景|你是谁|介绍|干什么|做什么工作|工作)/.test(query);

  if (wantsResume) {
    const order = ['resume::basics', 'resume::work', 'resume::skills'];
    const byId = new Map(idx.chunks.map((c) => [c.id, c] as const));
    return order
      .map((id) => byId.get(id))
      .filter((c): c is Chunk => Boolean(c))
      .slice(0, topK)
      .map((c) => ({
        slug: c.slug,
        title: c.title,
        heading: c.heading,
        quote: briefLine(c.text),
        url: c.url,
        score: 1,
      }));
  }

  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of idx.chunks) {
    if (c.kind !== 'project-summary' || seen.has(c.slug)) continue;
    seen.add(c.slug);
    out.push({
      slug: c.slug,
      title: c.title,
      heading: c.heading,
      quote: briefLine(c.text.split('\n').slice(1).join('\n')),
      url: c.url,
      score: 1,
    });
    if (out.length >= topK) break;
  }
  return out;
}

/** 取块里第一行有信息量的正文当摘录（去掉 md 强调标记） */
function briefLine(text: string): string {
  const line =
    text
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .split('\n')
      .map((s) => s.trim())
      .find((s) => s.length > 0) ?? '';
  return line.length > 120 ? `${line.slice(0, 118)}…` : line;
}

export function retrieve(query: string, topK = 3): Citation[] {
  // 覆盖边界：这些主题站内没有真实产出，即使个别词在正文里被提到，也不能答"做过"
  if (OUT_OF_SCOPE.some((re) => re.test(query))) return [];

  const idx = getIndex();
  const baseTokens = [...new Set(tokenize(query))].filter(
    (t) => t.length > 1 || isLatin(t),
  );
  const expanded = new Set<string>(baseTokens);
  for (const t of baseTokens) {
    for (const syn of SYNONYMS[t] ?? []) expanded.add(syn);
  }
  const queryTokens = [...expanded];
  if (queryTokens.length === 0) {
    return isListingIntent(query) ? listingCitations(query, topK) : [];
  }

  const matched = queryTokens.filter((t) => (idx.docFreq.get(t) ?? 0) > 0);

  // 守卫一：查询里有站内完全没出现过的拉丁技术名（iOS / Kubernetes / Snowflake），
  // 且没有任何拉丁技术名被命中 —— 这属于"站内没有"，必须拒答而不是拿泛词硬凑。
  const unmatchedLatin = queryTokens.filter((t) => isLatin(t) && !matched.includes(t));
  const matchedLatin = matched.some(isLatin);
  if (unmatchedLatin.length > 0 && !matchedLatin) return [];

  if (matched.length === 0) {
    return isListingIntent(query) ? listingCitations(query, topK) : [];
  }

  // 守卫二：最高 idf 仍很低 → 只命中了"或者""可以"这类泛词，不算证据
  const maxIdf = Math.max(...matched.map((t) => idf(t, idx)));
  if (maxIdf < MIN_MAX_IDF) return [];

  const scored = idx.chunks.map((chunk, i) => {
    const list = idx.tokens[i];
    const len = list.length;
    const freq = new Map<string, number>();
    for (const t of list) freq.set(t, (freq.get(t) ?? 0) + 1);

    let score = 0;
    for (const term of queryTokens) {
      const tf = freq.get(term) ?? 0;
      if (tf === 0) continue;
      const denom = tf + K1 * (1 - B + (B * len) / idx.avgLen);
      score += idf(term, idx) * ((tf * (K1 + 1)) / denom);

      if (chunk.heading.toLowerCase().includes(term) || chunk.title.toLowerCase().includes(term)) {
        score *= 1.25;
      }
      // 拉丁技术名命中整条项目（stack 里出现过）时额外加权
      if (isLatin(term) && chunk.kind !== 'resume') score *= 1.12;
    }
    return { chunk, score: score * PRIOR[chunk.kind] };
  });

  // 按 slug 聚合：同一项目的多个块不互相竞争，项目之间才竞争。
  // 这样"哪个项目用过 X"不会被同一项目的三段正文占满 top-3。
  const best = new Map<string, { chunk: Chunk; score: number }>();
  for (const row of scored) {
    if (row.score <= 0) continue;
    const prev = best.get(row.chunk.slug);
    if (!prev || row.score > prev.score) best.set(row.chunk.slug, row);
  }

  // 人称意图：问"他/本人"时，简历块是权威来源，给一档加成
  const wantsPerson = /他|作者|本人|这个人/.test(query);

  // 意图过滤：问句里明确要"项目"时，简历块不参与竞争（它不是项目）
  const wantsProject = /项目/.test(query) && [...best.keys()].some((k) => k !== 'resume');

  const resumeMatched = [...best.values()].some(
    (r) => r.chunk.slug === 'resume' && r.score >= SCORE_FLOOR * 0.6,
  );

  const ranked = [...best.values()]
    .filter((r) => r.score >= SCORE_FLOOR)
    .filter((r) => !(wantsProject && r.chunk.slug === 'resume'))
    // 问"他是谁/他会什么"时，简历比某个项目更能回答问题
    .filter((r) => !(wantsPerson && resumeMatched) || r.chunk.slug === 'resume')
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, topK).map(({ chunk, score }) => {
    // 卡片上方已经显示项目名，摘录里再重复一遍是噪音
    const raw = extractQuote(chunk.text, queryTokens);
    const quote = raw.startsWith(chunk.title) ? raw.slice(chunk.title.length).trim() : raw;

    return {
      slug: chunk.slug,
      title: chunk.title,
      heading: chunk.heading,
      quote,
      url: chunk.url,
      score: Number(score.toFixed(2)),
    };
  });
}

/** 从块里挑出与查询最相关的一句，作为可核验的原文摘录 */
function extractQuote(text: string, queryTokens: string[]): string {
  const sentences = text
    // 摘录要给人看，Markdown 的强调标记与行首符号必须去掉
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .split(/(?<=[。！？；])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  let best = sentences[0] ?? text;
  let bestHits = -1;

  for (const s of sentences) {
    const lower = s.toLowerCase();
    const hits = queryTokens.reduce((n, t) => (lower.includes(t) ? n + 1 : n), 0);
    if (hits > bestHits) {
      bestHits = hits;
      best = s;
    }
  }

  return best.length > 180 ? `${best.slice(0, 178)}…` : best;
}

let slugCache: Array<{ slug: string; title: string }> | null = null;

/** 全部项目 slug，用于未命中时给兜底导航（复用已建索引，不再重复切块） */
export function listSlugs(): Array<{ slug: string; title: string }> {
  if (slugCache) return slugCache;
  const seen = new Map<string, string>();
  for (const chunk of getIndex().chunks) {
    if (chunk.slug === 'resume') continue;
    if (!seen.has(chunk.slug)) seen.set(chunk.slug, chunk.title);
  }
  slugCache = [...seen.entries()].map(([slug, title]) => ({ slug, title }));
  return slugCache;
}
