# 📖 吃瓜日报 (DramaScroll AI)

AI 驱动的无限下拉故事流平台。实时内容生成、情绪互动、零成本架构。

## 🛠️ 技术栈 (Tool Stack)

| 工具 | 用途 | 免费额度 |
|------|------|---------|
| **Supabase** | PostgreSQL + BaaS | ✅ 500MB 数据库 |
| **Vercel** | 前端部署 | ✅ 100GB 带宽/月 |
| **Clerk** | 用户认证 | ✅ 10,000 MAU |
| **Upstash** | Redis 缓存/防抖 | ✅ 10,000 请求/日 |
| **Pinecone** | 向量数据库 | ✅ 100K 向量 |
| **Groq** | LLM 内容生成 | ✅ 免费 API |
| **PostHog** | 数据分析 | ✅ 1M 事件/月 |
| **Sentry** | 错误追踪 | ✅ 5K 错误/月 |
| **Resend** | 邮件服务 | ✅ 3,000 封/月 |
| **Stripe** | 订阅支付 | ✅ 免费集成 (2.9%) |
| **Cloudflare** | CDN/DNS | ✅ 无限带宽 |
| **GitHub** | 版本控制 | ✅ 无限仓库 |

## 📐 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN / DNS                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐          ┌──────────────────────────┐  │
│  │  Frontend (Vite)  │──────▶│  Node.js BFF (Express)    │  │
│  │  Vercel 部署       │  API   │  Railway/Render 部署       │  │
│  │                    │        │                            │  │
│  │  ├─ Clerk Auth    │        │  ├─ Supabase (PostgreSQL)  │  │
│  │  ├─ PostHog       │        │  ├─ Upstash (Redis)        │  │
│  │  ├─ Sentry        │        │  ├─ Pinecone (向量)        │  │
│  │  └─ Stripe.js     │        │  ├─ Groq (LLM)            │  │
│  └──────────────────┘          │  ├─ Clerk (认证)          │  │
│                                  │  ├─ Stripe (支付)        │  │
│  ┌──────────────────┐          │  ├─ Resend (邮件)         │  │
│  │  Java Spring Boot │◀────▶│  ├─ Sentry (错误)          │  │
│  │  (高并发 API)      │        │  └─ PostHog (分析)         │  │
│  │  ├─ Supabase PG   │        └──────────────────────────┘  │
│  │  ├─ Upstash Redis │                                       │
│  │  └─ Sentry        │                                       │
│  └──────────────────┘                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 克隆并安装

```bash
git clone https://github.com/your-repo/drama-scroll.git
cd drama-scroll
bash setup.sh
```

### 2. 配置环境变量

复制各服务的 `.env.example` 为 `.env`，填入 API Key：

```bash
cp frontend/.env.example frontend/.env
cp backend-node/.env.example backend-node/.env
```

### 3. 启动本地基础设施

```bash
docker-compose up -d  # Redis (6380) + PostgreSQL (5432)
```

### 4. 启动各服务

```bash
# 终端 1: Node.js BFF
cd backend-node && npm run dev

# 终端 2: 前端
cd frontend && npm run dev

# 终端 3: Java 后端（可选）
cd backend-java && ./mvnw spring-boot:run
```

### 5. 访问

- 前端: http://localhost:5173
- Node.js BFF: http://localhost:3001
- Java API: http://localhost:8080

## 📦 项目结构

```
drama-scroll/
├── frontend/                # React + Vite 前端
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   ├── lib/             # 第三方服务配置
│   │   │   ├── clerk.ts     # Clerk 认证
│   │   │   ├── posthog.ts   # PostHog 分析
│   │   │   ├── sentry.ts    # Sentry 错误追踪
│   │   │   └── stripe.ts    # Stripe 支付
│   │   ├── services/        # API 服务层
│   │   ├── stores/          # Zustand 状态
│   │   └── types/           # TypeScript 类型
│   └── .env.example
│
├── backend-node/            # Node.js BFF
│   ├── src/
│   │   ├── lib/             # 第三方服务客户端
│   │   │   ├── supabase.js  # Supabase BaaS
│   │   │   ├── upstash.js   # Upstash Redis
│   │   │   ├── resend.js    # Resend 邮件
│   │   │   ├── stripe.js    # Stripe 支付
│   │   │   ├── sentry.js    # Sentry 错误追踪
│   │   │   └── posthog.js   # PostHog 分析
│   │   ├── middleware/
│   │   │   ├── auth.js      # Clerk 认证中间件
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── stories.js   # 故事 CRUD + LLM
│   │   │   ├── sse.js       # SSE 实时推送
│   │   │   ├── engagement.js# 互动 (点赞/踩/投票)
│   │   │   ├── payments.js  # Stripe 支付
│   │   │   ├── email.js     # Resend 邮件
│   │   │   └── health.js
│   │   └── services/        # 业务服务
│   └── .env.example
│
├── backend-java/            # Java Spring Boot (高并发)
│   └── src/main/
│       ├── java/com/dramascroll/
│       └── resources/
│           ├── application.properties
│           └── db/init.sql  # 包含 Supabase RPC
│
├── docker-compose.yml       # 本地 Redis + PostgreSQL
├── vercel.json              # Vercel 部署配置
├── setup.sh                 # 一键安装
└── dev.sh                   # 并发启动所有服务
```

## 🔑 环境变量速查

| 变量 | 获取地址 |
|------|---------|
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | [supabase.com/dashboard](https://supabase.com/dashboard) |
| `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` | [console.upstash.com](https://console.upstash.com) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| `PINECONE_API_KEY` | [app.pinecone.io](https://app.pinecone.io) |
| `CLERK_SECRET_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) |
| `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` | [dashboard.stripe.com](https://dashboard.stripe.com) |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | [sentry.io](https://sentry.io) |
| `POSTHOG_API_KEY` / `VITE_POSTHOG_KEY` | [app.posthog.com](https://app.posthog.com) |

## 📋 部署清单

1. **Vercel** — `git push` 自动部署前端
2. **Railway/Render** — 部署 Node.js BFF
3. **Supabase** — 在控制台运行 `init.sql`
4. **Upstash** — 创建 Redis 实例，复制连接信息
5. **Clerk** — 创建应用，配置 Webhook
6. **Cloudflare** — 添加域名，配置 DNS
7. **Stripe** — 创建产品和价格，配置 Webhook
8. **Sentry** — 创建项目，复制 DSN
9. **PostHog** — 创建项目，复制 API Key
10. **Resend** — 验证域名，创建 API Key
