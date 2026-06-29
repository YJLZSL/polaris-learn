# Polaris 架构说明（v3.0.0 静态化）

> 本文档描述 Polaris v3.0.0 的纯前端静态化架构，包括数据流、IndexedDB schema 设计、Repository 模式、客户端 AI 直连、本地认证流程与跨平台部署方案。

## 1. 架构概览

### 1.1 设计哲学

v3.0.0 重构的核心目标是**完全消除后端依赖**：

- **无服务器**：应用部署后无需运行任何 Node.js 服务进程，仅需静态文件托管
- **无数据库**：所有数据由浏览器原生 IndexedDB 持久化，按用户设备隔离
- **无中间层**：LLM 调用由客户端 `fetch` 直连供应商 API，无代理转发
- **无会话服务**：认证完全在客户端完成，token 存 localStorage + IndexedDB

### 1.2 架构图（ASCII）

```
┌─────────────────────────────────────────────────────────────┐
│                       浏览器 / WebView                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  React 应用（Next.js 静态导出）          │ │
│  │                                                           │ │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │ │
│  │  │   Pages      │──→│   Hooks /    │──→│  Stores      │ │ │
│  │  │  (app/)      │   │   Components  │   │ (Zustand)    │ │ │
│  │  └──────┬───────┘   └──────────────┘   └──────────────┘ │ │
│  │         │                                                 │ │
│  │         ▼                                                 │ │
│  │  ┌──────────────────────────────────────────────────────┐│ │
│  │  │              Services 层（客户端逻辑）                ││ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ││ │
│  │  │  │ ai-service   │  │ auth-service │  │ home-stats │  ││ │
│  │  │  │ (直连 LLM)   │  │ (PBKDF2)     │  │ (聚合)     │  ││ │
│  │  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  ││ │
│  │  └─────────┼─────────────────┼────────────────┼─────────┘│ │
│  │            │                 │                │          │ │
│  │  ┌─────────▼─────────────────▼────────────────▼─────────┐ │ │
│  │  │           Repository 层（数据访问抽象）                │ │ │
│  │  │  user │ auth │ practice │ error-notes │ knowledge     │ │ │
│  │  │  gamification │ conversation │ leaderboard │ courses │ │ │
│  │  └─────────────────────┬────────────────────────────────┘ │ │
│  │                        │                                  │ │
│  │  ┌─────────────────────▼────────────────────────────────┐ │ │
│  │  │       IndexedDB 封装（src/lib/db/indexeddb.ts）      │ │ │
│  │  │       使用 idb 库，封装 openDB / 事务 / CRUD          │ │ │
│  │  └─────────────────────┬────────────────────────────────┘ │ │
│  │                        │                                  │ │
│  │  ┌─────────────────────▼─────┐  ┌──────────────────────┐ │ │
│  │  │   IndexedDB（浏览器原生）  │  │  localStorage         │ │ │
│  │  │   持久化学习数据           │  │  API Key / Session    │ │ │
│  │  └───────────────────────────┘  └──────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                 │
└──────────────────────────────┼─────────────────────────────────┘
                               │ fetch（HTTPS）
                               ▼
            ┌──────────────────────────────────┐
            │     LLM 供应商 API（外部）         │
            │  DeepSeek / Qwen / OpenAI / Ollama │
            └──────────────────────────────────┘
```

### 1.3 关键设计原则

1. **静态优先**：所有页面在构建时生成 HTML，运行时不再访问服务端
2. **Repository 模式**：数据访问层抽象，未来如需切换到云端可平滑替换
3. **Service 层**：业务逻辑封装，与 UI 解耦
4. **客户端隔离**：每个浏览器/设备的数据独立，无中心化数据共享

## 2. 静态导出模式说明

### 2.1 Next.js `output: 'export'`

```ts
// next.config.ts
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};
```

启用后，`next build` 会将所有页面预渲染为静态 HTML，输出到 `out/` 目录。整个应用不再需要 Node.js 运行时。

### 2.2 静态导出的约束

- ❌ 不能使用 Server Actions、Route Handlers（`app/api/`）
- ❌ 不能使用 `cookies()`、`headers()`、`draftMode()` 等服务端 API
- ❌ 不能使用 `generateMetadata` 中的动态数据获取
- ❌ 不能使用 middleware
- ✅ 可以使用 Client Components、静态 `generateStaticParams`、`fetch` 客户端调用

### 2.3 构建产物结构

```
out/
├── index.html              # 首页
├── 404.html                # 404 页面
├── _next/                  # Next.js 静态资源（JS/CSS/字体）
│   ├── static/
│   └── ...
├── (auth)/                 # 认证相关页面
├── (dashboard)/            # 主应用页面
│   ├── home/
│   ├── practice/
│   ├── ai-teacher/
│   └── ...
├── manifest.json           # PWA manifest
├── icons/                  # PWA 图标
└── sw.js                   # Service Worker
```

## 3. IndexedDB Schema 设计

### 3.1 Schema 概览

定义在 `src/lib/db/schema.ts`，使用 idb 库的版本化迁移机制。

```
Database: polaris-learn (version 1)

┌─────────────────────┬──────────────────────────────────┬─────────────────┐
│ Store 名称           │ 主键 (keyPath)                    │ 索引 (indexes)  │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ users               │ id (uuid)                        │ email (unique)  │
│                     │                                  │ learningMode    │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ sessions            │ token (uuid)                     │ userId          │
│                     │                                  │ expiresAt       │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ practice_records    │ id                               │ userId          │
│                     │                                  │ questionId      │
│                     │                                  │ subject         │
│                     │                                  │ createdAt       │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ error_notes         │ id                               │ userId          │
│                     │                                  │ questionId      │
│                     │                                  │ reviewed        │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ knowledge_points    │ id                               │ subject         │
│                     │                                  │ gradeLevel      │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ badges              │ id                               │ -               │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ user_badges         │ id                               │ userId          │
│                     │                                  │ badgeId         │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ streak_records      │ userId                           │ date            │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ ai_conversations    │ id                               │ userId          │
│                     │                                  │ updatedAt       │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ subjects            │ id                               │ -               │
├─────────────────────┼──────────────────────────────────┼─────────────────┤
│ questions           │ id                               │ subject         │
│                     │                                  │ difficulty      │
│                     │                                  │ gradeLevel      │
└─────────────────────┴──────────────────────────────────┴─────────────────┘
```

### 3.2 版本化迁移

```ts
// src/lib/db/indexeddb.ts
const DB_VERSION = 1;

openDB('polaris-learn', DB_VERSION, {
  upgrade(db) {
    // v1: 创建所有 stores
    if (!db.objectStoreNames.contains('users')) {
      const usersStore = db.createObjectStore('users', { keyPath: 'id' });
      usersStore.createIndex('email', 'email', { unique: true });
      usersStore.createIndex('learningMode', 'learningMode');
    }
    // ... 其他 stores
  },
});
```

未来如需新增字段或 store，升级 `DB_VERSION` 到 2 并在 `upgrade` 函数中添加迁移逻辑即可，浏览器会自动调用。

### 3.3 通用 CRUD 封装

```ts
// 通用工具函数
getAll<T>(store): Promise<T[]>
getByKey<T>(store, key): Promise<T | undefined>
put<T>(store, value): Promise<void>
deleteByKey(store, key): Promise<void>
queryByIndex<T>(store, index, value): Promise<T[]>
```

所有 repository 都基于这 5 个工具函数构建，无需直接操作事务。

## 4. Repository 模式

### 4.1 设计意图

Repository 模式将数据访问逻辑集中到一层，使 UI 和业务逻辑层无需关心数据来源。这种抽象有以下好处：

- **可测试**：UI 层可对 repository 进行 mock
- **可替换**：未来若需切换到云端 API，仅需替换 repository 实现
- **统一接口**：所有数据访问风格一致

### 4.2 Repository 清单

| Repository | 文件 | 主要方法 |
|-----------|------|---------|
| User | `src/lib/repositories/user.repository.ts` | `createUser`, `getUserByEmail`, `updateUser`, `updateUserLearningMode` |
| Auth | `src/lib/repositories/auth.repository.ts` | `register`, `login`, `changePassword`, `getSession`, `setSession`, `clearSession` |
| Practice | `src/lib/repositories/practice.repository.ts` | `getQuestions`, `saveAnswer`, `getPracticeStats` |
| ErrorNotes | `src/lib/repositories/error-notes.repository.ts` | `addErrorNote`, `getErrorNotes`, `removeErrorNote`, `markReviewed` |
| Knowledge | `src/lib/repositories/knowledge.repository.ts` | `getKnowledgePoints`, `updateMastery` |
| Gamification | `src/lib/repositories/gamification.repository.ts` | `getBadges`, `awardBadge`, `getUserBadges`, `getStreak`, `updateStreak`, `addXP` |
| Conversation | `src/lib/repositories/conversation.repository.ts` | `saveConversation`, `getConversations`, `deleteConversation` |
| Leaderboard | `src/lib/repositories/leaderboard.repository.ts` | `getTopUsers`, `getUserRank` |
| Courses | `src/lib/repositories/courses.repository.ts` | `getCourses`, `getCourseById`（静态示例课程） |

### 4.3 使用示例

```ts
// 在页面组件中
import { practiceRepository } from '@/lib/repositories/practice.repository';

async function loadQuestions() {
  const questions = await practiceRepository.getQuestions({
    subject: 'math',
    difficulty: 'medium',
    learningMode: 'MIDDLE_HIGH',
  });
  setQuestions(questions);
}
```

## 5. 客户端 AI 直连架构

### 5.1 数据流

```
用户在 AI 老师页输入消息
         │
         ▼
┌─────────────────────────┐
│  ai-service.ts          │
│  - buildSocraticPrompt  │
│  - applyModeTone        │
│  - chat(messages, mode, │
│         apiKey, provider)│
└────────┬────────────────┘
         │ fetch POST
         ▼
┌─────────────────────────┐
│  LLM 供应商 API          │
│  - DeepSeek             │
│  - Qwen (通义千问)       │
│  - OpenAI               │
│  - Ollama (本地)        │
│  - Custom (OpenAI 兼容)  │
└────────┬────────────────┘
         │ JSON response
         ▼
┌─────────────────────────┐
│  conversation.repo      │
│  - saveConversation     │
└────────┬────────────────┘
         │
         ▼
    IndexedDB 持久化
```

### 5.2 Provider 适配

`ai-service.ts` 内部根据 `provider` 字段构造不同的请求：

| Provider | Endpoint | 认证 |
|----------|----------|------|
| deepseek | `https://api.deepseek.com/v1/chat/completions` | `Bearer ${apiKey}` |
| qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `Bearer ${apiKey}` |
| openai | `https://api.openai.com/v1/chat/completions` | `Bearer ${apiKey}` |
| ollama | `http://localhost:11434/v1/chat/completions` | 无 |
| custom | 用户自定义 `baseUrl` | `Bearer ${apiKey}` |

所有 provider 都遵循 OpenAI Chat Completions 协议，便于统一适配。

### 5.3 API Key 存储

API Key 仅存储在 `localStorage`，**永不上传任何服务器**：

```ts
// 写入
localStorage.setItem('llm_api_key', apiKey);
localStorage.setItem('llm_provider', provider);

// 读取（仅在客户端）
const apiKey = localStorage.getItem('llm_api_key');
```

### 5.4 降级响应

当 API Key 缺失、网络错误或限流时，`ai-service.ts` 会调用 `simulateAIResponse()` 返回本地生成的占位回复，确保用户体验不中断。

## 6. 本地认证流程

### 6.1 注册流程

```
用户填写 email + password + learningMode
         │
         ▼
┌─────────────────────────────────┐
│  auth-service.register()        │
│                                  │
│  1. 检查 email 是否已存在         │
│     └→ auth.repository           │
│         .getUserByEmail(email)   │
│                                  │
│  2. 生成 16 字节 salt            │
│     └→ crypto.getRandomValues    │
│                                  │
│  3. PBKDF2 哈希密码               │
│     └→ crypto.subtle.deriveBits  │
│        - iterations: 100000      │
│        - hash: SHA-256           │
│        - keylen: 32 bytes        │
│                                  │
│  4. 写入 users store             │
│     └→ user.repository           │
│         .createUser({            │
│             id, email,           │
│             passwordHash,        │
│             salt, learningMode   │
│           })                     │
│                                  │
│  5. 生成会话 token                │
│     └→ crypto.randomUUID()      │
│                                  │
│  6. 写入 sessions store          │
│     └→ auth.repository           │
│         .setSession(...)         │
│                                  │
│  7. localStorage 存 token        │
└─────────────────────────────────┘
```

### 6.2 登录流程

```
用户填写 email + password
         │
         ▼
┌─────────────────────────────────┐
│  auth-service.login()           │
│                                  │
│  1. 根据 email 查用户            │
│  2. 取出 salt，对输入密码做       │
│     PBKDF2 哈希                  │
│  3. 对比 passwordHash            │
│  4. 匹配 → 生成新 token          │
│     └→ crypto.randomUUID()      │
│  5. 写入 sessions store          │
│  6. localStorage 存 token        │
│  7. 返回 user 对象               │
└─────────────────────────────────┘
```

### 6.3 会话验证

`SessionProvider` 在应用启动时：

1. 从 `localStorage` 读取 token
2. 用 token 查询 `sessions` store
3. 检查 `expiresAt` 是否有效
4. 用 `userId` 查询 `users` store 获取用户信息
5. 注入到 React Context 供全局使用

### 6.4 安全特性

- ✅ PBKDF2 100000 次迭代，防止暴力破解
- ✅ 每个用户独立 salt，防止彩虹表攻击
- ✅ 会话 token 使用 `crypto.randomUUID()`，密码学安全
- ✅ 密码哈希永不离开客户端设备
- ⚠️ **局限**：因为是纯客户端，无法防止用户查看自己的数据。但用户本就该能查看自己的数据。

## 7. 跨平台部署方案

### 7.1 三端统一架构

```
                    ┌──────────────┐
                    │  next build  │
                    │  (output:    │
                    │   'export')  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   out/ 目录   │
                    │ (静态文件)    │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │   Web    │     │ Android  │     │ Electron │
   │  (PWA)   │     │ (Capacitor)│   │          │
   └──────────┘     └──────────┘     └──────────┘
   静态托管          内嵌 WebView      electron-serve
   Vercel/           加载 out/        加载 out/
   Netlify/Nginx     androidScheme:   + DPI 缩放
                     https
```

### 7.2 Web（PWA）

- **构建**：`npm run build` → `out/`
- **部署**：上传 `out/` 到任意静态托管平台
- **PWA**：`manifest.json` + Service Worker，可安装到桌面/主屏
- **离线**：Service Worker 缓存静态资源，IndexedDB 数据天然离线

### 7.3 Android（Capacitor）

```ts
// capacitor.config.ts
export default {
  appId: 'com.polaris.learn',
  appName: 'Polaris',
  webDir: 'out',                    // 静态导出目录
  server: {
    androidScheme: 'https',        // 强制 https
    // 不设置 server.url，让 webview 加载本地 out/ 文件
  },
};
```

- **构建**：`npm run android:build` → `cap sync android` → `gradlew assembleDebug`
- **网络**：`network_security_config.xml` 白名单 localhost / 局域网 IP，允许 Ollama 本地连接
- **Service Worker**：在 Capacitor 原生环境跳过注册（避免与 webview 冲突）

### 7.4 Electron（PC）

```js
// electron/main.js
const loadURL = require('electron-serve')({ directory: 'out' });

app.whenReady().then(() => {
  const { scaleFactor } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    webPreferences: { zoomFactor: scaleFactor },
    minWidth: 1024 * scaleFactor,
    minHeight: 768 * scaleFactor,
  });
  loadURL(win);  // 加载 out/index.html
});

screen.on('display-metrics-changed', () => {
  // DPI 变化时调整 zoomFactor
});
```

- **构建**：`npm run electron:build` → `electron-builder` 打包
- **DPI**：自动检测 `scaleFactor`，按比例缩放窗口与内容
- **自动更新**：electron-updater + GitHub Releases

### 7.5 构建命令速查

| 目标 | 命令 | 产物路径 |
|------|------|---------|
| Web 静态 | `npm run build` | `out/` |
| Android APK | `npm run android:build` → `cd android && ./gradlew assembleDebug` | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Electron 安装包 | `npm run electron:build` | `electron-dist/Polaris 北极星学习平台 Setup.exe` |

## 8. 目录结构

```
ai-edu-platform/
├── electron/                  # Electron 主进程
│   └── main.js                # 入口（electron-serve + DPI 检测）
├── android/                   # Capacitor Android 项目
│   └── app/src/main/res/xml/
│       └── network_security_config.xml  # 网络白名单
├── public/                    # 静态资源
│   ├── manifest.json          # PWA 配置
│   └── icons/                 # 应用图标 + maskable 图标
├── src/
│   ├── app/                   # Next.js App Router 页面
│   │   ├── (auth)/            # 认证页面（登录/注册）
│   │   ├── (dashboard)/       # 主应用页面
│   │   │   ├── home/
│   │   │   ├── practice/
│   │   │   ├── ai-teacher/
│   │   │   ├── knowledge-graph/
│   │   │   ├── error-notes/
│   │   │   ├── analytics/
│   │   │   ├── leaderboard/
│   │   │   ├── courses/
│   │   │   ├── settings/
│   │   │   ├── profile/
│   │   │   └── layout.tsx     # 仪表盘布局（含 MobileNav）
│   │   ├── globals.css        # 全局样式 + design tokens
│   │   └── layout.tsx         # 根布局（viewport + 字体）
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileNav.tsx   # 移动端底部导航
│   │   ├── providers/
│   │   │   ├── SessionProvider.tsx  # 本地会话上下文
│   │   │   └── ServiceWorkerRegister.tsx
│   │   └── ui/                 # shadcn/ui 组件
│   ├── hooks/                  # 响应式 hooks
│   │   ├── use-media-query.ts
│   │   ├── use-is-mobile.ts
│   │   └── use-device-pixel-ratio.ts
│   ├── lib/
│   │   ├── db/                 # IndexedDB 封装
│   │   │   ├── schema.ts       # schema 定义
│   │   │   └── indexeddb.ts    # openDB + 通用 CRUD
│   │   ├── repositories/       # Repository 层（9 个）
│   │   ├── services/           # Service 层
│   │   │   ├── ai-service.ts   # 客户端 AI 直连
│   │   │   └── auth-service.ts # PBKDF2 认证
│   │   ├── motion.ts           # 动画预设（EASE_OUT_EXPO）
│   │   ├── constants.ts        # 学科常量
│   │   ├── learning-modes.ts   # 学习模式配置
│   │   └── version.ts          # 静态版本信息
│   └── stores/
│       └── useUserStore.ts     # Zustand 用户状态
├── capacitor.config.ts         # Capacitor 配置
├── next.config.ts             # Next.js 配置（output: 'export'）
└── package.json                # 版本 3.0.0
```

## 9. 迁移路径（从 v2.x 升级）

如果你正在使用 v2.x（Prisma + NextAuth 架构），升级到 v3.0.0 时需要注意：

1. **数据迁移**：v3.0.0 数据存储在浏览器 IndexedDB，与 v2.x 的服务端数据库**完全隔离**。已有用户数据需重新创建，或编写一次性迁移脚本将 SQLite 数据导出后通过种子脚本注入。
2. **API Routes 全部移除**：原有 `/api/*` 路由不再存在，所有数据访问改为前端 repository 直读 IndexedDB。
3. **认证系统重置**：用户需重新注册账号，原 NextAuth 会话失效。
4. **环境变量**：`.env` 不再需要，可删除 `DATABASE_URL`、`AUTH_SECRET`、`NEXTAUTH_URL` 等配置。
5. **部署方式**：从「Node.js 服务 + 数据库」改为「静态文件托管」。

## 10. 相关文档

- [README.md](../README.md) - 项目概览与快速开始
- [CHANGELOG.md](../CHANGELOG.md) - 完整变更记录
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [ANDROID_BUILD.md](./ANDROID_BUILD.md) - Android 构建指南
- [SECURITY.md](./SECURITY.md) - 安全规范
- [API_REFERENCE.md](./API_REFERENCE.md) - ⚠️ 已废弃（v3.0.0 移除服务端 API）
