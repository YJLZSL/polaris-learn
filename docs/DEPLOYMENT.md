# 智学AI 部署指南

## 目录

1. [环境要求](#环境要求)
2. [开发环境部署](#开发环境部署)
3. [Docker 部署](#docker-部署)
4. [生产环境 PostgreSQL 部署](#生产环境-postgresql-部署)
5. [自建 Redis（可选）](#自建-redis可选)
6. [HTTPS 配置](#https-配置)
7. [Electron 桌面端构建](#electron-桌面端构建)
8. [Android APK 构建](#android-apk-构建)

---

## 环境要求

| 组件 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18+ | 运行时 |
| npm | 9+ | 包管理 |
| SQLite | - | 开发环境默认，无需安装 |
| PostgreSQL | 16+ | 生产环境推荐 |
| Redis | 7+ | 可选，显著提升性能 |

---

## 开发环境部署

```bash
# 1. 克隆仓库
git clone https://github.com/openedu-ai/ai-edu-platform.git
cd ai-edu-platform

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local

# 4. 编辑 .env.local，至少配置一个 LLM API Key
# DEEPSEEK_API_KEY=sk-your-key-here

# 5. 初始化数据库
npx prisma db push

# 6. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

---

## Docker 部署

### 最小化部署（个人/小团队）
```bash
docker-compose -f docker-compose.minimal.yml up -d
```

### 标准部署（学校/机构）
```bash
# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 设置 DATABASE_PROVIDER=postgresql

docker-compose up -d
```

服务组成：
- `api-gateway` - Nginx 反向代理
- `postgres` - PostgreSQL 主数据库
- `redis` - Redis 缓存
- `web` - Next.js 前端服务

---

## 生产环境 PostgreSQL 部署

### 1. 配置数据库
```env
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://user:password@host:5432/ai_edu_platform?schema=public"
```

### 2. 同步表结构
```bash
npx prisma db push
```

### 3. 数据迁移（从 SQLite）
```bash
npm run db:migrate-pg
```

### 4. 构建与启动
```bash
npm run build
npm run start
```

---

## 自建 Redis（可选）

Redis 用于余额实时扣费和 API 限流。不配置时系统自动降级为纯数据库模式。

```env
REDIS_URL=redis://localhost:6379
```

Docker 快速启动：
```bash
docker run -d --name edu-redis -p 6379:6379 redis:7-alpine
```

---

## HTTPS 配置

### Nginx 反向代理示例
```nginx
server {
    listen 443 ssl;
    server_name api.zixueai.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Electron 桌面端构建

```bash
# 开发模式（同时启动 Next.js 和 Electron）
npm run electron:dev

# 构建安装包（输出到 electron-dist/）
npm run electron:build
```

构建产出：
- Windows: `electron-dist/智学AI教育平台 Setup.exe`
- macOS: `electron-dist/智学AI教育平台.dmg`
- Linux: `electron-dist/智学AI教育平台.AppImage`

> 构建前请替换 `public/icon-512.png` 为品牌图标。

---

## Android APK 构建

详见 [ANDROID_BUILD.md](./ANDROID_BUILD.md)

```bash
# 初始化 Android 项目
npm run android:init

# 构建同步
npm run android:build

# 生成 APK（需要 Android Studio）
cd android && ./gradlew assembleRelease
```

---

## 环境变量参考

全部环境变量见 `.env.example`，关键变量：

| 变量 | 说明 | 必填 |
|------|------|------|
| `DATABASE_URL` | 数据库连接字符串 | 是 |
| `DATABASE_PROVIDER` | sqlite 或 postgresql | 否(sqlite) |
| `AUTH_SECRET` | NextAuth 加密密钥 | 是 |
| `LLM_PROVIDER` | deepseek/qwen/openai/ollama/custom | 否(deepseek) |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 至少配一个 |
| `REDIS_URL` | Redis 连接字符串 | 否 |
