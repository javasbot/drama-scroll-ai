/**
 * Clerk 认证配置
 * @see https://clerk.com/docs/quickstarts/react
 */

export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// Clerk 是否可用（配置了 key 才启用）
export const isClerkEnabled = !!CLERK_PUBLISHABLE_KEY;

// Clerk 外观主题 — 匹配编辑杂志风
export const clerkAppearance = {
  variables: {
    colorPrimary: '#e8590c',
    colorText: '#1a1a1a',
    colorBackground: '#faf9f6',
    colorInputBackground: '#f7f6f3',
    colorInputText: '#1a1a1a',
    borderRadius: '10px',
    fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
  },
  elements: {
    card: {
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      border: '1px solid #e8e5e0',
    },
  },
};
