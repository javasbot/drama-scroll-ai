package com.dramascroll.service;

import com.dramascroll.dto.EngagementResponse;
import com.dramascroll.model.EmotionVote;
import com.dramascroll.model.StoryEngagement;
import com.dramascroll.model.UserInteraction;
import com.dramascroll.repository.EmotionVoteRepository;
import com.dramascroll.repository.StoryEngagementRepository;
import com.dramascroll.repository.UserInteractionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EngagementService {

    private final StringRedisTemplate redisTemplate;
    private final StoryEngagementRepository engagementRepo;
    private final EmotionVoteRepository emotionVoteRepo;
    private final UserInteractionRepository interactionRepo;

    @Value("${app.engagement.redis-debounce-ttl:5}")
    private int debounceTtlSeconds;

    @Value("${app.engagement.batch-size:100}")
    private int batchSize;

    // In-memory buffer for batch flushing
    private final ConcurrentLinkedQueue<PendingEngagement> pendingBuffer = new ConcurrentLinkedQueue<>();
    private final ConcurrentHashMap<String, AtomicInteger> pendingLikes = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicInteger> pendingDislikes = new ConcurrentHashMap<>();

    private record PendingEngagement(String storyId, String action, String userFingerprint, long timestamp) {}

    // =================== LIKE / DISLIKE ===================

    /**
     * Process a like/dislike action with Redis debouncing.
     * Rapid repeated actions from the same user on the same story are debounced.
     *
     * @return true if accepted, false if debounced (duplicate within TTL)
     */
    public boolean processLikeAction(String storyId, String userFingerprint, String action) {
        // Redis debounce key: prevent rapid clicks
        String debounceKey = String.format("debounce:%s:%s:%s", action, storyId, userFingerprint);

        try {
            Boolean isNew = redisTemplate.opsForValue()
                    .setIfAbsent(debounceKey, "1", Duration.ofSeconds(debounceTtlSeconds));

            if (Boolean.FALSE.equals(isNew)) {
                log.debug("[Debounce] Duplicate {} from {} on story {}", action, userFingerprint, storyId);
                return false;
            }
        } catch (Exception e) {
            // Redis down? Fall through - accept the action
            log.warn("[Redis] Debounce check failed, accepting action: {}", e.getMessage());
        }

        // Increment in-memory counter for batch flush
        if ("like".equals(action)) {
            pendingLikes.computeIfAbsent(storyId, k -> new AtomicInteger(0)).incrementAndGet();
        } else if ("dislike".equals(action)) {
            pendingDislikes.computeIfAbsent(storyId, k -> new AtomicInteger(0)).incrementAndGet();
        }

        // Also buffer the detailed interaction for analytics
        pendingBuffer.offer(new PendingEngagement(storyId, action, userFingerprint, System.currentTimeMillis()));

        // Update Redis real-time counter for immediate frontend response
        try {
            String counterKey = String.format("counter:%s:%s", action, storyId);
            redisTemplate.opsForValue().increment(counterKey);
        } catch (Exception e) {
            log.warn("[Redis] Counter increment failed: {}", e.getMessage());
        }

        return true;
    }

    // =================== EMOTION VOTE ===================

    /**
     * Process an emotion vote with deduplication.
     */
    @Transactional
    public boolean processEmotionVote(String storyId, String userFingerprint, String emotionType) {
        // Check Redis for rapid duplicate
        String debounceKey = String.format("debounce:emotion:%s:%s", storyId, userFingerprint);
        try {
            Boolean isNew = redisTemplate.opsForValue()
                    .setIfAbsent(debounceKey, emotionType, Duration.ofSeconds(debounceTtlSeconds));
            if (Boolean.FALSE.equals(isNew)) {
                return false;
            }
        } catch (Exception e) {
            log.warn("[Redis] Emotion debounce failed: {}", e.getMessage());
        }

        // DB-level dedup
        Optional<EmotionVote> existing = emotionVoteRepo
                .findByStoryIdAndUserFingerprint(storyId, userFingerprint);

        if (existing.isPresent()) {
            // Update existing vote
            EmotionVote vote = existing.get();
            vote.setEmotionType(emotionType);
            emotionVoteRepo.save(vote);
        } else {
            // Create new vote
            emotionVoteRepo.save(EmotionVote.builder()
                    .storyId(storyId)
                    .userFingerprint(userFingerprint)
                    .emotionType(emotionType)
                    .build());
        }

        return true;
    }

    // =================== QUERY ===================

    /**
     * Get engagement metrics for a story (Redis + DB).
     */
    public EngagementResponse getEngagement(String storyId) {
        // Try Redis counters first for real-time data
        int likes = getRedisCounter("like", storyId);
        int dislikes = getRedisCounter("dislike", storyId);

        // Fall back to DB if Redis has no data
        if (likes == 0 && dislikes == 0) {
            Optional<StoryEngagement> dbData = engagementRepo.findByStoryId(storyId);
            if (dbData.isPresent()) {
                StoryEngagement eng = dbData.get();
                likes = eng.getLikesCount();
                dislikes = eng.getDislikesCount();

                return EngagementResponse.builder()
                        .storyId(storyId)
                        .likesCount(likes)
                        .dislikesCount(dislikes)
                        .sharesCount(eng.getSharesCount())
                        .commentsCount(eng.getCommentsCount())
                        .emotionBreakdown(getEmotionBreakdown(storyId))
                        .build();
            }
        }

        return EngagementResponse.builder()
                .storyId(storyId)
                .likesCount(likes)
                .dislikesCount(dislikes)
                .sharesCount(0)
                .commentsCount(0)
                .emotionBreakdown(getEmotionBreakdown(storyId))
                .build();
    }

    /**
     * Get emotion breakdown for a story.
     */
    public Map<String, Long> getEmotionBreakdown(String storyId) {
        try {
            List<Object[]> results = emotionVoteRepo.countByStoryIdGroupByEmotion(storyId);
            return results.stream()
                    .collect(Collectors.toMap(
                            r -> (String) r[0],
                            r -> (Long) r[1]
                    ));
        } catch (Exception e) {
            log.error("[DB] Failed to get emotion breakdown for {}: {}", storyId, e.getMessage());
            return Collections.emptyMap();
        }
    }

    // =================== BATCH FLUSH (Scheduled) ===================

    /**
     * Periodically flush accumulated likes/dislikes to database.
     * This is the core "request merging" pattern for high-concurrency writes.
     */
    @Scheduled(fixedDelayString = "${app.engagement.flush-interval:10000}")
    @Transactional
    public void flushPendingEngagements() {
        int flushed = 0;

        // Flush likes
        Iterator<Map.Entry<String, AtomicInteger>> likeIterator = pendingLikes.entrySet().iterator();
        while (likeIterator.hasNext()) {
            Map.Entry<String, AtomicInteger> entry = likeIterator.next();
            String storyId = entry.getKey();
            int delta = entry.getValue().getAndSet(0);
            if (delta > 0) {
                ensureEngagementExists(storyId);
                engagementRepo.incrementLikes(storyId, delta);
                flushed++;
            }
            if (entry.getValue().get() == 0) {
                likeIterator.remove();
            }
        }

        // Flush dislikes
        Iterator<Map.Entry<String, AtomicInteger>> dislikeIterator = pendingDislikes.entrySet().iterator();
        while (dislikeIterator.hasNext()) {
            Map.Entry<String, AtomicInteger> entry = dislikeIterator.next();
            String storyId = entry.getKey();
            int delta = entry.getValue().getAndSet(0);
            if (delta > 0) {
                ensureEngagementExists(storyId);
                engagementRepo.incrementDislikes(storyId, delta);
                flushed++;
            }
            if (entry.getValue().get() == 0) {
                dislikeIterator.remove();
            }
        }

        // Flush interaction logs
        List<PendingEngagement> batch = new ArrayList<>();
        PendingEngagement pe;
        while ((pe = pendingBuffer.poll()) != null && batch.size() < batchSize) {
            batch.add(pe);
        }

        if (!batch.isEmpty()) {
            List<UserInteraction> interactions = batch.stream()
                    .map(p -> UserInteraction.builder()
                            .storyId(p.storyId())
                            .userFingerprint(p.userFingerprint())
                            .actionType(p.action())
                            .durationMs(0)
                            .createdAt(ZonedDateTime.now())
                            .build())
                    .toList();
            interactionRepo.saveAll(interactions);
            flushed += interactions.size();
        }

        if (flushed > 0) {
            log.info("[Flush] Persisted {} engagement updates to database", flushed);
        }
    }

    // =================== HELPERS ===================

    private void ensureEngagementExists(String storyId) {
        if (engagementRepo.findByStoryId(storyId).isEmpty()) {
            try {
                engagementRepo.save(StoryEngagement.builder()
                        .storyId(storyId)
                        .build());
            } catch (Exception e) {
                // Race condition - another thread created it
                log.debug("[DB] Engagement already exists for {}", storyId);
            }
        }
    }

    private int getRedisCounter(String action, String storyId) {
        try {
            String val = redisTemplate.opsForValue().get(String.format("counter:%s:%s", action, storyId));
            return val != null ? Integer.parseInt(val) : 0;
        } catch (Exception e) {
            return 0;
        }
    }
}
