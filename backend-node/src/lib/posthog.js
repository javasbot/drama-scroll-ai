/**
 * PostHog 服务端分析
 * @see https://posthog.com/docs/libraries/node
 */
import { PostHog } from 'posthog-node';

const POSTHOG_KEY = process.env.POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

export const isPostHogEnabled = !!POSTHOG_KEY;

let posthog = null;

if (isPostHogEnabled) {
  posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
  console.log('[PostHog] 服务端分析初始化完成');
} else {
  console.log('[PostHog] 未配置，服务端分析不可用');
}

export function trackServerEvent(distinctId, event, properties = {}) {
  if (!posthog) return;
  posthog.capture({ distinctId, event, properties });
}

export async function shutdownPostHog() {
  if (posthog) await posthog.shutdown();
}

export { posthog };
