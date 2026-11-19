import raw from '../../content/data/site.json';

/**
 * 导航常量，单独放一个模块。
 *
 * 原因：`src/data/site.ts` 里其它字段改成了运行时读文件（后台能在线改），
 * 那份代码会引入 node:fs，不能进客户端 bundle。而 NavLinks 是客户端组件，
 * 只用到导航这一项——把它拆出来，客户端就只打包这段纯 JSON。
 *
 * 导航本身很少改，构建时求值是合理的。
 */
export const nav: Array<{ label: string; href: string }> = raw.nav;
