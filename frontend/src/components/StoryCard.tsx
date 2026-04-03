import { useState, useCallback } from 'react';
import type { Story } from '../types';
import { EMOTION_TYPES, CATEGORY_LABELS, CATEGORY_TAG_COLORS } from '../types';
import { sendLike, sendEmotionVote } from '../services/api';
import { useFeedStore } from '../stores/feedStore';
import { analytics } from '../lib/posthog';
import { errorTracker } from '../lib/sentry';

interface StoryCardProps {
  story: Story;
  index: number;
}

export function StoryCard({ story }: StoryCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [showEmotions, setShowEmotions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [likeCount, setLikeCount] = useState(story.likes);
  const [shareAnimation, setShareAnimation] = useState(false);

  const userFingerprint = useFeedStore((s) => s.userFingerprint);

  const label = CATEGORY_LABELS[story.category] || { icon: '📖', name: '杂谈' };
  const tagColor = CATEGORY_TAG_COLORS[story.category] || { bg: '#f5f5f5', text: '#666' };

  const handleLike = useCallback(() => {
    if (isLiked) return;
    setIsLiked(true);
    setIsDisliked(false);
    setLikeCount((c) => c + 1);
    sendLike(story.id, userFingerprint, 'like');
    analytics.trackLike(story.id, 'like');
  }, [isLiked, story.id, userFingerprint]);

  const handleDislike = useCallback(() => {
    if (isDisliked) return;
    setIsDisliked(true);
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((c) => c - 1);
    }
    sendLike(story.id, userFingerprint, 'dislike');
    analytics.trackLike(story.id, 'dislike');
  }, [isDisliked, isLiked, story.id, userFingerprint]);

  const handleEmotionVote = useCallback((emotion: string) => {
    setSelectedEmotion(emotion);
    setShowEmotions(false);
    sendEmotionVote(story.id, userFingerprint, emotion);
    analytics.trackEmotion(story.id, emotion);
  }, [story.id, userFingerprint]);

  const handleShare = useCallback(() => {
    setShareAnimation(true);
    setTimeout(() => setShareAnimation(false), 400);
    analytics.trackShare(story.id);
    if (navigator.share) {
      navigator.share({
        title: story.title,
        text: story.content.slice(0, 100) + '...',
        url: window.location.href,
      }).catch((err) => errorTracker.captureException(err, { context: 'share' }));
    } else {
      navigator.clipboard.writeText(`${story.title}\n\n${story.content}`).catch(() => {});
    }
  }, [story]);

  const shouldTruncate = story.content.length > 200;
  const displayContent = shouldTruncate && !isExpanded
    ? story.content.slice(0, 200) + '...'
    : story.content;

  return (
    <article className="story-card" id={`story-${story.id}`}>
      {/* 标签行 */}
      <div className="story-card__header">
        <div className="story-card__meta">
          <span
            className="story-card__category"
            style={{ background: tagColor.bg, color: tagColor.text }}
          >
            {label.icon} {label.name}
          </span>
          <span className="story-card__emotion-tag">{story.emotionTag}</span>
        </div>
        <div className="story-card__hook-score">
          <span className="story-card__hook-label">🔥 {story.hookScore.toFixed(1)}</span>
        </div>
      </div>

      {/* 标题 */}
      <h2 className="story-card__title">{story.title}</h2>

      {/* 正文 */}
      <div className="story-card__content">
        <p>{displayContent}</p>
        {shouldTruncate && (
          <button
            className="story-card__expand"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开全文'}
          </button>
        )}
      </div>

      {/* 情绪反应 */}
      <div className="story-card__reactions">
        <button
          className="story-card__reaction-toggle"
          onClick={() => setShowEmotions(!showEmotions)}
        >
          {selectedEmotion || '😶 表态'}
        </button>
        {showEmotions && (
          <div className="story-card__emotion-picker">
            {EMOTION_TYPES.map((emotion) => (
              <button
                key={emotion}
                className={`story-card__emotion-btn ${selectedEmotion === emotion ? 'active' : ''}`}
                onClick={() => handleEmotionVote(emotion)}
              >
                {emotion.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div className="story-card__actions">
        <button
          className={`story-card__action ${isLiked ? 'story-card__action--active' : ''}`}
          onClick={handleLike}
          id={`like-${story.id}`}
        >
          <span className="story-card__action-icon">{isLiked ? '❤️' : '🤍'}</span>
          <span className="story-card__action-count">{likeCount.toLocaleString()}</span>
        </button>

        <button
          className={`story-card__action ${isDisliked ? 'story-card__action--disliked' : ''}`}
          onClick={handleDislike}
          id={`dislike-${story.id}`}
        >
          <span className="story-card__action-icon">👎</span>
        </button>

        <button className="story-card__action" id={`comments-${story.id}`}>
          <span className="story-card__action-icon">💬</span>
          <span className="story-card__action-count">{story.comments}</span>
        </button>

        <button
          className={`story-card__action ${shareAnimation ? 'story-card__action--bounce' : ''}`}
          onClick={handleShare}
          id={`share-${story.id}`}
        >
          <span className="story-card__action-icon">↗</span>
          <span className="story-card__action-count">{story.shares}</span>
        </button>
      </div>

      {/* 触发警告 */}
      {story.triggerWarning && (
        <div className="story-card__warning">
          ⚠️ {story.triggerWarning}
        </div>
      )}

      {/* AI 标识 */}
      {story.model !== 'fallback' && (
        <div className="story-card__ai-badge">
          AI 生成
        </div>
      )}
    </article>
  );
}
