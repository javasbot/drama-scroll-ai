package com.dramascroll.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EngagementResponse {

    private String storyId;
    private Integer likesCount;
    private Integer dislikesCount;
    private Integer sharesCount;
    private Integer commentsCount;
    private Map<String, Long> emotionBreakdown;
}
