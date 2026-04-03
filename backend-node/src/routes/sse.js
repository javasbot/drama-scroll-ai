import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateStory, streamStoryGeneration } from '../services/llmService.js';
import { upsertStoryVector } from '../services/vectorService.js';

export const sseRouter = Router();

// Track active SSE connections for graceful shutdown
const activeConnections = new Set();

/**
 * GET /api/sse/feed
 * Server-Sent Events endpoint for real-time story streaming
 */
sseRouter.get('/feed', (req, res) => {
  // SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  const connectionId = uuidv4();
  activeConnections.add(connectionId);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  // Story generation interval
  let isGenerating = false;
  const storyInterval = setInterval(async () => {
    if (isGenerating) return;
    isGenerating = true;

    try {
      const story = await generateStory();
      const id = uuidv4();
      const enriched = {
        id,
        ...story,
        likes: Math.floor(Math.random() * 200) + 5,
        comments: Math.floor(Math.random() * 50),
        shares: Math.floor(Math.random() * 20),
        readTime: Math.ceil(story.content.split(' ').length / 200),
      };

      res.write(`data: ${JSON.stringify({ type: 'new_story', story: enriched })}\n\n`);

      // Async vector upsert
      upsertStoryVector(id, story).catch(() => {});
    } catch (error) {
      console.error('[SSE] Story generation error:', error.message);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Generation temporarily unavailable' })}\n\n`);
    } finally {
      isGenerating = false;
    }
  }, 8000); // New story every 8 seconds

  // Client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(storyInterval);
    activeConnections.delete(connectionId);
    console.log(`[SSE] Client disconnected. Active: ${activeConnections.size}`);
  });
});

/**
 * GET /api/sse/story/stream
 * Stream a single story generation in real-time
 */
sseRouter.get('/story/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  });

  const theme = req.query.theme || undefined;

  try {
    await streamStoryGeneration(res, theme);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
  } finally {
    res.end();
  }
});

/**
 * GET /api/sse/status
 * Get SSE connection status
 */
sseRouter.get('/status', (_req, res) => {
  res.json({
    success: true,
    data: {
      activeConnections: activeConnections.size,
      timestamp: Date.now(),
    },
  });
});
