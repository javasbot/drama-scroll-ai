import { useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFeedStore } from '../stores/feedStore';
import { StoryCard } from './StoryCard';
import { LoadingSpinner } from './LoadingSpinner';

export function Feed() {
  const {
    stories,
    isLoading,
    isLoadingMore,
    hasMore,
    sseConnected,
    error,
    loadInitialStories,
    loadMoreStories,
    connectSSE,
    disconnectSSE,
  } = useFeedStore();

  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialStories();
    return () => disconnectSSE();
  }, [loadInitialStories, disconnectSSE]);

  useEffect(() => {
    if (stories.length > 0 && !sseConnected) {
      connectSSE();
    }
  }, [stories.length, sseConnected, connectSSE]);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoadingMore && hasMore) {
        loadMoreStories();
      }
    },
    [isLoadingMore, hasMore, loadMoreStories],
  );

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '400px',
      threshold: 0,
    });

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [handleIntersection]);

  const virtualizer = useVirtualizer({
    count: stories.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 360,
    overscan: 5,
    gap: 0,
  });

  if (isLoading && stories.length === 0) {
    return (
      <div className="feed-loading">
        <LoadingSpinner />
        <p className="feed-loading__text">正在获取故事...</p>
      </div>
    );
  }

  if (error && stories.length === 0) {
    return (
      <div className="feed-error">
        <span className="feed-error__icon">😵</span>
        <p className="feed-error__text">{error}</p>
        <button className="feed-error__retry" onClick={loadInitialStories}>
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="feed" ref={parentRef} id="feed-container">
      <div
        className="feed__virtualizer"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const story = stories[virtualItem.index];
          if (!story) return null;

          return (
            <div
              key={story.id}
              className="feed__item"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
            >
              <StoryCard story={story} index={virtualItem.index} />
            </div>
          );
        })}
      </div>

      <div ref={loadMoreTriggerRef} className="feed__trigger" />

      {isLoadingMore && (
        <div className="feed__loading-more">
          <LoadingSpinner size="small" />
          <span>加载更多...</span>
        </div>
      )}

      {sseConnected && (
        <div className="feed__sse-indicator">
          <span className="feed__sse-dot" />
          实时更新中
        </div>
      )}
    </div>
  );
}
