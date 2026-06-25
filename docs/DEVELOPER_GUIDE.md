# Polaris 开发指南

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
│  PC Web (Next.js) │ Electron Desktop             │
│  Android (Capacitor)                              │
├──────────────────────────────────────────────────┤
│              中间件层 (src/middleware.ts)          │
│  鉴权 │ 内存限流 │ IP 检测 │ 安全过滤            │
├──────────────────────────────────────────────────┤
│              业务服务层 (src/app/api/)             │
│  AI对话 │ 题库 │ 游戏 │ 学习分析 │ 知识图谱       │
├──────────────────────────────────────────────────┤
│               核心库 (src/lib/)                   │
│  auth │ llm-adapter │ safety │ rate-limit        │
│  game │ ai-tutor                                   │
├──────────────────────────────────────────────────┤
│                数据层                              │
│  Prisma ORM → SQLite / PostgreSQL                 │
└──────────────────────────────────────────────────┘
```

> 大模型 API Key 由用户在「设置」页面填入并保存在浏览器 `localStorage`，前端发起 LLM 调用时携带用户自己的 Key，服务端不存储、不经手任何用户密钥。限流为纯内存实现，无 Redis 等外部依赖。

---

## 本地开发环境搭建

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local

# 3. 编辑 .env.local，配置 DATABASE_URL 与 AUTH_SECRET
#    LLM API Key 无需在服务端配置，登录后在「设置」页填入你自己的 Key

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
│   │   ├── settings/    # 设置（含 LLM API Key 配置）
│   │   └── ...
│   ├── api/             # API 路由处理器
│   │   ├── ai/          # AI 辅导
│   │   ├── game/        # 游戏系统
│   │   ├── questions/   # 题库
│   │   └── ...
│   └── docs/            # 开发者文档门户
├── components/
│   ├── layout/          # 布局组件（Sidebar, Header）
│   ├── providers/       # Context Provider
│   └── common/          # 通用组件
├── lib/
│   ├── auth.ts          # NextAuth 配置
│   ├── llm-adapter.ts   # LLM 多模型适配
│   ├── safety.ts        # 安全护栏
│   ├── rate-limit.ts    # 内存限流
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
- **User** - 用户（含 XP、等级，所有用户平等，无角色区分）
- **Question** - 题目
- **KnowledgePoint** - 知识点
- **LearningRecord** - 学习记录
- **ErrorNote** - 错题
- **AIConversation / AIDialogueMessage** - AI 对话

> 注：用户的大模型 API Key 保存在浏览器 `localStorage`，不存入数据库；平台不存储任何充值、余额、用量计费相关数据。

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

> 注：LLM 相关 API 不再做服务端计费。大模型调用使用用户在「设置」页面配置的 Key，费用由用户与其 LLM 供应商直接结算。

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
| 中间件 | `middleware.ts` | 内存限流、IP 检测、安全过滤 |

---

## 贡献指南

欢迎社区贡献！完整的开发环境设置、代码规范与提交流程见根目录的 [CONTRIBUTING.md](../CONTRIBUTING.md)。

简要流程：

1. Fork 项目仓库
2. 创建功能分支: `git checkout -b feature/my-feature`
3. 提交更改（Conventional Commits）: `git commit -m "feat: add my feature"`
4. 推送分支: `git push origin feature/my-feature`
5. 创建 Pull Request

### 代码规范
- TypeScript 严格模式
- ESLint 检查通过
- 新功能需覆盖三种 UI 状态
- API 路由需鉴权检查
- 不引入计费、管理后台、API 网关等已移除的能力
