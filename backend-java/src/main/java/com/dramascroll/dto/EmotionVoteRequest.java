package com.dramascroll.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmotionVoteRequest {

    @NotBlank(message = "storyId is required")
    @Size(max = 64)
    private String storyId;

    @NotBlank(message = "userFingerprint is required")
    @Size(max = 128)
    private String userFingerprint;

    @NotBlank(message = "emotionType is required")
    @Size(max = 32)
    private String emotionType;
}
