import { revalidatePath } from 'next/cache';
import { invalidateProjectCache } from './repository';
import { invalidateResumeCache } from '@/data/resume';
import { invalidateSiteCache } from '@/data/site';
import { invalidateSearchIndex } from '@/lib/ai/retrieve';

/**
 * 后台写完内容后的统一"刷新"入口。
 *
 * 线上是 `next start` 常驻进程，内容文件改了不会自动生效，有四层缓存要清：
 * 1. 项目列表缓存（repository 里的模块级 cache）
 * 2. 简历缓存（resume.ts 的 mtime 缓存）
 * 3. 站点配置缓存（site.ts 的 mtime 缓存）
 * 4. 检索索引（retrieve 里的进程内索引）
 *
 * 再让 Next 丢掉页面产物（整站同属 root layout，一次全清）。
 * 少清一层，就会出现"后台显示保存成功、前台还是旧的"这种最难查的问题。
 */
export function invalidateContent() {
  invalidateProjectCache();
  invalidateResumeCache();
  invalidateSiteCache();
  invalidateSearchIndex();
  revalidatePath('/', 'layout');
}
