/**
 * Sentry 错误追踪 (Node.js)
 * @see https://docs.sentry.io/platforms/node/guides/express/
 */
import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN || '';

export const isSentryEnabled = !!SENTRY_DSN;

export function initSentry(app) {
  if (!isSentryEnabled) {
    console.log('[Sentry] 未配置 DSN，跳过初始化');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.3,
    integrations: [
      Sentry.expressIntegration({ app }),
    ],
  });

  console.log('[Sentry] Node.js 错误追踪初始化完成');
}

// 请求处理器（放在所有路由之前）
export function sentryRequestHandler() {
  if (!isSentryEnabled) return (_req, _res, next) => next();
  return Sentry.expressRequestHandler();
}

// 错误处理器（放在所有路由之后）
export function sentryErrorHandler() {
  if (!isSentryEnabled) return (_err, _req, _res, next) => next(_err);
  return Sentry.expressErrorHandler();
}

export { Sentry };
