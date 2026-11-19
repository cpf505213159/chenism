import { getSession } from './auth';

/**
 * 后台的准入闸门，三层：
 * 1. 这个环境该不该有后台（构建期决定，生产默认没有）
 * 2. 请求来源（本机，或显式 ADMIN_ENABLED=1）
 * 3. 登录会话（HMAC 签名 Cookie）
 */

export function isAdminEnabled(): boolean {
  if (process.env.ADMIN_ENABLED === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

export function isLocalRequest(request: Request): boolean {
  try {
    const host = new URL(request.url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

/** 写接口与后台页面共用同一个判断，避免"页面进得去、接口 403" */
export async function requireAdmin(request: Request): Promise<boolean> {
  if (!isAdminEnabled()) return false;

  const local = isLocalRequest(request);
  const explicitlyOn = process.env.ADMIN_ENABLED === '1';
  if (!local && !explicitlyOn) return false;

  // 即使在本机，也要求会话：否则同机器上任何进程都能直接改文件
  const session = await getSession();
  return Boolean(session);
}

/** 同源校验：配合 SameSite=Strict，挡住跨站发起的写请求 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // 命令行 / 同源表单调用通常不带 Origin

  // 用 Host 头比较，而不是 request.url 的 host——
  // url 会被框架规范化（localhost ↔ 127.0.0.1），直接比会误判。
  const host = request.headers.get('host') ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
