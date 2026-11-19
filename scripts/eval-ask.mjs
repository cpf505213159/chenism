#!/usr/bin/env node
/**
 * 评测集跑分：hit@3 / unknown-accuracy / citation 有效性。
 * 打的是真实端点（不是内部函数），所以能同时验证路由、限流与响应结构。
 *
 * 用法：
 *   node scripts/eval-ask.mjs
 *   node scripts/eval-ask.mjs --url http://localhost:3100 --verbose
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const args = process.argv.slice(2);
const urlFlag = args.indexOf('--url');
const BASE = urlFlag >= 0 ? args[urlFlag + 1] : 'http://localhost:3100';
const VERBOSE = args.includes('--verbose');

const questions = parse(readFileSync('docs/ai-eval/questions.yaml', 'utf8'));

let hit = 0;
let groundedTotal = 0;
let unknownPass = 0;
let unknownTotal = 0;
const failures = [];

for (const item of questions) {
  let res;
  let body;
  try {
    res = await fetch(`${BASE}/api/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: item.q }),
    });

    // 限流会被误当成"召回失败"，必须先区分开，否则调参会调错方向
    if (res.status === 429) {
      console.error(
        `\n[中止] 被限流（429）。评测会连发 20+ 次请求，请用更高的上限启动服务：\n` +
          `  ASK_IP_LIMIT=200 pnpm start -p 3100\n`,
      );
      process.exit(2);
    }

    body = await res.json();
  } catch (err) {
    failures.push(`${item.q} → 请求失败：${err.message}`);
    continue;
  }

  const slugs = (body.citations ?? []).map((c) => c.slug);

  if (item.expect_answer === 'unknown') {
    unknownTotal += 1;
    const pass = slugs.length === 0;
    if (pass) unknownPass += 1;
    else failures.push(`${item.q} → 应拒答，实际命中 ${slugs.join(', ')}`);
    if (VERBOSE) console.log(`${pass ? 'PASS' : 'FAIL'} [unknown] ${item.q} → ${slugs.join(',') || '空'}`);
    continue;
  }

  groundedTotal += 1;
  const allExpected = item.expect_slugs.every((s) => slugs.includes(s));
  const citesOk = !item.must_cite || (body.citations ?? []).every((c) => Boolean(c.url));
  const pass = allExpected && citesOk;
  if (pass) hit += 1;
  else
    failures.push(
      `${item.q} → 期望 ${item.expect_slugs.join(', ')}，实际 ${slugs.join(', ') || '空'}`,
    );
  if (VERBOSE)
    console.log(`${pass ? 'PASS' : 'FAIL'} [grounded] ${item.q} → ${slugs.join(',') || '空'}`);
}

const hitRate = groundedTotal ? hit / groundedTotal : 0;
const unknownRate = unknownTotal ? unknownPass / unknownTotal : 1;

console.log('\n──────── 评测结果 ────────');
console.log(`总题数        ${questions.length}`);
console.log(`hit@3         ${(hitRate * 100).toFixed(1)}%  (${hit}/${groundedTotal})   门槛 ≥ 80%`);
console.log(`unknown-acc   ${(unknownRate * 100).toFixed(1)}%  (${unknownPass}/${unknownTotal})   门槛 = 100%`);

if (failures.length) {
  console.log('\n未通过：');
  for (const f of failures) console.log(`  · ${f}`);
}

const pass = hitRate >= 0.8 && unknownRate === 1;
console.log(`\n${pass ? '✓ 达到 Phase 2 的准入条件' : '✗ 未达准入条件，留在 Phase 1'}`);
process.exit(pass ? 0 : 1);
