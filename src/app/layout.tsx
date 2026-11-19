import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getAiMode } from '@/lib/ai/guard';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Companion } from '@/components/companion/Companion';
import { site } from '@/data/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · ${site.role}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: ['个人网站', '简历', '数据分析师', 'SQL', 'Python', '数据建模', 'BI', site.name],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: site.url,
    siteName: site.name,
    title: `${site.name} · ${site.role}`,
    description: site.tagline,
    images: [{ url: '/og/home.png', width: 1200, height: 630, alt: `${site.name} · ${site.role}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} · ${site.role}`,
    description: site.tagline,
    images: ['/og/home.png'],
  },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

/**
 * 在 HTML 解析前决定主题，避免闪白。
 * 顺序：localStorage → 系统偏好。失败时默认浅色。
 */
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: site.name,
              alternateName: site.handle,
              jobTitle: site.role,
              description: site.description,
              url: site.url,
              email: `mailto:${site.email}`,
              sameAs: ['https://github.com/chenism'],
            }),
          }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        >
          跳到正文
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        {/* AI_MODE=off 时连角色一起撤掉，避免点开永远失败的面板 */}
        {getAiMode() !== 'off' && <Companion />}
      </body>
    </html>
  );
}
