/**
 * Upstash Redis 客户端
 * @see https://upstash.com/docs/redis/sdks/ts/overview
 */
import { Redis } from '@upstash/redis';

const UPSTASH_URL = process.env.UPSTASH_REDIS_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_TOKEN || '';

export const isUpstashEnabled = !!(UPSTASH_URL && UPSTASH_TOKEN);

let redis = null;

if (isUpstashEnabled) {
  redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
  console.log('[Upstash] Redis 客户端初始化完成');
} else {
  console.log('[Upstash] 未配置，使用内存 fallback');
}

// 内存 fallback（开发环境无 Upstash 时使用）
const memoryCache = new Map();

// --- 通用缓存操作 ---

export async function cacheGet(key) {
  if (!redis) return memoryCache.get(key) || null;
  try {
    return await redis.get(key);
  } catch (error) {
    console.error('[Upstash] GET 失败:', error.message);
    return memoryCache.get(key) || null;
  }
}

export async function cacheSet(key, value, exSeconds) {
  memoryCache.set(key, value);
  if (!redis) return;
  try {
    if (exSeconds) {
      await redis.set(key, value, { ex: exSeconds });
    } else {
      await redis.set(key, value);
    }
  } catch (error) {
    console.error('[Upstash] SET 失败:', error.message);
  }
}

export async function cacheIncr(key) {
  if (!redis) {
    const val = (memoryCache.get(key) || 0) + 1;
    memoryCache.set(key, val);
    return val;
  }
  try {
    return await redis.incr(key);
  } catch (error) {
    console.error('[Upstash] INCR 失败:', error.message);
    const val = (memoryCache.get(key) || 0) + 1;
    memoryCache.set(key, val);
    return val;
  }
}

// --- 请求防抖（替代 Java 端的 Redis SET NX EX）---

export async function debounceCheck(key, ttlSeconds = 5) {
  if (!redis) {
    if (memoryCache.has(`debounce:${key}`)) return false;
    memoryCache.set(`debounce:${key}`, true);
    setTimeout(() => memoryCache.delete(`debounce:${key}`), ttlSeconds * 1000);
    return true;
  }
  try {
    const result = await redis.set(`debounce:${key}`, '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  } catch (error) {
    console.error('[Upstash] 防抖检查失败:', error.message);
    return true; // 失败时放行
  }
}

// --- 速率限制 ---

export async function rateLimit(identifier, maxRequests = 30, windowSeconds = 60) {
  const key = `ratelimit:${identifier}`;
  if (!redis) {
    const count = (memoryCache.get(key) || 0) + 1;
    memoryCache.set(key, count);
    return count <= maxRequests;
  }
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    return count <= maxRequests;
  } catch (error) {
    console.error('[Upstash] 速率限制失败:', error.message);
    return true;
  }
}

export { redis };
