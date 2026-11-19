import type { NextConfig } from 'next';

// 部署地址只从环境变量来；漏设时会让 canonical / sitemap / OG 全部指向 localhost。
// 这类错误在页面上看不出来，所以在这里大声提醒（next.config 只在构建/启动时加载一次）。
if (process.env.NODE_ENV === 'production' && !process.env.SITE_URL) {
  console.warn(
    '[site] 未设置 SITE_URL：canonical、sitemap、robots 与分享卡都会写成 http://localhost:3000',
  );
}

const nextConfig: NextConfig = {
  // 生产热更新时用独立 distDir 构建，避免 `next build` 清空正在服务的 .next。
  // 常规 build / start 不设该变量，仍用默认 .next；deploy.sh 会在构建时设、
  // 切换产物后由 pm2 以默认值启动，两边始终指向同一个目录名。
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // 显式关闭：Next 16.4 起 create-next-app 默认写入 true。
  // 本站全站构建期静态产出，不需要请求时缓存岛；
  // 且 Cache Components 依赖 Node 运行时、不支持 output:'export'，
  // 会焊死"纯静态托管"这条退路（AI 可整块删除的物理基础）。
  cacheComponents: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: [],
  },
  /**
   * public/live2d 下四个下划线开头的调试页（_gallery / _probe / _exp / _stress）
   * 是本地排查模型用的，不该出现在线上：其中 _stress 一打开就持续播动作。
   *
   * 注意 rewrites 在构建时求值，所以开关是"构建期"的：
   * - `next dev`：NODE_ENV=development，直接放行，照常可用；
   * - `next build`：默认拦截，四个页面在产物里一律 404；
   * - 想在 production 产物里调试：`L2D_DEBUG=1 next build`。
   */
  async rewrites() {
    const debugAllowed = process.env.L2D_DEBUG === '1';
    if (process.env.NODE_ENV !== 'production' || debugAllowed) return [];

    return {
      beforeFiles: ['_gallery', '_probe', '_exp', '_stress'].map((name) => ({
        source: `/live2d/${name}.html`,
        destination: '/__l2d_debug_disabled',
      })),
      afterFiles: [],
      fallback: [],
    };
  },
  // 基础安全头。CSP 没有加：页面里有主题初始化的内联脚本与 JSON-LD，
  // 上 CSP 需要 nonce 化，收益不如风险大，这里先给能无条件生效的几项。
  async headers() {
    return [
      /**
       * 角色资源长缓存。
       *
       * 默认 Next 对 public/ 静态文件给 `max-age=0`：每次打开页面都要重新验证
       * （甚至重新下载）。Live2D 的贴图 + moc3 + 引擎合计约 1MB，在 3Mbps 的
       * 轻量服务器上就是好几秒——这是看板娘"每次访问都要等"的主因。
       *
       * 这些资源是角色资产、几乎不变，给 30 天 + 7 天 stale-while-revalidate：
       * 二次访问直接命中本地缓存（0 请求），过期后先出旧图再后台刷新，不会白屏。
       * 注意：换模型/换贴图时要改文件名（如 texture_00@2.webp）或路径版本，
       * 否则老访客最长 30 天才看到新资源。
       */
      {
        source: '/live2d/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/_l2d/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
