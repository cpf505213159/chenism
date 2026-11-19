#!/usr/bin/env node
/**
 * 给 Hiyori 挂上自定义表情（Cubism 3/4 的 .exp3.json）。
 *
 * 官方示例模型只带参数、不带表情文件，所以这里用参数叠加的方式补三套：
 *   smile（微笑）/ think（思考）/ calm（中性）。
 * 只需要在 model3.json 的 FileReferences.Expressions 里登记，引擎就能 setExpression(id)。
 *
 * 这个脚本可重复执行：已经登记过的会跳过，方便重新拉取模型后一键补回。
 *
 * 用法：node scripts/apply-hiyori-expressions.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';

const MODEL = 'public/live2d/hiyori/Hiyori.model3.json';
const EXPRESSIONS = [
  { Name: 'smile', File: 'expressions/smile.exp3.json' },
  { Name: 'think', File: 'expressions/think.exp3.json' },
  { Name: 'calm', File: 'expressions/calm.exp3.json' },
];

const raw = JSON.parse(await readFile(MODEL, 'utf8'));
const ref = raw.FileReferences ?? (raw.FileReferences = {});

const existing = new Set((ref.Expressions ?? []).map((e) => e.Name));
const merged = [...(ref.Expressions ?? [])];
for (const exp of EXPRESSIONS) {
  if (!existing.has(exp.Name)) merged.push(exp);
}
ref.Expressions = merged;

await writeFile(MODEL, `${JSON.stringify(raw, null, 2)}\n`);
console.log(`已登记 ${merged.length} 套表情：${merged.map((e) => e.Name).join(' / ')}`);
