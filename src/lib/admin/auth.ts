import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * 后台登录：账号密码 + HMAC 签名 Cookie。
 * 不引第三方鉴权库——这里只需要"证明你是本人"，不需要用户体系、不需要数据库。
 */

export const SESSION_COOKIE = 'chenism_admin';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

export const ADMIN_USER = process.env.ADMIN_USER ?? 'admin';

/** 未设置密码时视为"未配置"，登录一律失败（fail closed），而不是退化成空密码 */
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

export function isConfigured(): boolean {
  return ADMIN_PASSWORD.length >= 6;
}

function secret(): string {
  return process.env.ADMIN_SECRET ?? `chenism-admin::${ADMIN_PASSWORD}`;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createToken(user: string): string {
  const payload = Buffer.from(
    JSON.stringify({ user, exp: Date.now() + SESSION_MAX_AGE * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): { user: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      user?: string;
      exp?: number;
    };
    if (!data.user || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return { user: data.user };
  } catch {
    return null;
  }
}

/** 定长比较，避免通过响应时间推断密码 */
export function checkCredentials(username: string, password: string): boolean {
  if (!isConfigured()) return false;

  const ua = Buffer.from(username);
  const ub = Buffer.from(ADMIN_USER);
  const pa = Buffer.from(password);
  const pb = Buffer.from(ADMIN_PASSWORD);

  const userOk = ua.length === ub.length && timingSafeEqual(ua, ub);
  const passOk = pa.length === pb.length && timingSafeEqual(pa, pb);
  return userOk && passOk;
}

/** 服务端组件里读取当前会话 */
export async function getSession(): Promise<{ user: string } | null> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}
