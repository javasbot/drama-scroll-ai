package com.dramascroll.controller;

import com.dramascroll.dto.*;
import com.dramascroll.service.EngagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/engagement")
@RequiredArgsConstructor
@Slf4j
public class EngagementController {

    private final EngagementService engagementService;

    /**
     * POST /api/engagement/like
     * Process a like or dislike action with Redis debouncing.
     */
    @PostMapping("/like")
    public ResponseEntity<ApiResponse<Map<String, Object>>> processLike(
            @Valid @RequestBody LikeRequest request) {

        String action = request.getAction();
        if (!"like".equals(action) && !"dislike".equals(action)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid action", "Action must be 'like' or 'dislike'"));
        }

        boolean accepted = engagementService.processLikeAction(
                request.getStoryId(),
                request.getUserFingerprint(),
                action
        );

        if (accepted) {
            return ResponseEntity.ok(ApiResponse.ok(
                    Map.of(
                            "storyId", request.getStoryId(),
                            "action", action,
                            "status", "accepted"
                    ),
                    "Action recorded"
            ));
        } else {
            return ResponseEntity.ok(ApiResponse.ok(
                    Map.of(
                            "storyId", request.getStoryId(),
                            "action", action,
                            "status", "debounced"
                    ),
                    "Duplicate action within cooldown period"
            ));
        }
    }

    /**
     * POST /api/engagement/emotion
     * Process an emotion vote.
     */
    @PostMapping("/emotion")
    public ResponseEntity<ApiResponse<Map<String, Object>>> processEmotionVote(
            @Valid @RequestBody EmotionVoteRequest request) {

        boolean accepted = engagementService.processEmotionVote(
                request.getStoryId(),
                request.getUserFingerprint(),
                request.getEmotionType()
        );

        return ResponseEntity.ok(ApiResponse.ok(
                Map.of(
                        "storyId", request.getStoryId(),
                        "emotionType", request.getEmotionType(),
                        "status", accepted ? "accepted" : "debounced"
                )
        ));
    }

    /**
     * GET /api/engagement/{storyId}
     * Get engagement metrics for a story.
     */
    @GetMapping("/{storyId}")
    public ResponseEntity<ApiResponse<EngagementResponse>> getEngagement(
            @PathVariable String storyId) {

        EngagementResponse response = engagementService.getEngagement(storyId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * GET /api/engagement/{storyId}/emotions
     * Get emotion breakdown for a story.
     */
    @GetMapping("/{storyId}/emotions")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getEmotions(
            @PathVariable String storyId) {

        Map<String, Long> emotions = engagementService.getEmotionBreakdown(storyId);
        return ResponseEntity.ok(ApiResponse.ok(emotions));
    }
}
