package com.dramascroll.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;

@Entity
@Table(name = "user_interaction")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_fingerprint", nullable = false, length = 128)
    private String userFingerprint;

    @Column(name = "story_id", nullable = false, length = 64)
    private String storyId;

    @Column(name = "action_type", nullable = false, length = 32)
    private String actionType;

    @Column(name = "duration_ms")
    @Builder.Default
    private Integer durationMs = 0;

    @Column(name = "created_at")
    @Builder.Default
    private ZonedDateTime createdAt = ZonedDateTime.now();
}
