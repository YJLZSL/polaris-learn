# 智学AI 开发指南

## 目录

1. [架构概览](#架构概览)
2. [本地开发环境搭建](#本地开发环境搭建)
3. [项目结构](#项目结构)
4. [数据库](#数据库)
5. [API 开发规范](#api-开发规范)
6. [前端开发规范](#前端开发规范)
7. [安全护栏](#安全护栏)
8. [贡献指南](#贡献指南)

---

## 架构概览

```
┌──────────────────────────────────────────────────┐
│                接入层                              │
│  PC Web (Next.js) │ Admin (Next.js)              │
│  Electron Desktop  │ Android (Capacitor)         │
├──────────────────────────────────────────────────┤
│              API 网关层 (src/middleware.ts)        │
│  限流 │ 余额检查 │ IP 检测 │ 安全过滤            │
├──────────────────────────────────────────────────┤
│              业务服务层 (src/app/api/)             │
│  AI对话 │ LLM代理 │ 题库 │ 计费 │ 游戏 │ 分析    │
├──────────────────────────────────────────────────┤
│               核心库 (src/lib/)                   │
│  auth │ billing │ llm-adapter │ safety │ rate-limit│
│  game │ ai-tutor │ redis │ provider-health       │
├──────────────────────────────────────────────────┤
│                数据层                              │
│  Prisma ORM → SQLite / PostgreSQL                 │
│  Redis (缓存/限流/余额)                            │
└──────────────────────────────────────────────────┘
```

---

## 本地开发环境搭建

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local

# 3. 最少配置一个 LLM API Key
# DEEPSEEK_API_KEY=sk-your-key

# 4. 初始化数据库
npx prisma db push
npx prisma generate

# 5. 启动
npm run dev
```

---

## 项目结构

```
src/
├── app/
│   ├── (auth)/          # 登录/注册页面
│   ├── (dashboard)/     # 学生端控制台
│   │   ├── home/        # 首页
│   │   ├── practice/    # 练习
│   │   ├── ai-teacher/  # AI老师
│   │   ├── leaderboard/ # 排行榜
│   │   ├── knowledge-graph/ # 知识图谱
│   │   ├── error-notes/ # 错题本
│   │   ├── analytics/   # 学习报告
│   │   ├── billing/     # 计费中心
│   │   └── ...
│   ├── admin/           # 管理后台（独立布局+权限）
│   │   ├── users/       # 用户管理
│   │   ├── api-keys/    # API密钥管理
│   │   ├── providers/   # 模型供应商
│   │   └── usage/       # 用量统计
│   ├── api/             # API 路由处理器
│   │   ├── ai/          # AI 辅导
│   │   ├── billing/     # 计费
│   │   ├── admin/       # 管理API
│   │   ├── game/        # 游戏系统
│   │   └── ...
│   ├── docs/            # 开发者文档门户
│   └── llm-api/         # LLM 代理端点
├── components/
│   ├── layout/          # 布局组件（Sidebar, Header）
│   ├── providers/       # Context Provider
│   └── common/          # 通用组件
├── lib/
│   ├── auth.ts          # NextAuth 配置
│   ├── billing.ts       # 计费引擎
│   ├── llm-adapter.ts   # LLM 多模型适配
│   ├── safety.ts        # 安全护栏
│   ├── rate-limit.ts    # 限流
│   ├── redis.ts         # Redis 客户端
│   ├── provider-health.ts # Provider 健康检查
│   ├── game.ts          # 游戏化引擎
│   ├── ai-tutor.ts      # 苏格拉底教学引擎
│   └── prisma.ts        # 数据库客户端
├── stores/              # Zustand 状态管理
└── types/               # TypeScript 类型定义
```

---

## 数据库

### Schema

数据库使用 Prisma ORM，Schema 文件位于 `prisma/schema.prisma`。

核心模型：
- **User** - 用户（含 XP、等级、余额、角色）
- **Question** - 题目
- **KnowledgePoint** - 知识点
- **LearningRecord** - 学习记录
- **ErrorNote** - 错题
- **AIConversation / AIDialogueMessage** - AI 对话
- **APIUsageLog** - API 用量日志
- **VirtualAPIKey** - 虚拟 API Key
- **RechargeRecord** - 充值记录

### 操作命令

```bash
npx prisma db push          # 同步 Schema
npx prisma generate         # 重新生成客户端
npx prisma studio           # 数据库管理界面
npm run db:migrate-pg       # 迁移到 PostgreSQL
```

---

## API 开发规范

### 路由文件结构
```
src/app/api/[resource]/route.ts     # CRUD 主路由
src/app/api/[resource]/[id]/route.ts # 单个资源操作
```

### 鉴权
```typescript
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  // ...
}
```

### 错误处理
```typescript
try {
  // business logic
} catch (error) {
  console.error("操作失败:", error);
  return NextResponse.json({ error: "操作失败" }, { status: 500 });
}
```

### 计费集成
LLM 相关 API 需集成计费：
```typescript
import { estimateCost, deductBalance, recordUsageLog } from "@/lib/billing";

// 调用 LLM 后
const cost = estimateCost(provider, model, promptTokens, completionTokens);
const result = await deductBalance(userId, cost);
// 异步记录日志（不阻塞响应）
recordUsageLog({ userId, provider, model, ... }).catch(console.error);
```

---

## 前端开发规范

### 页面组件
- 所有页面使用 `"use client"` 指令
- 覆盖三种状态：Loading / Error / Empty
- 使用 TailwindCSS 样式

```tsx
"use client";
import { useState, useEffect } from "react";

export default function MyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/my-data")
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <div>{/* render data */}</div>;
}
```

### 图标
使用 `react-icons/hi2`（Heroicons v2），统一导入模式。

### 通知
使用 `react-hot-toast` 进行用户反馈。

---

## 安全护栏

### 多层次防御

| 层级 | 位置 | 功能 |
|------|------|------|
| 输入层 | `safety.ts` checkInputSafety() | 敏感词拦截、Jailbreak 检测、输入长度限制 |
| 模型层 | `llm-adapter.ts` buildSocraticSystemPrompt() | System Prompt 约束、temperature=0.3 |
| 输出层 | `safety.ts` checkOutputSafety() | 输出不当内容过滤 |
| 应用层 | API 路由 | 教育话题锁定、情绪监测 |
| 中间件 | `middleware.ts` | IP/Key 限流、余额检查 |

---

## 贡献指南

1. Fork 项目仓库
2. 创建功能分支: `git checkout -b feature/my-feature`
3. 提交更改: `git commit -m "feat: add my feature"`
4. 推送分支: `git push origin feature/my-feature`
5. 创建 Pull Request

### 代码规范
- TypeScript 严格模式
- ESLint 检查通过
- 新功能需覆盖三种 UI 状态
- API 路由需鉴权检查
