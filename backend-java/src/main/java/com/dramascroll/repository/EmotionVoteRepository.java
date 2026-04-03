package com.dramascroll.repository;

import com.dramascroll.model.EmotionVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmotionVoteRepository extends JpaRepository<EmotionVote, Long> {

    Optional<EmotionVote> findByStoryIdAndUserFingerprint(String storyId, String userFingerprint);

    @Query("SELECT e.emotionType, COUNT(e) FROM EmotionVote e WHERE e.storyId = :storyId GROUP BY e.emotionType")
    List<Object[]> countByStoryIdGroupByEmotion(@Param("storyId") String storyId);

    long countByStoryId(String storyId);
}
