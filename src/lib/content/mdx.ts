import { evaluate } from '@mdx-js/mdx';
import matter from 'gray-matter';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import * as runtime from 'react/jsx-runtime';
import type { ComponentType } from 'react';

/**
 * 不用 next-mdx-remote（2026-04-09 已被 HashiCorp 归档，只读无安全修复），
 * 直接用核心 @mdx-js/mdx 在 RSC 里编译。约 80 行换掉一个会死的中间层。
 */

type MdxComponent = ComponentType<{
  components?: Record<string, ComponentType<never>>;
}>;

const compiled = new Map<string, MdxComponent>();

export async function compileMdx(source: string): Promise<MdxComponent> {
  const hit = compiled.get(source);
  if (hit) return hit;

  const { content } = matter(source);
  const mod = await evaluate(content, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
    development: false,
  });

  const Component = mod.default as unknown as MdxComponent;
  compiled.set(source, Component);
  return Component;
}

export type Heading = { id: string; text: string; level: 2 | 3 };

/** 从 Markdown 源里抽取 ## / ### 作为目录（不引入额外 AST 依赖） */
export function extractHeadings(body: string): Heading[] {
  const { content } = matter(body);
  const lines = content.split('\n');
  const headings: Heading[] = [];
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length === 2 ? 2 : 3;
    const text = match[2].replace(/[*`_]/g, '').trim();
    headings.push({ id: slugifyHeading(text), text, level: level as 2 | 3 });
  }

  return headings;
}

/**
 * 与 rehype-slug 的算法保持一致：小写、去标点、空格转连字符。
 * 中文标题 rehype-slug 会保留中文本身，这里同样保留。
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/[!-/:-@[-`{-~]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
