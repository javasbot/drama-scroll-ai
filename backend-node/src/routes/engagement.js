/**
 * 互动路由 — 点赞/踩/情绪投票
 * 使用 Upstash Redis 实现请求防抖，Supabase 持久化
 */
import { Router } from 'express';
import { debounceCheck, cacheIncr } from '../lib/upstash.js';
import { incrementEngagement, getEngagement } from '../lib/supabase.js';
import { trackServerEvent } from '../lib/posthog.js';

const router = Router();

// POST /api/engagement/like
router.post('/like', async (req, res) => {
  try {
    const { storyId, userFingerprint, action } = req.body;
    if (!storyId || !userFingerprint) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }

    // Upstash Redis 防抖 — 5 秒内同用户同故事不重复计数
    const key = `${action}:${storyId}:${userFingerprint}`;
    const allowed = await debounceCheck(key, 5);
    if (!allowed) {
      return res.json({ success: true, message: '已记录（防抖中）', debounced: true });
    }

    // 缓存计数器递增
    const cacheKey = `engagement:${action}:${storyId}`;
    await cacheIncr(cacheKey);

    // 写入 Supabase
    const field = action === 'like' ? 'likes_count' : 'dislikes_count';
    await incrementEngagement(storyId, field, 1);

    // PostHog 追踪
    trackServerEvent(userFingerprint, 'engagement_action', { storyId, action });

    res.json({ success: true, message: '已记录' });
  } catch (error) {
    console.error('[Engagement] 点赞失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /api/engagement/emotion
router.post('/emotion', async (req, res) => {
  try {
    const { storyId, userFingerprint, emotionType } = req.body;
    if (!storyId || !userFingerprint || !emotionType) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }

    const key = `emotion:${storyId}:${userFingerprint}`;
    const allowed = await debounceCheck(key, 10);
    if (!allowed) {
      return res.json({ success: true, message: '已记录（防抖中）', debounced: true });
    }

    // 记录情绪投票
    await cacheIncr(`emotion:${emotionType}:${storyId}`);

    trackServerEvent(userFingerprint, 'emotion_vote', { storyId, emotionType });

    res.json({ success: true, message: '已记录' });
  } catch (error) {
    console.error('[Engagement] 情绪投票失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/engagement/:storyId
router.get('/:storyId', async (req, res) => {
  try {
    const engagement = await getEngagement(req.params.storyId);
    res.json({
      success: true,
      data: engagement || { likes_count: 0, dislikes_count: 0, shares_count: 0, comments_count: 0 },
    });
  } catch (error) {
    console.error('[Engagement] 查询失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
