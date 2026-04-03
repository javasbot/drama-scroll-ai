package com.dramascroll.repository;

import com.dramascroll.model.StoryEngagement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoryEngagementRepository extends JpaRepository<StoryEngagement, Long> {

    Optional<StoryEngagement> findByStoryId(String storyId);

    @Modifying
    @Query("UPDATE StoryEngagement e SET e.likesCount = e.likesCount + :delta, e.updatedAt = CURRENT_TIMESTAMP WHERE e.storyId = :storyId")
    int incrementLikes(@Param("storyId") String storyId, @Param("delta") int delta);

    @Modifying
    @Query("UPDATE StoryEngagement e SET e.dislikesCount = e.dislikesCount + :delta, e.updatedAt = CURRENT_TIMESTAMP WHERE e.storyId = :storyId")
    int incrementDislikes(@Param("storyId") String storyId, @Param("delta") int delta);

    @Modifying
    @Query("UPDATE StoryEngagement e SET e.sharesCount = e.sharesCount + :delta, e.updatedAt = CURRENT_TIMESTAMP WHERE e.storyId = :storyId")
    int incrementShares(@Param("storyId") String storyId, @Param("delta") int delta);
}
