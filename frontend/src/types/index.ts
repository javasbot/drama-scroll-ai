export interface Story {
  id: string;
  title: string;
  content: string;
  category: string;
  emotionTag: string;
  hookScore: number;
  triggerWarning: string | null;
  generatedAt: string;
  model: string;
  likes: number;
  comments: number;
  shares: number;
  readTime: number;
  page?: number;
}

export interface SSEMessage {
  type: 'connected' | 'new_story' | 'chunk' | 'complete' | 'error' | 'done';
  story?: Story;
  content?: string;
  message?: string;
  timestamp?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    size: number;
    hasMore: boolean;
  };
  error?: string;
  message?: string;
}

export interface EngagementData {
  storyId: string;
  likesCount: number;
  dislikesCount: number;
  sharesCount: number;
  commentsCount: number;
  emotionBreakdown: Record<string, number>;
}

export type EmotionType =
  | '😡 愤怒'
  | '😭 心碎'
  | '🤯 震惊'
  | '😈 爽文'
  | '🔥 辣评'
  | '💀 社死'
  | '👀 吃瓜'
  | '🚩 避雷';

export const EMOTION_TYPES: EmotionType[] = [
  '😡 愤怒',
  '😭 心碎',
  '🤯 震惊',
  '😈 爽文',
  '🔥 辣评',
  '💀 社死',
  '👀 吃瓜',
  '🚩 避雷',
];

export const CATEGORY_LABELS: Record<string, { icon: string; name: string }> = {
  workplace: { icon: '💼', name: '职场' },
  family: { icon: '👨‍👩‍👧', name: '家庭' },
  relationship: { icon: '💔', name: '情感' },
  friendship: { icon: '🤝', name: '友情' },
  community: { icon: '🏘️', name: '社区' },
};

export const CATEGORY_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  workplace: { bg: '#e6f4ea', text: '#1a7f37' },
  family: { bg: '#fef2f2', text: '#cf222e' },
  relationship: { bg: '#f5f0ff', text: '#8250df' },
  friendship: { bg: '#eff6ff', text: '#0969da' },
  community: { bg: '#fef9e8', text: '#9a6700' },
};
