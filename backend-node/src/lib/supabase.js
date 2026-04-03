/**
 * Supabase 客户端
 * @see https://supabase.com/docs/reference/javascript
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export const isSupabaseEnabled = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

let supabase = null;

if (isSupabaseEnabled) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
  console.log('[Supabase] 客户端初始化完成');
} else {
  console.log('[Supabase] 未配置，使用本地 fallback');
}

// --- 故事相关操作 ---
export async function upsertStory(story) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('stories').upsert(story).select().single();
  if (error) console.error('[Supabase] 保存故事失败:', error.message);
  return data;
}

export async function getStories(page = 1, size = 10) {
  if (!supabase) return [];
  const start = (page - 1) * size;
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
    .range(start, start + size - 1);
  if (error) console.error('[Supabase] 查询故事失败:', error.message);
  return data || [];
}

// --- 互动相关操作 ---
export async function incrementEngagement(storyId, field, delta = 1) {
  if (!supabase) return;
  const { error } = await supabase.rpc('increment_engagement', {
    p_story_id: storyId,
    p_field: field,
    p_delta: delta,
  });
  if (error) console.error('[Supabase] 更新互动失败:', error.message);
}

export async function getEngagement(storyId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('story_engagement')
    .select('*')
    .eq('story_id', storyId)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] 查询互动失败:', error.message);
  }
  return data;
}

// --- 用户相关操作 ---
export async function upsertUser(userId, metadata = {}) {
  if (!supabase) return;
  const { error } = await supabase.from('users').upsert({
    id: userId,
    ...metadata,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('[Supabase] 更新用户失败:', error.message);
}

export { supabase };
