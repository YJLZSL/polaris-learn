# AGENTS.md - Polaris AI 编程规范

> 本文档规范所有 AI 编程代理在 Polaris 项目中的行为。开始工作前必读。

## 项目概述

Polaris 北极星学习平台是一个纯前端 SPA 教育平台（v5.0.0），面向全学段用户（幼儿园/小学/初中/高中/上班族），提供 AI 驱动的个性化学习体验。

**核心功能**：
- AI 对话辅导（苏格拉底式 6 阶段启发教学 + 流式响应 + 语音交互）
- 知识星图（力导向图可视化 + 裂纹衰减）
- 错题本与错题消灭战
- 分学段练习（闯关结构）
- 学习伙伴养成（Polaris 小灵 4 形态）
- 双货币游戏化（星光 / 晶核 + 连胜容错 + 每日任务 + 专注护盾）
- 学习数据分析
- 排行榜（5-15 人小队列 + 个人进步榜）

**架构特点**：
- 纯前端 SPA，无服务端运行时
- 所有数据本地存储在 IndexedDB（DB_VERSION=3，14 个 store）
- LLM 调用由客户端直连 OpenAI 兼容 API（SSE 流式）
- 认证基于 Web Crypto API（PBKDF2 本地哈希），不依赖外部认证服务
- 三端共用同一份 `dist/` 产物（Web / Android / Electron）

## 技术栈

- 构建工具：Vite 7
- 框架：React 19
- 语言：TypeScript 5（严格模式，**`npx tsc --noEmit` 必须零错误**）
- 路由：React Router 7（HashRouter，兼容 Capacitor WebView）
- 样式：Tailwind CSS 4
- UI 组件库：shadcn/ui + Radix UI
- 动画：Framer Motion 12（统一 EASE_OUT_EXPO，`useSafeMotion` 包裹无障碍降级）
- 状态管理：Zustand + React Context
- 本地存储：IndexedDB（via idb）
- 认证：Web Crypto API（PBKDF2 本地哈希）
- LLM 集成：客户端直连 OpenAI 兼容 API（SSE 流式）
- 语音：Web Speech API + Capacitor TextToSpeech
- 桌面端：Electron 42 + electron-builder
- 移动端：Capacitor 8（仅 Android）
- 版本号：语义化版本（当前 v5.0.0）

## 目录结构

```
ai-edu-platform/
├── android/                  # Capacitor Android 项目（gitignored）
├── electron/                 # Electron 主进程（main.js, preload.js）
├── public/                   # 静态资源（图标、manifest、favicon）
├── prompts/                  # 苏格拉底 prompt 设计参考（非运行时加载）
├── scripts/                  # 构建脚本（generate-icons.js 等）
├── src/
│   ├── components/
│   │   ├── common/           # 通用业务组件（DailyQuest、FocusShield、ProgressRing 等）
│   │   ├── layout/           # 布局组件（Header、Sidebar、MobileNav）
│   │   ├── providers/        # Provider 组件（Session、Electron、SW、AndroidUpdate）
│   │   └── ui/               # shadcn/ui 基础组件
│   ├── hooks/                # 自定义 Hooks（useTTS、useSTT、useCountUp、useSafeMotion 等）
│   ├── lib/
│   │   ├── db/               # IndexedDB schema / indexeddb / seed
│   │   ├── repositories/     # 数据访问层（12 个 repository）
│   │   ├── services/         # 业务服务（ai-service、auth-service、voice-service、secure-storage）
│   │   ├── constants.ts      # 学科常量
│   │   ├── game.ts           # 游戏化逻辑（双货币、连胜、徽章）
│   │   ├── learning-modes.ts # 5 学段配置
│   │   ├── motion.ts         # 动画配置
│   │   ├── safety.ts         # 安全护栏
│   │   ├── utils.ts          # 工具函数
│   │   └── version.ts        # 静态版本信息
│   ├── pages/                # 14 个页面组件
│   ├── routes/               # 路由（index、ProtectedRoute、PublicOnlyRoute）
│   ├── stores/               # Zustand stores（useUserStore、useFocusShieldStore）
│   ├── types/                # TypeScript 类型定义
│   ├── App.tsx               # 根组件（Router + Providers）
│   ├── main.tsx              # 应用入口
│   └── index.css             # 全局样式 + design tokens
├── capacitor.config.ts       # Capacitor 配置
├── vite.config.ts            # Vite 配置
├── index.html                # Vite HTML 入口
├── package.json              # 版本 5.0.0
└── tsconfig.json
```

## 平台约束

- **仅支持 PC（Electron）和 Android（Capacitor）**，不支持 iOS
- 环境隔离：生产/开发分离，敏感文件（密钥、证书、.env.local）不入库
- 仓库使用原子提交，避免上传整个工作区
- 隐私内容不上传到仓库
- `.gitignore` 已排除：`android/`、`electron-dist/`、`out/`、`dist/`、`.env`、`*.keystore`、`.trae/`

## 构建命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（http://localhost:5173） |
| `npm run build` | 生产构建，产出 `dist/` 目录 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | ESLint 检查 |
| `npx tsc --noEmit` | TypeScript 类型检查（必须零错误） |
| `npm run electron:dev` | Electron 开发模式 |
| `npm run electron:build` | 构建 Electron 安装包（Windows NSIS） |
| `npm run android:build` | 构建 Android APK（`vite build && cap sync android`） |
| `npm run android:open` | 在 Android Studio 中打开项目 |
| `npm run electron:icon` | 重新生成应用图标 |
| `npm run version:check` | 查看当前版本号 |

## 代码规范

- **TypeScript 严格模式**：`npx tsc --noEmit` 必须零错误，禁止使用 `any`（必要时用 `unknown` + 类型守卫）
- 使用路径别名 `@/` 指向 `src/`
- 组件使用函数式声明，优先使用箭头函数
- 状态管理优先使用 Zustand，避免 prop drilling
- **数据访问必须通过 `src/lib/repositories/` 层**，不直接操作 IndexedDB
- LLM 调用通过 `src/lib/services/ai-service.ts`
- 认证通过 `src/lib/services/auth-service.ts`
- **动画使用 Framer Motion，配置统一在 `src/lib/motion.ts`**，所有动画 props 用 `useSafeMotion` 包裹以支持 `prefers-reduced-motion` 降级
- UI 组件优先使用 shadcn/ui，自定义组件放在 `src/components/common/`

### 命名约定

- 文件名：`kebab-case.ts`（如 `error-notes.repository.ts`），React 组件用 `PascalCase.tsx`（如 `FocusShield.tsx`）
- repository 实例：`camelCase + Repository`（如 `practiceRepository`、`currencyRepository`）
- hooks：`useXxx`（如 `useTTS`、`useSafeMotion`）
- store：`useXxxStore`（如 `useUserStore`、`useFocusShieldStore`）
- CSS variables：`--kebab-case`（如 `--radius-scale`、`--game-strength`）
- 学段 ID：全大写枚举（`KINDERGARTEN` / `ELEMENTARY` / `MIDDLE` / `HIGH` / `PROFESSIONAL`），旧值通过 `migrateLearningMode` 自动迁移

### Repository 模式

所有数据访问通过 repository 层，基于 `src/lib/db/indexeddb.ts` 的 5 个通用工具函数（`getAll` / `getByKey` / `put` / `deleteByKey` / `queryByIndex`）构建。新增数据 store 时：

1. 在 `src/lib/db/schema.ts` 的 `STORES` 与 `STORE_SCHEMAS` 注册
2. 升级 `DB_VERSION`，在 `indexeddb.ts` 的 `upgrade` 回调中兜底创建（按 `objectStoreNames` 判断，平滑迁移）
3. 新建 `src/lib/repositories/xxx.repository.ts`，导出单例实例

### 动画系统用法

- 缓动曲线统一用 `EASE_OUT_EXPO`（`src/lib/motion.ts`）
- 列表 stagger 用 `staggerContainerCapped`（子项 > 6 时第 7 项起立即显示，避免长列表卡顿）
- 滚动入场用 `whileInView` + `viewport={{ once: true, margin: "-50px" }}`
- Tabs 切换用 `layoutId="active-tab"` 共享元素动画
- 数字计数用 `useCountUp(target)` hook
- **所有 motion props 必须用 `useSafeMotion()` 包裹**，`prefers-reduced-motion: reduce` 时返回空对象

## 提交规范

使用 Conventional Commits：
- `feat:` 新功能
- `fix:` Bug 修复
- `refactor:` 重构（不改变功能）
- `docs:` 文档更新
- `chore:` 构建/工具变更
- `test:` 测试相关
- `style:` 代码格式（不影响功能）
- `perf:` 性能优化

示例：`feat: 添加错题消灭战组件`、`fix: 修复流式响应中断后内容丢失`

版本号遵循语义化版本：`MAJOR.MINOR.PATCH`（当前 v5.0.0）

## 禁止事项

1. **不引入服务端运行时**：不使用 Next.js、不创建 API Routes、不使用 Server Components
2. **不使用 Next.js**：已迁移到 Vite + React Router，不再使用 Next.js 的任何特性
3. **不配置 `CAPACITOR_SERVER_URL`**：Android 应用必须从本地 `dist/` 加载，不连接远程服务器
4. **不上传密钥与 `android/` 目录**：`.gitignore` 已排除，不要移除这些忽略规则
5. **不引入 iOS 支持**：仅支持 PC + Android
6. **不使用 `http://localhost:3000`**：开发端口为 5173
7. **不创建 Docker 配置**：纯静态 SPA 无需容器化
8. **不上传构建产物**：`dist/`、`electron-dist/`、`out/` 已 gitignored
9. **不使用 Prisma/NextAuth**：已迁移到 IndexedDB + 本地认证
10. **不使用 `next/image`、`next/link`、`next/navigation`**：使用原生 `<img>` + React Router 的 `<Link>`/`useNavigate`
11. **不直接操作 IndexedDB**：必须通过 repository 层
12. **不绕过 `useSafeMotion` 写动画**：所有 motion props 必须包裹以支持无障碍降级

## 已知陷阱（必读）

### 1. lucide-react `Map` 图标遮蔽全局 `Map`

`lucide-react` 导出一个名为 `Map` 的图标组件，会遮蔽 JavaScript 全局 `Map` 构造函数。**在 import 了 lucide-react 的文件中直接使用 `new Map()` 会类型错误或运行时错误。**

- 错误示例：`import { Map } from 'lucide-react'; const m = new Map();` ← `Map` 已被图标组件遮蔽
- 解决方案：要么避免在该文件用全局 `Map`（改用 `Record` / `Object` / `Set`），要么把 lucide 图标重命名导入：`import { Map as MapIcon } from 'lucide-react'`

### 2. Edit 工具对大文件超时

IDE 的 Edit 工具对超大文件（数千行）做整文件替换时可能超时或失败。

- 大文件改动优先用**精确的小范围 `old_string` / `new_string` 替换**，不要整文件重写
- 如需整文件重写，用 Write 工具（文档/小文件安全），但代码大文件仍优先用多次小 Edit
- 真正无法编辑时，委托给 Sub-Agent 或用 Node 脚本辅助（脚本放 `.trae/tmp/`）

### 3. 临时文件隔离

- **禁止在项目根目录 `d:\AIKFCC\AI Classroom\` 创建任何临时文件**（会导致 IDE 卡死）
- 辅助脚本一律放 `d:\AIKFCC\AI Classroom\.trae\tmp\`（已 gitignored）
- 临时脚本用完即删，不留残留
- 文档文件用 Write 工具直接写（文档不是大文件，安全）

### 4. 学段 ID 迁移

v5.0 学段 ID 重命名（PRIMARY→ELEMENTARY、MIDDLE_HIGH→MIDDLE、COLLEGE→HIGH）。读取用户 `learningMode` 时**必须**通过 `migrateLearningMode()` 或 `getLearningModeConfig()` 转换，不要直接与字符串字面量比较旧值。`promptStyle` 字段保留旧值（`primary` / `middle_high` / `college`）以兼容 `ai-service.ts`，不要联动修改。

### 5. IndexedDB 升级

新增 store 必须升级 `DB_VERSION` 并在 `upgrade` 回调中按 `objectStoreNames` 兜底创建。直接在已有 store 上加字段无需升级版本（IndexedDB 是 schema-less 的，旧记录读取时字段为 `undefined`，代码需兜底）。

### 6. 苏格拉底 stage 标签

AI 回复末尾的 `<stage>...</stage>` 标签是系统追踪用，**不能显示给用户**。渲染前必须剥离。stage 标签缺失时保持当前阶段不变，不要报错。

## AI 协作流程

1. **先读 AGENTS.md**：开始任何工作前，先阅读本文档
2. **使用 TodoWrite 规划**：将复杂任务拆解为可验证的子任务
3. **优先并行 Sub-Agent**：独立任务分配给不同 Sub-Agent 并行执行
4. **保护上下文**：避免在主上下文中处理大量文件读写，委托给 Sub-Agent
5. **验证 checklist**：完成实现后，对照 `.trae/specs/<change-id>/checklist.md` 逐项验证
6. **原子提交**：每个逻辑变更一个提交，遵循 Conventional Commits
7. **保留 spec 文档**：不要删除 `.trae/specs/` 下的规范文档

## 技能使用指南

AI 代理在以下场景应使用对应技能：
- **frontend-design**：创建新 UI 组件、页面、视觉设计时
- **web-dev**：从零创建新网站/Web 应用时
- **brainstorming**：需求不明确、需要探索设计方案时
- **test-driven-development**：实现新功能或修复 Bug 前
- **git-commit**：需要提交代码时
- **shadcn**：添加或修改 shadcn/ui 组件时

## 架构决策记录

- **v5.0.0**：体验重构——学段自适应设计系统 2.0、AI 老师全链（6 阶段语义化 + 流式 + 语音）、知识星图力导向图、错题消灭战、学习伙伴、双货币游戏化、每日任务、专注护盾、Bento 首页、跨功能数据流
- **v4.0.0**：从 Next.js 静态导出迁移到 Vite + React Router，彻底解决 ERR_CLEARTEXT_NOT_PERMITTED 问题
- **v3.0.0**：删除服务端代码，迁移到 IndexedDB + 本地认证
- **v2.x**：基于 Next.js + Prisma + NextAuth 的全栈架构（已废弃）
