-- DramaScroll AI - Database Schema
-- This runs on first docker-compose up

-- Stories engagement table
CREATE TABLE IF NOT EXISTS story_engagement (
    id BIGSERIAL PRIMARY KEY,
    story_id VARCHAR(64) NOT NULL,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique index on story_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_story_engagement_story_id ON story_engagement(story_id);

-- Emotion votes table
CREATE TABLE IF NOT EXISTS emotion_vote (
    id BIGSERIAL PRIMARY KEY,
    story_id VARCHAR(64) NOT NULL,
    user_fingerprint VARCHAR(128) NOT NULL,
    emotion_type VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Composite index for dedup
CREATE UNIQUE INDEX IF NOT EXISTS idx_emotion_vote_unique
    ON emotion_vote(story_id, user_fingerprint);

-- Index for aggregation queries
CREATE INDEX IF NOT EXISTS idx_emotion_vote_story ON emotion_vote(story_id);
CREATE INDEX IF NOT EXISTS idx_emotion_vote_type ON emotion_vote(emotion_type);

-- User interaction log (for analytics)
CREATE TABLE IF NOT EXISTS user_interaction (
    id BIGSERIAL PRIMARY KEY,
    user_fingerprint VARCHAR(128) NOT NULL,
    story_id VARCHAR(64) NOT NULL,
    action_type VARCHAR(32) NOT NULL, -- 'like', 'dislike', 'share', 'view', 'scroll_past'
    duration_ms INTEGER DEFAULT 0,     -- Time spent on story
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_interaction_story ON user_interaction(story_id);
CREATE INDEX IF NOT EXISTS idx_user_interaction_user ON user_interaction(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_interaction_time ON user_interaction(created_at);

-- Aggregated stats materialized view (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS story_stats AS
SELECT
    story_id,
    COUNT(*) FILTER (WHERE action_type = 'view') AS view_count,
    COUNT(*) FILTER (WHERE action_type = 'like') AS like_count,
    COUNT(*) FILTER (WHERE action_type = 'share') AS share_count,
    AVG(duration_ms) FILTER (WHERE action_type = 'view') AS avg_view_duration_ms,
    MAX(created_at) AS last_interaction_at
FROM user_interaction
GROUP BY story_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_story_stats_id ON story_stats(story_id);

-- ==============================================
-- 以下为 Supabase / Clerk / 新服务集成所需的表和函数
-- ==============================================

-- 故事内容表 (Supabase 持久化)
CREATE TABLE IF NOT EXISTS stories (
    id VARCHAR(64) PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(32) DEFAULT 'community',
    emotion_tag VARCHAR(32) DEFAULT '',
    hook_score DECIMAL(3,1) DEFAULT 5.0,
    trigger_warning TEXT,
    model VARCHAR(32) DEFAULT 'unknown',
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    read_time INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_created ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_category ON stories(category);

-- 用户表 (关联 Clerk)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,  -- Clerk user ID
    email VARCHAR(255),
    username VARCHAR(128),
    avatar_url TEXT,
    stripe_customer_id VARCHAR(128),
    subscription_status VARCHAR(32) DEFAULT 'free',  -- free, pro, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);

-- Supabase RPC: 原子递增互动计数
CREATE OR REPLACE FUNCTION increment_engagement(
    p_story_id VARCHAR,
    p_field VARCHAR,
    p_delta INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
    INSERT INTO story_engagement (story_id, likes_count, dislikes_count, shares_count, comments_count)
    VALUES (p_story_id, 0, 0, 0, 0)
    ON CONFLICT (story_id) DO NOTHING;

    EXECUTE format(
        'UPDATE story_engagement SET %I = %I + $1, updated_at = NOW() WHERE story_id = $2',
        p_field, p_field
    ) USING p_delta, p_story_id;
END;
$$ LANGUAGE plpgsql;

-- Supabase RLS (Row Level Security) 策略
-- 注意: 需要在 Supabase 控制台启用 RLS 后这些策略才生效
-- ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE story_engagement ENABLE ROW LEVEL SECURITY;

-- 允许匿名读取故事
-- CREATE POLICY "stories_read_all" ON stories FOR SELECT USING (true);
-- 允许认证用户写入
-- CREATE POLICY "stories_insert_auth" ON stories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
