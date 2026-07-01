# Changelog

本项目所有重要变更记录均会写入此文件。版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [2.0.0] - 2026-07

Polaris V2.0.0 — **自学本质回归与工程规范重铸**。抛弃 v1.0 的商业平台范式（双货币、排行榜、每日任务、专注护盾、连胜、消灭战、学段自适应 token），回归"一个安静、可信、可随身携带的自学伙伴"本质。做功能减法、把可用的做扎实、把工程协作做规范。

### Breaking Changes

- **删除双货币经济系统**：移除星光 / 晶核双货币、`currency.repository.ts`、所有 UI 余额展示，单一"学习时长"作为隐式进度。
- **删除排行榜**：移除 `LeaderboardPage`、`leaderboard.repository.ts`、路由 `/leaderboard`、Sidebar/底部导航入口（"超越他人"不符合自学语境）。
- **删除每日任务压力机制**：移除 `DailyQuest` 组件、`quest.repository.ts`、首页每日任务卡片。
- **删除专注心流护盾**：移除 `FocusShield` 组件、`useFocusShieldStore.ts`、首页护盾入口；保留极简"专注计时器"（25/5 倒计时 + 静默，无 XP 加成 / 能量条 / 通知屏蔽）。
- **删除连胜容错与冻结卡**：移除 `game.ts` 中的连胜逻辑、冻结卡 UI、里程碑保护盾。
- **删除错题消灭战限时挑战**：移除 `ErrorEliminationBattle` 60 秒倒计时、粒子反馈、战报结算；错题本回归 Anki 式复习卡片。
- **删除学段自适应 token 系统**：移除 `data-mode` 切换的圆角 / 字号 / 插画密度变量，统一一套温和视觉语言。
- **首页从 Bento Grid 改为安静桌面**：问候语 + 今日学习时长 + 3 入口（继续学习 / 问 AI 老师 / 复习错题）+ 小灵形象 + 鼓励语，删除 6-8 块 Dashboard 卡片。
- **AI 老师删除 6 阶段环形进度**：移除苏格拉底 6 阶段（diagnostic/clarification/hypothesis/reasoning/verification/reflection）可视化与 `<stage>` 标签解析；降级为安静对话窗口，保留苏格拉底 system prompt 与 `weakPoints` 注入。
- **知识地图从 `@antv/g6` 迁移到 SVG**：从力导向图迁移到自绘 SVG 静态树/网图（≤80 节点、最多 2 层、3 态视觉），删除星云遮蔽 / 裂纹衰减 / 红光裂纹等游戏化视觉。
- **错题本从消灭战改为 Anki SM-2 复习**：复习卡片正反面 + SM-2 间隔重复，操作：再来一次 / 困难（1 天）/ 良好（3 天）/ 简单（7 天），无时间压力。
- **学段从 5 档简化为 3 档**：KINDERGARTEN/ELEMENTARY/MIDDLE/HIGH/PROFESSIONAL → YOUTH/TEEN/ADULT，仅驱动 AI prompt 风格，无视觉差异。
- **视觉语言 4.0**：删除"星光琥珀 #F59E0B"奖励色，统一为北极星靛蓝 `#6366F1` 单色系统。
- **动效精简**：删除"快速 200ms"与"强调 500ms"档位，仅保留 150ms / 300ms 两档；缓动仅 `ease-out`，删除 `ease-out-expo` 与 `ease-in-out`；页面转场仅"淡入 + 上移 8px"，删除 PC 侧滑 / Android 底滑。
- **模型配置 UX 简化**：删除 L1 向导 + L2 高级分层，改为设置页单一表单 + "最近使用过的 3 个配置"下拉。
- **学习伙伴去表演化**：删除 4 形态进化与多情绪规则，改为单一静态形态 + 3 态情绪（默认 / 专注 / 困意），仅在首页 / AI 老师页 / 空状态出现。
- **学习数据回归个人视角**：删除等级 / XP / 连胜 / 货币 / 排行榜 / 个人进步榜，仅保留本周学习时长趋势、本月知识点掌握增长、错题复习完成率。
- **IndexedDB schema 升级到 V4**：删除 5 个商业 store（`currency` / `quests` / `leaderboard` / `streaks` / `battles`）。

### Added

- **app.asar 解压调试模式**：`scripts/unpack-asar.mjs` 将 `app.asar` 解压为 `app/` 目录，Electron 优先加载解压目录，无需重新打包即可调试生产产物；`scripts/repack-asar.mjs` 删除 `app/` 并恢复 `.asar`。
- **`POLARIS_DEV_MODE` 三态**：`vite`（连 Vite Dev Server）/ `unpacked`（加载解压 app/dist）/ `packaged`（默认生产），按模式分桶 `userData` 路径（`-dev` / `-staging` / 默认）。
- **userData 路径分桶隔离**：开发 / 测试 / 生产三种模式的 IndexedDB、安全存储、配置文件互不污染，`secureStorageFile` 跟随分桶重新计算。
- **SM-2 间隔重复算法**：`src/lib/spaced-repetition.ts` 实现 SM-2 简化版（`ease` / `interval` / `repetition` 字段调度），错题本 `error_notes` store 新增 SM-2 字段。
- **`.env.unpacked`**：`POLARIS_DEV_MODE=unpacked` 环境变量注入文件。
- **`build-unpacked.yml` CI 工作流**：push 到 main 时构建 + 解压 asar 作为 staging 产物。
- **AGENTS.md 7 大新章节**：主上下文保护红线、Sub-Agent 委托强制场景、并行执行规则、临时文件与脚本纪律、长命令非阻塞执行、Spec 驱动开发纪律、回滚红线。
- **`polaris://__health` 调试协议**：查看当前 `POLARIS_DEV_MODE` 与加载源。

### Changed

- 版本号从 v1.0.0 升级到 v2.0.0（BREAKING 重构）。
- `electron/main.mjs` 改为三态加载 + userData 分桶 + 启动日志打印 `[Polaris] Mode: <MODE> | UserData: <path>`。
- 卡片间距从 16px 提到 24px，行高从 1.5 提到 1.7，正文最大宽度限制 72 字符。
- 知识地图节点状态从 4 态（已掌握 / 学习中 / 薄弱 / 未解锁）简化为 3 态（已掌握 / 学习中 / 薄弱）。
- `learning-modes.ts` 重写，`migrateLearningMode` 兼容旧 5 档映射到新 3 档。
- `motion.ts` 精简为 `DURATION_INSTANT` / `DURATION_STANDARD` / `EASE_OUT` / `pageTransition` / `fadeUpVariants` 预设。

### Removed

- `src/lib/repositories/currency.repository.ts`（双货币）
- `src/lib/repositories/leaderboard.repository.ts`（排行榜）
- `src/lib/repositories/quest.repository.ts`（每日任务）
- `src/lib/game.ts`（连胜 / 冻结卡 / 双货币经济逻辑）
- `src/pages/LeaderboardPage.tsx` 与路由 `/leaderboard`
- `src/components/common/DailyQuest.tsx`、`FocusShield.tsx`、`RewardCelebration.tsx`、`XPToast.tsx`、`ErrorEliminationBattle.tsx`、`FloatingCompanion.tsx`、`ModelConfigWizard.tsx`、`ModelConfigAdvanced.tsx`
- `src/stores/useFocusShieldStore.ts`
- `@antv/g6` 依赖（知识地图迁移到 SVG）
- IndexedDB store：`currency` / `quests` / `leaderboard` / `streaks` / `battles`
- 动效预设：count-up、粒子、scaleIn、cardHover、sharedAxisTransition、ease-out-expo、ease-in-out、200ms / 500ms 时长档位

---

## [1.0.0] - 2026-07-01（历史摘要）

Polaris V1.0.0 正式大版本起点。基于 v5.0.0 前端体验成果，针对 Android 白屏、PC 稳定性与原生桥接缺陷进行彻底架构重置，重建可靠的双端运行时（PC Windows + Android），并刷新视觉与交互语言。

### 关键变更摘要

- **版本号重置**：从 v5.0.0 重置为 v1.0.0，作为 Polaris 正式大版本起点。
- **平台抽象层**：新增 `src/lib/platform/`，统一封装 Electron / Capacitor / Web 三端能力（`secureStorage` / `tts` / `clipboard` / `safeArea` / `update` / `haptic`）。
- **安全存储落地**：Electron `safeStorage`、Android Keystore + AES、Web 内存混淆。
- **离线首屏**：移除所有外部 CDN，字体与关键资源全部本地随包分发；Capacitor 原生环境跳过 Service Worker 注册。
- **启动兜底**：`SessionProvider` 5 秒超时降级 Guest 模式；全局 Error Boundary 提供恢复页。
- **深空北极星设计 3.0**：`#0B0F19` 深空蓝底色、`#6366F1` 北极星靛蓝强调色、`#F59E0B` 星光琥珀奖励色（V2 已删除奖励色）。
- **知识星图**：迁移到 `@antv/g6` 力导向图（V2 已迁移到 SVG）。
- **AI 老师体验**：苏格拉底 6 阶段可视化（V2 已删除阶段可视化）。
- **游戏化系统**：双货币、每日任务、连胜、错题消灭战、专注护盾、排行榜（V2 已全部删除）。

> V1.0.0 的 GitHub Release 保留不删除，V2.0.0 作为新版本追加发布。

---

## 历史版本摘要

### [5.0.0] - 2026-06-30

在 v4.0.0 的 Vite + React Router 纯 SPA 架构基础上完成体验重构，覆盖设计系统、AI 老师全链、游戏化、页面重构与跨功能数据流。新增学段自适应设计系统 2.0、暗色北极星主题、`useSafeMotion`、ProgressRing、Polaris 吉祥物、苏格拉底 6 阶段语义化、流式响应、语音 TTS/STT、模型配置向导、自研力导向知识星图、错题消灭战、每日任务、学习伙伴养成、专注心流护盾、双货币 + 连胜容错、Bento Grid 首页等。版本号 4.0.0 → 5.0.0。（上述商业特征已在 V2 删除。）

### [4.0.0] - 2026-06-30

架构彻底重置：构建框架从 Next.js 16 迁移到 Vite 7 + React 19 纯 SPA，路由从 Next.js App Router 迁移到 React Router 7（HashRouter），Capacitor `webDir` 从 `out` 改为 `dist`，Electron 生产模式加载 `dist/`。移除所有 Next.js 框架依赖、服务端代码、Prisma 生成代码、API Routes 与 Docker 配置，彻底解决 Android `ERR_CLEARTEXT_NOT_PERMITTED` 与 Next.js 静态导出错误页问题。
