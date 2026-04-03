/**
 * PostHog 数据分析配置
 * @see https://posthog.com/docs/libraries/react
 */
import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

export const isPostHogEnabled = !!POSTHOG_KEY;

export function initPostHog() {
  if (!isPostHogEnabled) {
    console.log('[PostHog] 未配置 API Key，跳过初始化');
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    loaded: () => {
      console.log('[PostHog] 初始化完成');
    },
  });
}

// 事件追踪快捷方法
export const analytics = {
  /** 故事被查看 */
  trackStoryView: (storyId: string, category: string) => {
    if (!isPostHogEnabled) return;
    posthog.capture('story_viewed', { story_id: storyId, category });
  },

  /** 故事被点赞 */
  trackLike: (storyId: string, action: 'like' | 'dislike') => {
    if (!isPostHogEnabled) return;
    posthog.capture('story_engagement', { story_id: storyId, action });
  },

  /** 情绪反应 */
  trackEmotion: (storyId: string, emotion: string) => {
    if (!isPostHogEnabled) return;
    posthog.capture('emotion_vote', { story_id: storyId, emotion });
  },

  /** 分享 */
  trackShare: (storyId: string) => {
    if (!isPostHogEnabled) return;
    posthog.capture('story_shared', { story_id: storyId });
  },

  /** 用户注册 */
  trackSignUp: () => {
    if (!isPostHogEnabled) return;
    posthog.capture('user_signed_up');
  },

  /** 订阅/支付 */
  trackSubscription: (plan: string) => {
    if (!isPostHogEnabled) return;
    posthog.capture('subscription_started', { plan });
  },

  /** 关联用户身份 (Clerk 登录后调用) */
  identify: (userId: string, traits?: Record<string, unknown>) => {
    if (!isPostHogEnabled) return;
    posthog.identify(userId, traits);
  },

  /** 重置（登出时调用） */
  reset: () => {
    if (!isPostHogEnabled) return;
    posthog.reset();
  },
};

export { posthog };
