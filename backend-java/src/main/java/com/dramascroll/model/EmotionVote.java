package com.dramascroll.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;

@Entity
@Table(name = "emotion_vote")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmotionVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "story_id", nullable = false, length = 64)
    private String storyId;

    @Column(name = "user_fingerprint", nullable = false, length = 128)
    private String userFingerprint;

    @Column(name = "emotion_type", nullable = false, length = 32)
    private String emotionType;

    @Column(name = "created_at")
    @Builder.Default
    private ZonedDateTime createdAt = ZonedDateTime.now();
}
