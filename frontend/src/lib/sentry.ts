/**
 * Sentry 错误追踪配置
 * @see https://docs.sentry.io/platforms/javascript/guides/react/
 */
import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

export const isSentryEnabled = !!SENTRY_DSN;

export function initSentry() {
  if (!isSentryEnabled) {
    console.log('[Sentry] 未配置 DSN，跳过初始化');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.3,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });

  console.log('[Sentry] 初始化完成');
}

// 错误上报快捷方法
export const errorTracker = {
  /** 捕获异常 */
  captureException: (error: unknown, context?: Record<string, unknown>) => {
    if (!isSentryEnabled) {
      console.error('[Error]', error);
      return;
    }
    Sentry.captureException(error, { extra: context });
  },

  /** 捕获消息 */
  captureMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
    if (!isSentryEnabled) return;
    Sentry.captureMessage(message, level);
  },

  /** 设置用户上下文 */
  setUser: (userId: string, email?: string) => {
    if (!isSentryEnabled) return;
    Sentry.setUser({ id: userId, email });
  },

  /** 清除用户 */
  clearUser: () => {
    if (!isSentryEnabled) return;
    Sentry.setUser(null);
  },
};

export { Sentry };
