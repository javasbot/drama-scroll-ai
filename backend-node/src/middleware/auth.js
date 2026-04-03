/**
 * Clerk 认证中间件
 * @see https://clerk.com/docs/backend-requests/handling/nodejs
 */
import { clerkMiddleware, requireAuth } from '@clerk/express';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';

export const isClerkEnabled = !!CLERK_SECRET_KEY;

// 公共中间件 — 解析 Clerk token（不强制登录）
export function clerkAuth() {
  if (!isClerkEnabled) {
    return (_req, _res, next) => next();
  }
  return clerkMiddleware();
}

// 强制登录中间件 — 用于需要认证的路由
export function requireClerkAuth() {
  if (!isClerkEnabled) {
    return (req, _res, next) => {
      req.auth = { userId: req.headers['x-user-id'] || 'anonymous' };
      next();
    };
  }
  return requireAuth();
}
