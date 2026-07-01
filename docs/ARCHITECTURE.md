# Polaris 架构说明（V2.0）

> 本文档描述 Polaris V2.0 的纯前端架构：平台抽象层（Electron + Web + Capacitor）、app.asar 隔离机制、模块清单、IndexedDB 本地数据架构（schema V4）与 SM-2 间隔重复算法。V2 删除全部商业平台特征，回归个人化自学伙伴定位。

## 1. 整体架构

### 1.1 设计哲学

Polaris V2.0 仍是**纯前端单页应用（SPA）**，沿用 v1.0 的三端共用 `dist/` 产物策略，并在 Electron 侧新增 asar 解压调试能力：

- **无服务器**：无需运行任何 Node.js 后端进程。
- **无数据库**：所有学习数据由设备本地 IndexedDB 持久化。
- **无中间层**：LLM 调用由客户端 `fetch` 直连供应商 API（DeepSeek / Qwen / OpenAI / Ollama 等）。
- **离线首屏**：应用启动不依赖任何外部网络请求，字体与关键资源全部本地随包分发。
- **平台隔离**：所有原生能力通过 `src/lib/platform/` 统一抽象，UI 层禁止直接调用平台特定 API。
- **环境隔离**：`POLARIS_DEV_MODE` 三态 + `userData` 分桶，开发/测试/生产数据互不污染。

### 1.2 整体数据流

```
用户设备
   │
   ├─ Windows → Electron 主进程 → BrowserWindow 加载 dist/index.html
   │             （三态加载：vite / unpacked / packaged）
   └─ Android  → Capacitor WebView → 本地加载 dist/index.html
   │
   ▼
React 19 SPA（Vite 构建）
   │
   ├─ Pages (src/pages/) ──► Components ──► Hooks ──► Stores (Zustand)
   │
   ▼
React Router 7（HashRouter）
   │  routes/index.tsx + ProtectedRoute + PublicOnlyRoute（已删除 /leaderboard）
   ▼
平台抽象层 src/lib/platform/
   │  platform.secureStorage / tts / clipboard / safeArea / update / haptic
   ▼
Services 层（业务逻辑）
   ├─ ai-service.ts        （直连 LLM，SSE 流式，苏格拉底引导，无 stage 标签）
   ├─ auth-service.ts      （PBKDF2 本地认证）
   ├─ voice-service.ts     （仅 TTS 朗读，无 STT 输入）
   └─ secure-storage.ts    （统一委托 platform.secureStorage）
   │
   ▼
Repository 层（数据访问，已删除 currency/leaderboard/quest/gamification）
   │
   ▼
IndexedDB 封装（src/lib/db/indexeddb.ts）
   │
   ├─► IndexedDB（浏览器原生，DB_VERSION=4）
   └─► localStorage（引导标记、会话 token 等轻量状态）
                                    │
                                    ▼ fetch（HTTPS / SSE）
                          LLM 供应商 API（外部）
```

### 1.3 关键设计原则

1. **HashRouter**：兼容 Capacitor 本地文件加载与 Electron `file://` 协议，无需服务端 SPA fallback。
2. **平台抽象层**：原生能力统一收口，未来新增平台只需实现 `PlatformCapabilities` 接口。
3. **Repository 模式**：数据访问层抽象，未来如需切换到云端可平滑替换。
4. **安静单色视觉**：主色 `#6366F1` 单色系统，无奖励色，动效仅 ease-out + 150ms/300ms 两档。

## 2. 平台抽象层

`src/lib/platform/` 统一封装三端能力，UI 层只通过 `getPlatform()` 与 `platform` 对象访问：

| 能力 | Electron | Capacitor（Android） | Web 预览 |
|------|----------|---------------------|----------|
| `secureStorage` | `safeStorage`（OS keychain） | Keystore + AES-GCM | `idb-keyval` + 内存混淆 |
| `tts` | Web Speech API | Capacitor TextToSpeech | Web Speech API |
| `clipboard` | IPC + `clipboard` | Capacitor Clipboard | `navigator.clipboard` |
| `safeArea` | 不适用 | `@capacitor/status-bar` + safe-area-inset | 不适用 |
| `update` | `electron-updater` | APK 自更新提示 | 不适用 |
| `haptic` | 不适用 | Capacitor Haptics | 不适用 |

> UI 层禁止直接调用 `window.electronAPI` 或 `window.Capacitor`，违者视为架构违规。

## 3. app.asar 隔离机制（V2 新增）

### 3.1 三态开发模式

`electron/main.mjs` 通过 `POLARIS_DEV_MODE` 环境变量区分三种运行态，并按模式分桶 `userData` 路径：

| 模式 | 环境变量 | 加载源 | userData 后缀 | DevTools | 用途 |
|------|---------|--------|--------------|----------|------|
| vite | `POLARIS_DEV_MODE=vite` | `http://localhost:5173` | `-dev` | 自动打开（detach） | 日常开发，热更新 |
| unpacked | `POLARIS_DEV_MODE=unpacked` | `app/dist/index.html` | `-staging` | 不自动打开 | 调试生产产物 |
| packaged | `POLARIS_DEV_MODE=packaged`（默认） | `app.asar/dist/index.html` | 默认 | 不自动打开 | 正式发布态 |

启动日志统一打印 `[Polaris] Mode: <MODE> | UserData: <path>`，便于排查。`secureStorageFile` 在 `app.whenReady()` 回调中按分桶后的 `userData` 重新计算，确保三种模式的本地存储互不污染。

### 3.2 asar 解压与重打包

| 脚本 | 作用 |
|------|------|
| `scripts/unpack-asar.mjs` | 将 `electron-dist/win-unpacked/resources/app.asar` 解压到同名 `app/` 目录，原 `.asar` 重命名为 `.asar.bak` 备份；优先用 `@electron/asar extract`，失败回退逐文件容忍解压（跳过缺失 unpacked 文件）；Windows 文件锁重试 6 次 |
| `scripts/repack-asar.mjs` | 删除 `app/` 目录，将 `.asar.bak` 恢复为 `app.asar`；同时恢复 `app.asar.unpacked` 伴随目录；若 `app/` 不存在则提示无需 repack |

### 3.3 加载优先级

Electron 启动时若 `resources/` 同时存在 `app/` 与 `app.asar`，**优先加载 `app/` 目录**。这意味着解压调试后忘记 `repack` 会发布解压态——这是 V2 已知陷阱之一，发布前必须执行 `npm run electron:repack` 并验证 `app.asar` 存在、`app/` 目录已删除。

> 调试协议：可通过 `polaris://__health` 查看当前模式与加载源。

## 4. 模块清单

### 4.1 新增模块（V2）

| 路径 | 说明 |
|------|------|
| `src/lib/spaced-repetition.ts` | SM-2 间隔重复算法（`ease` / `interval` / `repetition` 字段调度） |
| `scripts/unpack-asar.mjs` | 解压 `app.asar` 为 `app/` 用于解压调试 |
| `scripts/repack-asar.mjs` | 重新打包为 `app.asar`，发布前必跑 |
| `.env.unpacked` | `POLARIS_DEV_MODE=unpacked` 环境变量注入 |

### 4.2 删除模块（V2）

**Repository 层**（4 个删除）：
- `src/lib/repositories/currency.repository.ts`（双货币）
- `src/lib/repositories/leaderboard.repository.ts`（排行榜）
- `src/lib/repositories/quest.repository.ts`（每日任务）
- `src/lib/game.ts`（连胜 / 冻结卡 / 双货币经济逻辑）

**组件层**（8 个删除）：
- `src/components/common/DailyQuest.tsx`（每日任务卡）
- `src/components/common/FocusShield.tsx`（专注心流护盾）
- `src/components/common/RewardCelebration.tsx`（奖励庆祝动画）
- `src/components/common/XPToast.tsx`（XP 提示）
- `src/components/common/ErrorEliminationBattle.tsx`（错题消灭战 60 秒挑战）
- `src/components/common/FloatingCompanion.tsx`（浮窗伙伴）
- `src/components/common/ModelConfigWizard.tsx`（模型配置 L1 向导）
- `src/components/common/ModelConfigAdvanced.tsx`（模型配置 L2 高级）

**页面层**：`src/pages/LeaderboardPage.tsx` 与路由 `/leaderboard` 一并删除。

### 4.3 重写模块

`HomePage`（安静桌面）、`AiTeacherPage`（去阶段化对话）、`KnowledgeGraphPage`（SVG 静态图）、`ErrorNotesPage`（Anki SM-2）、`AnalyticsPage`（个人视角）、`SettingsPage`（简化模型配置）、`PracticePage`（去闯关化）、`learning-modes.ts`（5→3 学段）、`motion.ts`（两档时长）、`index.css`（单色 token）、`App.tsx` + `routes/index.tsx`（路由删除 `/leaderboard`）。

## 5. 数据层

### 5.1 IndexedDB schema V4

`DB_VERSION=4`，相对 v1.0（DB_VERSION=3）删除 5 个商业 store：

| 删除的 store | 原用途 |
|-------------|--------|
| `currency` | 星光 / 晶核双货币余额 |
| `quests` | 每日任务进度 |
| `leaderboard` | 5-15 人小队列排名 |
| `streaks` | 连胜与冻结卡 |
| `battles` | 错题消灭战记录 |

保留 store：`users`、`conversations`、`error_notes`（新增 SM-2 字段 `ease` / `interval` / `repetition` / `nextReviewAt` / `lastReviewAt`）、`knowledge`、`practice`、`courses`、`home_stats`、`reviews` 等。

### 5.2 数据访问纪律

- 所有数据访问必须通过 `src/lib/repositories/` 层，禁止直接操作 IndexedDB。
- `localStorage` 仅保存会话 token、引导标记等轻量状态。
- 学段从 5 档（KINDERGARTEN/ELEMENTARY/MIDDLE/HIGH/PROFESSIONAL）简化为 3 档（YOUTH/TEEN/ADULT），`migrateLearningMode` 兼容旧 5 档映射到新 3 档，仅驱动 AI prompt 风格，无视觉差异。

## 6. SM-2 间隔重复算法

错题本采用 SM-2 简化版，数据存 `error_notes` store，单卡片字段：

- `ease`：易度因子，初始 2.5，下限 1.3
- `interval`：当前间隔（天）
- `repetition`：连续答对次数
- `nextReviewAt`：下次复习时间戳
- `lastReviewAt`：上次复习时间戳

复习评分映射（`src/lib/spaced-repetition.ts`）：

| 评分按钮 | 质量分 q | interval 更新 | ease 更新 |
|---------|---------|--------------|----------|
| 再来一次 | 0（不记得） | 重置为 0 → 1 天 | ease -= 0.2（下限 1.3） |
| 困难 | 2 | 1 天 | ease -= 0.15 |
| 良好 | 4 | `interval × ease`（首轮 3 天） | ease 不变 |
| 简单 | 5 | `interval × ease × 1.3`（首轮 7 天） | ease += 0.1 |

算法在 `error-notes.repository.ts` 调用，UI 在 `ErrorNotesPage` 暴露四个按钮。无时间压力、无粒子反馈、无战报结算。

## 7. 安全与启动兜底

- **安全存储**：Electron `safeStorage`、Android Keystore + AES、Web 内存混淆，统一委托 `platform.secureStorage`。
- **本地认证**：Web Crypto API（PBKDF2 本地哈希），`auth-service.ts` 实现。
- **启动兜底**：`SessionProvider` 5 秒超时降级为 Guest 模式，后台重试成功后静默合并；`ErrorBoundary` 全局捕获，提供"重启应用"与"清除缓存"恢复页。
- **CSP**：Electron 生产模式注入 Content-Security-Policy 头，禁止内联脚本与外部网络请求。

## 8. 已知陷阱（架构相关）

- `app/` 目录优先级高于 `app.asar`：解压调试后忘记 `repack` 会发布解压态。
- IndexedDB 跨版本升级：V3→V4 删除 5 个 store，`onupgradeneeded` 必须显式处理删除逻辑，避免残留。
- 学段 ID 迁移：旧 5 档 ID 必须经 `migrateLearningMode` 映射到新 3 档，否则 AI prompt 风格异常。
- `@antv/g6` 已移除：知识地图迁移到 SVG，残留 import 会导致构建失败。

> 完整陷阱清单与 Sub-Agent 协作规范见 [AGENTS.md](../AGENTS.md)。
