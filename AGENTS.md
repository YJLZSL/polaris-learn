# AGENTS.md - Polaris AI 编程规范

> 本文档规范所有 AI 编程代理在 Polaris 项目中的行为。开始工作前必读。

## 项目概述

Polaris 北极星学习平台是一个纯前端 SPA 自学伙伴（v2.0.0），抛弃商业平台范式，回归"安静、可信、可随身携带的自学伙伴"本质。面向 YOUTH/TEEN/ADULT 三档学段用户提供 AI 驱动的个性化学习体验。

**核心功能**（精简后）：
- AI 对话辅导（苏格拉底式引导 + 流式响应 + 语音朗读）
- 知识地图（静态 SVG 树/网图 + 3 态视觉）
- 错题本（Anki 式 SM-2 间隔重复复习卡片）
- 按知识点选题练习
- 学习伙伴（Polaris 小灵单一形态 + 3 态情绪）
- 学习数据（个人视角：时长趋势 + 知识点掌握 + 复习完成率）
- 极简专注计时器（25/5 倒计时，无游戏化附加）

**架构特点**：
- 纯前端 SPA，无服务端运行时
- 所有数据本地存储在 IndexedDB
- LLM 调用由客户端直连 OpenAI 兼容 API（SSE 流式）
- 认证基于 Web Crypto API（PBKDF2 本地哈希）
- 三端共用同一份 `dist/` 产物（Web / Android / Electron）
- Electron 支持 `app.asar` 解压调试模式（`POLARIS_DEV_MODE=unpacked`）

## 技术栈

- 构建工具：Vite 7
- 框架：React 19
- 语言：TypeScript 5（严格模式，**`npx tsc --noEmit` 必须零错误**）
- 路由：React Router 7（HashRouter）
- 样式：Tailwind CSS 4
- UI 组件库：shadcn/ui + Radix UI
- 动画：Framer Motion 12（仅 `ease-out` 缓动，150ms/300ms 两档时长，`useSafeMotion` 包裹无障碍降级）
- 状态管理：Zustand + React Context
- 本地存储：IndexedDB（via idb）
- 认证：Web Crypto API（PBKDF2 本地哈希）
- LLM 集成：客户端直连 OpenAI 兼容 API（SSE 流式）
- 语音：Web Speech API + Capacitor TextToSpeech（仅 TTS 朗读，无 STT 输入）
- 桌面端：Electron 42 + electron-builder（支持 asar 解压调试）
- 移动端：Capacitor 8（仅 Android）
- 版本号：v2.0.0

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
│   │   ├── common/           # 通用业务组件（ProgressRing 等）
│   │   ├── layout/           # 布局组件（Header、Sidebar、MobileNav）
│   │   ├── providers/        # Provider 组件（Session、Electron、SW、AndroidUpdate）
│   │   └── ui/               # shadcn/ui 基础组件
│   ├── hooks/                # 自定义 Hooks（useTTS、useSafeMotion 等）
│   ├── lib/
│   │   ├── db/               # IndexedDB schema / indexeddb / seed
│   │   ├── repositories/     # 数据访问层（error-notes、practice、user、review 等 repository）
│   │   ├── services/         # 业务服务（ai-service、auth-service、voice-service、secure-storage）
│   │   ├── constants.ts      # 学科常量
│   │   ├── learning-modes.ts # 3 学段配置（YOUTH / TEEN / ADULT）
│   │   ├── motion.ts         # 动画配置（V2 精简版）
│   │   ├── safety.ts         # 安全护栏
│   │   ├── utils.ts          # 工具函数
│   │   └── version.ts        # 静态版本信息
│   ├── pages/                # 页面组件
│   ├── routes/               # 路由（index、ProtectedRoute、PublicOnlyRoute）
│   ├── stores/               # Zustand stores（useUserStore 等）
│   ├── types/                # TypeScript 类型定义
│   ├── App.tsx               # 根组件（Router + Providers）
│   ├── main.tsx              # 应用入口
│   └── index.css             # 全局样式 + design tokens
├── capacitor.config.ts       # Capacitor 配置
├── vite.config.ts            # Vite 配置
├── index.html                # Vite HTML 入口
├── package.json              # 版本 2.0.0
└── tsconfig.json
```

## 平台约束

- **仅支持 PC（Electron）和 Android（Capacitor）**，不支持 iOS
- 环境隔离：生产/开发分离，敏感文件（密钥、证书、.env.local）不入库
- 仓库使用原子提交，避免上传整个工作区
- 隐私内容不上传到仓库
- `.gitignore` 已排除：`android/`、`electron-dist/`、`electron-dist-v1/`、`out/`、`dist/`、`.env`、`*.keystore`、`.trae/`

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
| `npm run electron:unpack` | 解压 `app.asar` 为 `app/` 目录用于调试 |
| `npm run electron:repack` | 将 `app/` 目录重新打包为 `app.asar`（发布前必跑） |
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

- 文件名：`kebab-case.ts`（如 `error-notes.repository.ts`），React 组件用 `PascalCase.tsx`（如 `ProgressRing.tsx`）
- repository 实例：`camelCase + Repository`（如 `practiceRepository`、`errorNotesRepository`）
- hooks：`useXxx`（如 `useTTS`、`useSafeMotion`）
- store：`useXxxStore`（如 `useUserStore`）
- CSS variables：`--kebab-case`（如 `--radius-scale`）
- 学段 ID：全大写枚举（`YOUTH` / `TEEN` / `ADULT`），旧 5 档值（`KINDERGARTEN` / `ELEMENTARY` / `MIDDLE` / `HIGH` / `PROFESSIONAL`）通过 `migrateLearningMode()` 自动迁移

### Repository 模式

所有数据访问通过 repository 层，基于 `src/lib/db/indexeddb.ts` 的 5 个通用工具函数（`getAll` / `getByKey` / `put` / `deleteByKey` / `queryByIndex`）构建。新增数据 store 时：

1. 在 `src/lib/db/schema.ts` 的 `STORES` 与 `STORE_SCHEMAS` 注册
2. 升级 `DB_VERSION`，在 `indexeddb.ts` 的 `upgrade` 回调中兜底创建（按 `objectStoreNames` 判断，平滑迁移）
3. 新建 `src/lib/repositories/xxx.repository.ts`，导出单例实例

### 动画系统用法（V2 精简版）

- 缓动曲线统一用 `ease-out`
- 时长仅两档：`150ms`（即时）/ `300ms`（标准）
- 页面转场：仅"淡入 + 上移 8px"
- **删除项**：`staggerContainerCapped`、`ease-out-expo`、PC 侧滑 / Android 底滑、`count-up`、粒子、`scaleIn` 等 V1 游戏化动效已全部移除，禁止重新引入
- **所有 motion props 必须用 `useSafeMotion()` 包裹**，`prefers-reduced-motion: reduce` 时返回空对象

## 主上下文保护红线（NEW - 核心章节）

**目的**：避免主上下文过载导致 IDE 卡死。

1. **禁止在主上下文用 `Read` 读取单文件 > 500 行**：必须用 `offset/limit` 分段读取，或委托 Sub-Agent
2. **禁止在主上下文用 `Edit` 替换 > 200 行的 `old_string`**：拆分为多次小 Edit，或委托 Sub-Agent
3. **禁止在主上下文执行 `npm run build`、`electron:build`、`cap sync`、`vite build`、`npx tsc --noEmit` 等长命令**：必须用 `RunCommand` 的 `blocking: false` + `CheckCommandStatus` 轮询
4. **主上下文单次响应的 tool calls 数 ≤ 5**（除并行 Read 外）
5. **禁止在主上下文做大文件全量重写**：> 200 行的文件重写必须委托 Sub-Agent

## Sub-Agent 委托强制场景（NEW）

以下场景**必须**委托 Sub-Agent，不得在主上下文直接处理：

1. **单文件重写 > 200 行** → `general_purpose_task` Sub-Agent
2. **跨 3+ 文件的重构** → `general_purpose_task` Sub-Agent
3. **运行测试 / 构建 / 验证** → `general_purpose_task` Sub-Agent
4. **多文件搜索 + 阅读汇总** → `search` Sub-Agent
5. **删除多个文件** → `general_purpose_task` Sub-Agent
6. **修改 IndexedDB schema 或数据迁移** → `general_purpose_task` Sub-Agent

## 并行执行规则（NEW）

1. **无依赖的任务必须并行 Sub-Agent**：在**同一条消息内**发起多个 Task 工具调用
2. **主上下文禁止串行等待**：除非有显式依赖，否则禁止"等一个 Sub-Agent 完成再起下一个"
3. **并行 Sub-Agent 数量上限 5**：避免资源争用
4. **依赖关系显式声明**：在 TodoWrite 中标注依赖，避免错误并行

## 临时文件与脚本纪律（NEW）

1. **所有辅助脚本必须放 `ai-edu-platform/.trae/tmp/`**（已 gitignored）
2. **禁止在 `d:\AIKFCC\Polaris\` 或 `ai-edu-platform\` 根目录创建任何临时文件**（`.js`、`.mjs`、`.json`、`.log`、`.txt` 等）
3. **临时脚本用完即删**：任务结束前用 `DeleteFile` 清理
4. **文档文件用 Write 工具直接写**（文档不是大文件，安全）

## 长命令非阻塞执行（NEW）

1. `npm run build`、`electron:build`、`vite build`、`cap sync android`、`npx tsc --noEmit`、`npm run lint` 等必须 `blocking: false`
2. 用 `CheckCommandStatus` 轮询，**间隔 ≥ 3 秒**，避免空转
3. 长命令 ID 必须在主上下文留痕，便于 `StopCommand` 终止
4. 长命令失败时，先读错误输出再决定是否重试，**禁止盲目重试**

## Spec 驱动开发纪律（NEW）

1. **任何 > 3 步的任务必须先写 spec**（spec.md + tasks.md + checklist.md），放在 `.trae/specs/<change-id>/`
2. **实现阶段每个 task 完成后必须勾选 `tasks.md` 对应项**
3. **验证阶段必须委托 Sub-Agent 对照 `checklist.md` 逐项核验**
4. **spec 文档永不删除**：即使被新 spec 取代，保留作为历史参考

## 回滚红线（NEW）

1. **禁止 `git reset --hard`、`git checkout .`、`git clean -f`、`git branch -D` 等破坏性操作**（除非用户显式要求）
2. **禁止 `git push --force`**（除非用户显式要求且非 main/master 分支）
3. **禁止删除 `.trae/specs/` 下任何已存在的 spec 文档**
4. **工作区可能含用户未提交的变更**，开始工作前必须 `git status` 确认
5. **不主动 commit**：除非用户显式要求

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
13. **不引入商业平台特征**：不添加双货币、排行榜、每日任务、连胜、消灭战、专注护盾 XP 加成等游戏化外挂
14. **不使用 `@antv/g6`**：已在 V2 迁移到自绘 SVG，禁止重新引入力导向图库
15. **不在主上下文执行长命令或大文件操作**：见"主上下文保护红线"章节

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

- **禁止在 `d:\AIKFCC\Polaris\` 或 `ai-edu-platform\` 根目录创建任何临时文件**（会导致 IDE 卡死）
- 辅助脚本一律放 `d:\AIKFCC\Polaris\ai-edu-platform\.trae\tmp\`（已 gitignored）
- 临时脚本用完即删，不留残留
- 文档文件用 Write 工具直接写（文档不是大文件，安全）

### 4. 学段 ID 迁移

V2 学段精简为 3 档映射规则：
- 旧 `KINDERGARTEN` / `ELEMENTARY` → `YOUTH`
- 旧 `MIDDLE` / `HIGH` → `TEEN`
- 旧 `PROFESSIONAL` → `ADULT`

读取用户 `learningMode` 时**必须**通过 `migrateLearningMode()` 转换，`migrateLearningMode()` 兼容旧 5 档，不要直接与字符串字面量比较旧值。

### 5. IndexedDB 升级

新增 store 必须升级 `DB_VERSION` 并在 `upgrade` 回调中按 `objectStoreNames` 兜底创建。直接在已有 store 上加字段无需升级版本（IndexedDB 是 schema-less 的，旧记录读取时字段为 `undefined`，代码需兜底）。

### 6. `@antv/g6` 性能陷阱

`@antv/g6` 力导向图在 Android 中端机渲染 > 100 节点时帧率 < 30fps。已在 V2 迁移到自绘 SVG，**禁止重新引入**力导向图库。

### 7. Electron `app/` 目录优先级

解压调试后若忘记 `electron:repack`，Electron 会优先加载 `app/` 目录而非 `app.asar`，导致发布解压态。**发布前必须 `npm run electron:repack`**。

## AI 协作流程

1. **先读 AGENTS.md**：开始任何工作前，先阅读本文档
2. **使用 TodoWrite 规划**：将复杂任务拆解为可验证的子任务
3. **优先并行 Sub-Agent**：独立任务分配给不同 Sub-Agent 并行执行（同一条消息内多个 Task 调用）
4. **保护主上下文**：避免在主上下文处理大量文件读写，委托给 Sub-Agent
5. **验证 checklist**：完成实现后，对照 `.trae/specs/<change-id>/checklist.md` 逐项验证（委托 Sub-Agent）
6. **原子提交**：每个逻辑变更一个提交，遵循 Conventional Commits
7. **保留 spec 文档**：不要删除 `.trae/specs/` 下的规范文档

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

示例：`feat: 添加错题本 SM-2 复习卡片`、`fix: 修复流式响应中断后内容丢失`

版本号遵循语义化版本：`MAJOR.MINOR.PATCH`（当前 v2.0.0）

## 技能使用指南

AI 代理在以下场景应使用对应技能：
- **frontend-design**：创建新 UI 组件、页面、视觉设计时
- **brainstorming**：需求不明确、需要探索设计方案时
- **test-driven-development**：实现新功能或修复 Bug 前
- **git-commit**：需要提交代码时
- **shadcn**：添加或修改 shadcn/ui 组件时

## 架构决策记录

- **v2.0.0**：自学本质回归——删除双货币/排行榜/每日任务/连胜/消灭战/专注护盾/学段自适应 token 等商业平台特征；AI 老师去阶段化；知识地图迁移到 SVG；错题本 Anki 化；视觉语言重置为安静单色；app.asar 解压调试模式；Agent 工作规范重铸
- **v1.0.0**：双端打包发布（Windows NSIS + Android APK CI），平台抽象层、离线首屏、安全存储
- **v5.0.0**：体验重构（已被 V2 部分取代，商业平台特征被反向删除）
- **v4.0.0**：从 Next.js 静态导出迁移到 Vite + React Router
- **v3.0.0**：删除服务端代码，迁移到 IndexedDB + 本地认证
- **v2.x**：基于 Next.js + Prisma + NextAuth 的全栈架构（已废弃）
