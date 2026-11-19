import type { NextConfig } from 'next';

// 部署地址只从环境变量来；漏设时会让 canonical / sitemap / OG 全部指向 localhost。
// 这类错误在页面上看不出来，所以在这里大声提醒（next.config 只在构建/启动时加载一次）。
if (process.env.NODE_ENV === 'production' && !process.env.SITE_URL) {
  console.warn(
    '[site] 未设置 SITE_URL：canonical、sitemap、robots 与分享卡都会写成 http://localhost:3000',
  );
}

const nextConfig: NextConfig = {
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
