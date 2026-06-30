# Polaris 北极星学习平台

> 纯前端个人 AI 学习平台 | AGPL-3.0 | v5.0.0

一个面向全学段学习者的纯前端个人 AI 学习平台。**v5.0.0 在 v4.0.0 纯 SPA 架构基础上完成体验重构：全新学段自适应设计系统、苏格拉底式 AI 老师（6 阶段语义化 + 流式响应 + 语音交互）、知识星图（力导向图 + 裂纹衰减）、错题消灭战、学习伙伴养成、双货币游戏化、每日任务、专注心流护盾、Bento Grid 首页，全部数据本地持久化（IndexedDB），LLM 调用由客户端直连，无任何服务端。**

## What's New in v5.0.0

- **学段自适应设计系统 2.0**：5 学段重命名（幼儿园 / 小学 / 初中 / 高中 / 上班族），通过 `data-mode` 切换圆角、字号、游戏化强度；暗色模式默认开启，北极星主题渐变流光 + 星点纹理
- **AI 老师全链升级**：6 阶段苏格拉底语义化（diagnostic → clarification → hypothesis → reasoning → verification → reflection），SSE 流式逐字渲染，weakPoints 薄弱点注入，TTS 朗读 + STT 语音输入，模型配置向导 + 多配置切换 + 连接测试
- **知识星图**：自研轻量力导向图替代扁平节点图，亮星/星云遮蔽/红光脉冲三态编码，缩放拖拽，裂纹衰减机制（超期未复习自动回退）
- **错题消灭战**：60 秒心流倒计时，按薄弱度排序取题，连续答对点亮红→绿节点，结算页星光奖励 count-up
- **学习伙伴养成**：Polaris 小灵 4 形态（蛋/幼体/成体/觉醒），按累计学习时长进化，情绪规则触发，首页右下角常驻
- **双货币 + 连胜容错**：星光（日常）+ 晶核（里程碑），冻结卡断签保护，7/30/100 天里程碑保护盾，历史最高纪录保留
- **每日任务系统**：每日首次打开生成 3 个任务，全部完成触发宝箱动画 + 徽章碎片掉落
- **专注心流护盾**：25 分钟番茄钟 + 心流能量条，深色聚焦态，通知延后，结束集中结算（XP × 1.5 加成）
- **Bento Grid 首页**：6-8 块大小不一卡片网格布局，stagger 入场 + spring hover 升起
- **跨功能数据流打通**：练习/错题 → AI 老师、AI 老师 → 知识图谱掌握度、各模块 → 每日任务进度上报

完整变更记录见 [CHANGELOG.md](CHANGELOG.md)。

## 架构概览

| 维度 | v5.0.0 Vite SPA 架构 |
|------|------|
| **应用形态** | 纯前端 SPA（Vite 7 + React 19），无后端服务器 |
| **路由** | React Router 7（HashRouter），客户端路由 |
| **数据存储** | IndexedDB（浏览器原生，DB_VERSION=3，14 个 store），无数据库依赖 |
| **AI 服务** | 客户端直连 LLM API（DeepSeek/Qwen/OpenAI/Ollama），SSE 流式，API Key 加密存 localStorage |
| **认证** | Web Crypto API PBKDF2 本地认证 |
| **跨平台** | PC（Electron）+ Android（Capacitor）+ Web（PWA），三端共用同一份 `dist/` 产物 |
| **构建产物** | `dist/` 静态目录，纯静态文件 |

## 功能特性

| 模块 | 功能 |
|------|------|
| 学段自适应 | 5 学段（幼儿园/小学/初中/高中/上班族），圆角/字号/游戏化强度随 `data-mode` 全局切换 |
| AI 老师 | 苏格拉底式 6 阶段语义化辅导，SSE 流式逐字渲染，weakPoints 注入，语音朗读 + 语音输入，停止生成，思考过程折叠区，模型配置向导 |
| 知识星图 | 自研力导向图可视化，亮星/星云/红光三态，缩放拖拽，裂纹衰减机制，点击亮星复习/红星进入消灭战 |
| 错题消灭战 | 60 秒心流倒计时，按薄弱度排序，连续答对点亮节点，结算页星光奖励 |
| 错题本 | 自动收录错题，消灭战入口，"问 AI 老师"一键跳转携带上下文 |
| 练习题库 | 多学科题库，按学段过滤学科与难度（5 档），闯关结构（5-8 题/关 + 结算页），专注模式入口 |
| 学习伙伴 | Polaris 小灵 4 形态养成，按累计学习时长进化，情绪规则，首页常驻 |
| 双货币 | 星光（日常产出）+ 晶核（里程碑产出），冻结卡断签容错，保护盾里程碑奖励 |
| 每日任务 | 每日生成 3 个任务，完成 count-up 动画，全完成触发宝箱 + 徽章碎片 |
| 专注护盾 | 25 分钟番茄钟 + 心流能量条，深色聚焦态，通知延后，XP × 1.5 加成结算 |
| 学习报告 | 30 天学习趋势、学科分布、知识点掌握度分析（幼儿园模式简化） |
| 游戏化 | XP / 等级 / 徽章 / 连胜 / 排行榜（5-15 人小队列 + 个人进步榜，可隐藏） |
| 首页 | Bento Grid 布局，stagger 入场 + spring hover |
| 课程 | 课程内容浏览与学习（静态示例课程），"问 AI 老师"入口 |
| 跨端 | PC（Electron）+ Android（Capacitor）+ Web（PWA）三端统一 |

## 学段说明

平台内置 5 个学段，针对不同年龄段学习者的认知特点差异化适配。v5.0 学段 ID 重命名（旧值 PRIMARY/MIDDLE_HIGH/COLLEGE 自动迁移，历史用户无缝升级）：

| 学段 | ID | 适用人群 | UI 风格 | 游戏化强度 |
|------|-----|---------|---------|-----------|
| 幼儿园 | KINDERGARTEN | 学龄前儿童 | 大圆角、大字号、高插画密度 | 1.5（最强） |
| 小学 | ELEMENTARY | 小学生 | 标准布局、亲切引导 | 1.0 |
| 初中 | MIDDLE | 初中生 | 标准布局、学术严谨 | 0.8 |
| 高中 | HIGH | 高中生 | 标准布局、备考提升 | 0.7 |
| 上班族 | PROFESSIONAL | 职场人士 | 紧凑布局、碎片化微学习 | 0.5 |

学段可在注册流程选择，也可登录后通过首页 Banner 徽章或设置页随时切换，所有相关页面通过 `data-mode` 自动同步。

## 自带 LLM API Key

本平台**不提供**大模型服务，也**不代管** API Key。每位用户需在登录后前往 **设置** 页面填入自己的大模型 API Key（如 DeepSeek、通义千问、OpenAI、Ollama 等）。

API Key 加密保存在浏览器 `localStorage`，**不会上传到任何服务器**（应用本身纯前端，没有服务器）。客户端直接通过 `fetch` 调用对应 LLM 供应商 API。

- 推荐使用 DeepSeek，性价比高
- 本地部署可使用 Ollama，零成本（向导支持自动探测已装模型）
- 支持多配置切换：`llm_config_profiles` 数组 + `llm_config_active_id`
- 支持 Provider：DeepSeek / Qwen / OpenAI / Ollama / Custom（兼容 OpenAI 协议）
- API Key 加密：Electron 用 `safeStorage`，Capacitor 用 Preferences + AES，Web 用 `btoa` + 指纹混淆

## 技术栈

| 层级 | 技术 |
|------|------|
| 构建框架 | Vite 7 |
| 前端框架 | React 19 + TypeScript 5（严格模式，零类型错误） |
| 路由 | React Router 7（HashRouter） |
| 样式 | Tailwind CSS 4 + shadcn/ui（Radix UI） |
| 动画 | Framer Motion 12（统一 EASE_OUT_EXPO，`useSafeMotion` 包裹无障碍降级） |
| 状态管理 | Zustand + React Context（SessionProvider） |
| 本地存储 | IndexedDB（通过 `idb` 库封装，DB_VERSION=3） |
| AI 服务 | 客户端直连（DeepSeek / Qwen / OpenAI / Ollama，SSE 流式，用户自带 Key） |
| 语音 | Web Speech API（TTS/STT）+ Capacitor TextToSpeech（移动端 fallback） |
| 认证 | Web Crypto API（PBKDF2 哈希 + crypto.randomUUID 会话 token） |
| 字体 | Inter Variable + 思源黑体 / PingFang SC（中文优先） |
| 桌面端 | Electron 42 + electron-serve + electron-builder + electron-updater |
| 移动端 | Capacitor 8（Android APK） |
| PWA | manifest.json + Service Worker（Capacitor 原生环境跳过） |

## 快速开始

```bash
git clone https://github.com/YJLZSL/polaris-learn.git
cd polaris-learn
npm install
npm run dev
```

访问 http://localhost:5173 ，注册账号后前往 **设置** 页面配置你的 LLM API Key 即可开始使用。

> 无需配置 `.env` 文件、无需运行数据库迁移、无需启动任何后端服务。首次访问时应用会自动向 IndexedDB 注入种子数据（12 徽章 + 39 知识点 + 60 道示例题目）。

## 开发指南

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（http://localhost:5173） |
| `npm run build` | 生产构建，产出 `dist/` 目录 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | ESLint 代码规范检查 |
| `npx tsc --noEmit` | TypeScript 类型检查（必须零错误） |
| `npm run electron:dev` | Electron 开发模式（Vite + Electron 并行） |
| `npm run electron:build` | 构建 Electron 安装包（`vite build && electron-builder`） |
| `npm run android:build` | 构建 Web 资源并同步到 Android（`vite build && cap sync android`） |
| `npm run android:open` | 在 Android Studio 中打开项目 |
| `npm run version:check` | 查看当前版本号 |

### Android 构建

```bash
# 1. 构建 Web 静态资源并同步到 Android 项目
npm run android:build

# 2. 进入 Android 目录构建 APK
cd android
./gradlew assembleDebug      # Debug APK
./gradlew assembleRelease     # Release APK（需配置签名）

# 3. 产物路径
# android/app/build/outputs/apk/debug/app-debug.apk
```

详见 [docs/ANDROID_BUILD.md](docs/ANDROID_BUILD.md)。

### Electron 构建

```bash
npm run electron:build
# 产物：electron-dist/Polaris 北极星学习平台 Setup.exe（Windows）
```

Electron 通过 `electron-serve` 加载 `dist/` 静态文件，自动检测 DPI 缩放比例适配高 PPI 显示器。

### 静态产物部署

`npm run build` 产出的 `dist/` 是纯静态文件，可直接托管在 Vercel / Netlify / GitHub Pages / Nginx / 对象存储。因使用 HashRouter，无需配置 SPA fallback。

## 项目结构概览

```
ai-edu-platform/
├── electron/                 # Electron 主进程（main.js, preload.js）
├── public/                   # 静态资源（图标、manifest、favicon、sw.js）
├── prompts/                  # 苏格拉底 prompt 设计参考（socratic.yaml，非运行时加载）
├── scripts/                  # 构建脚本（generate-icons、build-apk）
├── src/
│   ├── components/
│   │   ├── common/           # 通用业务组件
│   │   │   ├── DailyQuest.tsx              # 每日任务（首页 Bento）
│   │   │   ├── ErrorEliminationBattle.tsx  # 错题消灭战
│   │   │   ├── FloatingCompanion.tsx       # 浮动学习伙伴
│   │   │   ├── FocusShield.tsx             # 专注心流护盾
│   │   │   ├── LearningCompanion.tsx       # 学习伙伴养成
│   │   │   ├── ModelConfigAdvanced.tsx     # 模型配置高级设置
│   │   │   ├── ModelConfigWizard.tsx       # 模型配置向导
│   │   │   ├── PolarisMascot.tsx           # 北极星吉祥物
│   │   │   ├── ProgressRing.tsx            # 环形进度（SVG + count-up）
│   │   │   └── XPToast.tsx                 # XP 提示
│   │   ├── layout/           # 布局（Header、Sidebar、MobileNav）
│   │   ├── providers/        # Provider（Session、Electron、SW、AndroidUpdate）
│   │   └── ui/               # shadcn/ui 基础组件
│   ├── hooks/                # 自定义 Hooks（useTTS、useSTT、useCountUp、useSafeMotion 等）
│   ├── lib/
│   │   ├── db/               # IndexedDB（schema.ts、indexeddb.ts、seed.ts）
│   │   ├── repositories/     # 数据访问层（12 个 repository）
│   │   ├── services/         # 业务服务（ai-service、auth-service、voice-service、secure-storage）
│   │   ├── constants.ts      # 学科常量
│   │   ├── game.ts           # 游戏化逻辑（双货币、连胜、徽章）
│   │   ├── learning-modes.ts # 5 学段配置
│   │   ├── motion.ts         # 动画预设
│   │   ├── safety.ts         # 安全护栏
│   │   ├── utils.ts          # 工具函数
│   │   └── version.ts        # 静态版本信息
│   ├── pages/                # 14 个页面组件
│   ├── routes/               # 路由（index、ProtectedRoute、PublicOnlyRoute）
│   ├── stores/               # Zustand stores（useUserStore、useFocusShieldStore）
│   ├── types/                # TypeScript 类型（electron.d.ts）
│   ├── App.tsx               # 根组件（Router + Providers）
│   ├── main.tsx              # 应用入口
│   └── index.css             # 全局样式 + design tokens
├── docs/                     # 文档（ARCHITECTURE、RELEASE、DEPLOYMENT 等）
├── capacitor.config.ts       # Capacitor 配置
├── vite.config.ts            # Vite 配置
├── AGENTS.md                 # AI 编程协作规范
├── CHANGELOG.md              # 变更记录
└── package.json              # 版本 5.0.0
```

## 文档

| 文档 | 说明 |
|------|------|
| [变更记录](CHANGELOG.md) | 版本变更历史 |
| [架构说明](docs/ARCHITECTURE.md) | v5.0.0 架构设计、数据层、AI 链、游戏化、数据流 |
| [发布说明](docs/RELEASE.md) | v5.0.0 发布说明与发布流程 checklist |
| [项目概述](docs/README.md) | 功能特性、技术栈、项目结构 |
| [部署指南](docs/DEPLOYMENT.md) | Electron + Android 部署方案 |
| [开发指南](docs/DEVELOPER_GUIDE.md) | 架构说明、本地开发、贡献 |
| [Android 构建](docs/ANDROID_BUILD.md) | Android APK 打包指南 |
| [安全规范](docs/SECURITY.md) | 客户端架构下的密钥与数据安全 |
| [AI 编程规范](AGENTS.md) | AI 协作流程、代码规范、已知陷阱 |
| [设计文档](docs/design/) | 调研报告、安全方案、技术参考 |
| [贡献指南](CONTRIBUTING.md) | 如何参与开源贡献 |

## 参与贡献

> ⚠️ 安全提醒：禁止提交任何密钥、证书、`.env` 真值文件。详见 [密钥与安全规范](docs/SECURITY.md)。

欢迎社区贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发环境搭建、代码规范与提交 PR 的流程。

## 许可证

本项目采用 **AGPL-3.0** 协议开源。任何人可自由使用、修改、分发，但衍生作品必须同样以 AGPL-3.0 开源。使用者需自备大模型 API Key，平台本身完全免费。
