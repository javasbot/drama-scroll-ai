/**
 * 吃瓜日报 — Node.js BFF 主入口
 * 
 * 集成服务：
 *  - Supabase (PostgreSQL BaaS)
 *  - Upstash (Redis 缓存/防抖)
 *  - Pinecone (向量搜索)
 *  - Groq (LLM 内容生成)
 *  - Clerk (认证)
 *  - Stripe (支付)
 *  - Resend (邮件)
 *  - Sentry (错误追踪)
 *  - PostHog (数据分析)
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// 中间件
import { clerkAuth } from './middleware/auth.js';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './lib/sentry.js';
import { shutdownPostHog } from './lib/posthog.js';
import { errorHandler } from './middleware/errorHandler.js';

// 路由
import healthRouter from './routes/health.js';
import storiesRouter from './routes/stories.js';
import sseRouter from './routes/sse.js';
import engagementRouter from './routes/engagement.js';
import paymentsRouter from './routes/payments.js';
import emailRouter from './routes/email.js';

const app = express();
const PORT = process.env.PORT || 3001;

// --- Sentry 初始化（需在所有中间件之前）---
initSentry(app);
app.use(sentryRequestHandler());

// --- 通用中间件 ---
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// --- Clerk 认证（公共模式，不强制登录）---
app.use(clerkAuth());

// --- 路由注册 ---
app.use('/api/health', healthRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/sse', sseRouter);
app.use('/api/engagement', engagementRouter);
app.use('/api/stripe', paymentsRouter);
app.use('/api/email', emailRouter);

// --- 错误处理 ---
app.use(sentryErrorHandler());
app.use(errorHandler);

// --- 启动服务 ---
const server = app.listen(PORT, () => {
  console.log('');
  console.log('┌──────────────────────────────────────┐');
  console.log('│     📖 吃瓜日报 BFF 已启动            │');
  console.log(`│     端口: ${PORT}                        │`);
  console.log('├──────────────────────────────────────┤');
  console.log('│  集成服务状态:                         │');
  
  const services = [
    ['Supabase', !!process.env.SUPABASE_URL],
    ['Upstash', !!process.env.UPSTASH_REDIS_URL],
    ['Groq', !!process.env.GROQ_API_KEY],
    ['Pinecone', !!process.env.PINECONE_API_KEY],
    ['Clerk', !!process.env.CLERK_SECRET_KEY],
    ['Stripe', !!process.env.STRIPE_SECRET_KEY],
    ['Resend', !!process.env.RESEND_API_KEY],
    ['Sentry', !!process.env.SENTRY_DSN],
    ['PostHog', !!process.env.POSTHOG_API_KEY],
  ];

  services.forEach(([name, enabled]) => {
    const status = enabled ? '✅' : '⬜';
    console.log(`│    ${status} ${name.padEnd(12)}`);
  });

  console.log('└──────────────────────────────────────┘');
  console.log('');
});

// --- 优雅关闭 ---
async function gracefulShutdown(signal) {
  console.log(`\n📖 收到 ${signal}，正在优雅关闭...`);
  
  await shutdownPostHog();
  
  server.close(() => {
    console.log('📖 服务已关闭');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('强制关闭');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
