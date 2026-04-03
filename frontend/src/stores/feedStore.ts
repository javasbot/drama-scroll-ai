import { create } from 'zustand';
import type { Story } from '../types';
import { fetchStories, createSSEConnection } from '../services/api';

interface FeedState {
  stories: Story[];
  isLoading: boolean;
  isLoadingMore: boolean;
  currentPage: number;
  hasMore: boolean;
  sseConnected: boolean;
  error: string | null;
  userFingerprint: string;

  // Actions
  loadInitialStories: () => Promise<void>;
  loadMoreStories: () => Promise<void>;
  addStory: (story: Story) => void;
  updateStoryLikes: (storyId: string, delta: number) => void;
  connectSSE: () => void;
  disconnectSSE: () => void;
  setError: (error: string | null) => void;
}

let eventSource: EventSource | null = null;

// Generate a stable user fingerprint
function generateFingerprint(): string {
  const stored = localStorage.getItem('drama_fingerprint');
  if (stored) return stored;
  const fp = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem('drama_fingerprint', fp);
  return fp;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  stories: [],
  isLoading: false,
  isLoadingMore: false,
  currentPage: 0,
  hasMore: true,
  sseConnected: false,
  error: null,
  userFingerprint: generateFingerprint(),

  loadInitialStories: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const response = await fetchStories(1, 8);
      set({
        stories: response.data,
        currentPage: 1,
        hasMore: response.pagination?.hasMore ?? true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: '加载失败，请下拉重试',
        isLoading: false,
      });
    }
  },

  loadMoreStories: async () => {
    const state = get();
    if (state.isLoadingMore || !state.hasMore) return;
    set({ isLoadingMore: true });

    try {
      const nextPage = state.currentPage + 1;
      const response = await fetchStories(nextPage, 5);

      set({
        stories: [...state.stories, ...response.data],
        currentPage: nextPage,
        hasMore: response.pagination?.hasMore ?? true,
        isLoadingMore: false,
      });
    } catch (error) {
      set({ isLoadingMore: false });
    }
  },

  addStory: (story: Story) => {
    set((state) => ({
      stories: [story, ...state.stories],
    }));
  },

  updateStoryLikes: (storyId: string, delta: number) => {
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === storyId ? { ...s, likes: s.likes + delta } : s
      ),
    }));
  },

  connectSSE: () => {
    if (eventSource) return;

    eventSource = createSSEConnection(
      (story) => {
        get().addStory(story);
      },
      () => {
        set({ sseConnected: false });
      },
    );

    if (eventSource) {
      set({ sseConnected: true });
    }
  },

  disconnectSSE: () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      set({ sseConnected: false });
    }
  },

  setError: (error) => set({ error }),
}));
