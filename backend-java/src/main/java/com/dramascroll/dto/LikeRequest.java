package com.dramascroll.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LikeRequest {

    @NotBlank(message = "storyId is required")
    @Size(max = 64, message = "storyId must be <= 64 characters")
    private String storyId;

    @NotBlank(message = "userFingerprint is required")
    @Size(max = 128, message = "userFingerprint must be <= 128 characters")
    private String userFingerprint;

    /**
     * Action type: "like" or "dislike"
     */
    @NotBlank(message = "action is required")
    private String action;
}
