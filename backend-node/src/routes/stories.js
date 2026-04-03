import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateStory, generateBatch } from '../services/llmService.js';
import { upsertStoryVector, findSimilarStories } from '../services/vectorService.js';
import { crawlTrendingTopics } from '../services/crawlerService.js';
import { upsertStory, isSupabaseEnabled } from '../lib/supabase.js';

export const storyRouter = Router();

// In-memory cache for stories (production: use Redis)
const storyCache = new Map();
const MAX_CACHE_SIZE = 200;

/**
 * GET /api/stories
 * Fetch a batch of stories for the feed
 */
storyRouter.get('/', async (req, res, next) => {
  try {
    const { page = 1, size = 5, category } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(20, Math.max(1, parseInt(size, 10) || 5));

    // Generate fresh stories via LLM
    const stories = await generateBatch(pageSize);

    // Assign IDs and cache
    const result = stories.map(story => {
      const id = uuidv4();
      const enriched = {
        id,
        ...story,
        likes: Math.floor(Math.random() * 500) + 10,
        comments: Math.floor(Math.random() * 100) + 1,
        shares: Math.floor(Math.random() * 50),
        readTime: Math.ceil(story.content.split(' ').length / 200),
        page: pageNum,
      };

      // Cache the story
      if (storyCache.size >= MAX_CACHE_SIZE) {
        const firstKey = storyCache.keys().next().value;
        storyCache.delete(firstKey);
      }
      storyCache.set(id, enriched);

      // Async vector and DB upsert (fire and forget)
      upsertStoryVector(id, story).catch(() => {});
      if (isSupabaseEnabled) {
        upsertStory({
          id,
          title: story.title,
          content: story.content,
          category: story.category,
          emotion_tag: story.emotionTag,
          hook_score: story.hookScore,
          trigger_warning: story.triggerWarning,
          model: story.model,
          likes: enriched.likes,
          comments: enriched.comments,
          shares: enriched.shares,
          read_time: enriched.readTime
        }).catch(() => {});
      }

      return enriched;
    });

    res.json({
      success: true,
      data: result,
      pagination: {
        page: pageNum,
        size: pageSize,
        hasMore: true, // Infinite scroll always has more
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stories/:id
 * Get a single story by ID
 */
storyRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const story = storyCache.get(id);

    if (!story) {
      return res.status(404).json({
        success: false,
        error: '未找到相关内容',
      });
    }

    res.json({ success: true, data: story });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stories/:id/similar
 * Get similar stories (vector similarity)
 */
storyRouter.get('/:id/similar', async (req, res, next) => {
  try {
    const { id } = req.params;
    const story = storyCache.get(id);

    if (!story) {
      return res.status(404).json({
        success: false,
        error: '未找到相关内容',
      });
    }

    const similar = await findSimilarStories(
      `${story.title} ${story.content}`,
      parseInt(req.query.limit, 10) || 5,
    );

    res.json({ success: true, data: similar });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stories/trending/topics
 * Get trending topics for story generation
 */
storyRouter.get('/trending/topics', async (_req, res, next) => {
  try {
    const topics = await crawlTrendingTopics();
    res.json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stories/generate
 * Generate a single story with optional theme
 */
storyRouter.post('/generate', async (req, res, next) => {
  try {
    const { theme } = req.body || {};
    const story = await generateStory(theme);
    const id = uuidv4();

    const enriched = {
      id,
      ...story,
      likes: 0,
      comments: 0,
      shares: 0,
      readTime: Math.ceil(story.content.split(' ').length / 200),
    };

    storyCache.set(id, enriched);
    upsertStoryVector(id, story).catch(() => {});
    if (isSupabaseEnabled) {
      upsertStory({
        id,
        title: story.title,
        content: story.content,
        category: story.category,
        emotion_tag: story.emotionTag,
        hook_score: story.hookScore,
        trigger_warning: story.triggerWarning,
        model: story.model,
        likes: enriched.likes,
        comments: enriched.comments,
        shares: enriched.shares,
        read_time: enriched.readTime
      }).catch(() => {});
    }

    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

export default storyRouter;
