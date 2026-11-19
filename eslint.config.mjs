import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * Next 16 的 flat config：直接用官方导出的两组规则，不自己拼。
 * 忽略构建产物与本地资源（模型/贴图不需要 lint）。
 */
const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'scripts/**',
      'content/**',
      'docs/**',
      'next-env.d.ts',
    ],
  },
];

export default config;
