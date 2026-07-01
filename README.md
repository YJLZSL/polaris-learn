# Polaris 北极星学习平台

> 安静、可信、可随身携带的自学伙伴 | AGPL-3.0 | **v2.0.0 自学本质回归**

Polaris 是一款面向全学段学习者的纯前端个人 AI 自学平台。V2.0 抛弃商业平台范式（双货币、排行榜、每日任务、连胜、消灭战、学段自适应 token），回归"一个安静、可信、可随身携带的自学伙伴"本质。所有数据本地持久化（IndexedDB），LLM 由客户端直连，平台本身不托管任何用户数据与 API Key。

## V2.0 双平台定位

| 平台 | 形态 | 核心体验 |
|------|------|---------|
| **PC Windows** | Electron 安装包（NSIS x64） | 大屏安静桌面、键鼠高效操作、淡入转场 |
| **Android** | Capacitor 8 原生 APK（API 28+） | 安全区适配、原生 TTS、离线首屏 |
| **Web（降级预览）** | 静态 PWA | 仅用于开发与快速预览，不作为正式发行目标 |

## 核心功能

| 模块 | 说明 |
|------|------|
| **安静桌面首页** | 问候语 + 今日学习时长 + 3 入口（继续学习 / 问 AI 老师 / 复习错题）+ 小灵形象 + 鼓励语，无 Dashboard 卡片堆砌 |
| **AI 老师对话** | 苏格拉底式引导 system prompt、SSE 流式逐字、Markdown / LaTeX / 代码块渲染、朗读 / 复制 / 重新生成 / 清空，无阶段仪表盘 |
| **知识地图** | 自绘 SVG 静态树/网图（≤80 节点、最多 2 层），3 态视觉（已掌握 / 学习中 / 薄弱），点击节点弹最近 5 道错题 + AI 入口 |
| **Anki 错题复习** | 复习卡片正反面 + SM-2 间隔重复算法，操作：再来一次 / 困难（1 天）/ 良好（3 天）/ 简单（7 天），无时间压力 |
| **按知识点练习** | 基于知识树选题，去闯关化、无积分奖励，专注答题与解析本身 |
| **个人学习数据** | 本周学习时长趋势（折线）、本月知识点掌握增长（柱状）、错题复习完成率（环形），仅个人视角无竞争 |
| **学习伙伴小灵** | 单一静态形态 + 3 态情绪（默认 / 专注 / 困意），仅出现在首页、AI 老师页、空状态 |
| **极简专注计时器** | 25/5 倒计时 + 静默，无 XP 加成、无能量条、无通知屏蔽 |
| **离线优先** | 首屏零外部网络依赖，字体与关键资源全部本地随包分发 |

## 安装说明

### Windows 安装包

1. 从 [GitHub Releases](https://github.com/YJLZSL/polaris-learn/releases) 下载 `Polaris 北极星学习平台 Setup.exe`。
2. 双击运行安装程序，按向导完成安装。
3. 首次启动后注册账号，进入 **设置 → 模型配置** 填入你的 LLM API Key。

> Windows 7/8 不支持；推荐 Windows 10/11 64 位。

### Android APK

1. 从 Releases 下载 `app-release.apk`（Release 签名版）或 CI 构建产物。
2. 在 Android 设备上允许"安装未知来源应用"。
3. 安装完成后首次打开，按引导完成学段选择与模型配置。

> 最低支持 Android 9（API 28），推荐 Android 12+（API 31+）。

## 技术栈

```
Vite 7 · React 19 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · Radix UI
Framer Motion 12（仅 ease-out，150ms/300ms 两档）· Zustand · React Context
IndexedDB（via idb，schema V4）· Web Crypto API（PBKDF2 本地认证）
Electron 42（safeStorage + asar 解压调试）· Capacitor 8（仅 Android）
```

- **平台抽象层**：`src/lib/platform/` 统一封装 `secureStorage`、`tts`、`clipboard`、`safeArea`、`update`、`haptic`，UI 层禁止直接调用 `window.electronAPI` 或 `window.Capacitor`。
- **离线首屏**：`index.html` 移除所有外部 CDN；字体本地托管；Capacitor 原生环境不注册 Service Worker。
- **安全存储**：Electron 用 `safeStorage`，Android 用 Keystore + AES-GCM，Web 预览用 `idb-keyval` + 内存混淆。
- **本地数据架构**：IndexedDB 为核心存储（schema V4，已删除 5 个商业 store）；localStorage 仅保存会话 token、引导标记等轻量状态。
- **启动兜底**：`SessionProvider` 5 秒超时降级为 Guest 模式；`ErrorBoundary` 全局捕获，提供"重启应用"与"清除缓存"。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动 Vite 开发服务器（http://localhost:5173）
npm run dev

# 3. 类型检查（必须零错误）
npx tsc --noEmit
```

## 开发模式说明（三态）

Polaris 通过 `POLARIS_DEV_MODE` 环境变量区分三种 Electron 运行态，并对 `userData` 路径分桶以避免数据污染：

| 模式 | 环境变量 | 加载源 | userData 后缀 | 用途 |
|------|---------|--------|--------------|------|
| **vite** | `POLARIS_DEV_MODE=vite` | `http://localhost:5173` | `-dev` | 日常开发，热更新 |
| **unpacked** | `POLARIS_DEV_MODE=unpacked` | `app/dist/index.html`（解压目录） | `-staging` | 调试生产产物，无需重新打包 asar |
| **packaged** | `POLARIS_DEV_MODE=packaged`（默认） | `app.asar/dist/index.html` | 默认 | 正式发布态 |

### app.asar 解压调试流程

```bash
# 1. 先构建一次 Electron 安装包
npm run electron:build

# 2. 解压 app.asar 为 app/ 目录（Electron 优先加载 app/）
npm run electron:unpack

# 3. 以 unpacked 模式启动，可直接修改 app/dist 与 app/electron/main.mjs 验证
POLARIS_DEV_MODE=unpacked npm run electron:dev

# 4. 发布前必须重新打包回 app.asar
npm run electron:repack
```

> 详细流程见 [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 生产构建，产出 `dist/` |
| `npm run lint` | ESLint 检查 |
| `npx tsc --noEmit` | TypeScript 类型检查（必须零错误） |
| `npm run electron:dev` | Electron 开发模式 |
| `npm run electron:build` | 构建 Windows NSIS 安装包 |
| `npm run electron:unpack` | 解压 `app.asar` 为 `app/` 用于调试 |
| `npm run electron:repack` | 重新打包为 `app.asar`（发布前必跑） |
| `npm run android:build` | 构建 Android APK |

## 项目结构

```
ai-edu-platform/
├── electron/          # Electron 主进程（main.mjs，三态加载 + userData 分桶）
├── scripts/           # 构建脚本（unpack-asar.mjs、repack-asar.mjs、generate-icons.js）
├── src/
│   ├── components/    # 通用组件 / 布局 / Provider / shadcn-ui
│   ├── pages/         # HomePage / AiTeacherPage / KnowledgeGraphPage / ErrorNotesPage / AnalyticsPage / PracticePage / SettingsPage
│   ├── lib/
│   │   ├── db/        # IndexedDB schema V4
│   │   ├── repositories/  # 数据访问层（auth / conversation / knowledge / error-notes / practice / user / home-stats / review）
│   │   ├── services/  # ai-service / auth-service / voice-service / secure-storage
│   │   ├── spaced-repetition.ts  # SM-2 间隔重复算法
│   │   ├── learning-modes.ts     # 3 学段（YOUTH / TEEN / ADULT，仅驱动 AI prompt）
│   │   └── motion.ts  # 动效配置（150ms / 300ms + ease-out）
│   ├── routes/        # React Router 7（HashRouter，已删除 /leaderboard）
│   └── stores/        # Zustand stores
├── AGENTS.md          # AI 编程代理规范（V2 重写，7 大新章节）
└── docs/              # 架构 / 设计 / 动效 / 开发 / 发布文档
```

## 文档

- [架构说明](./docs/ARCHITECTURE.md) — 平台抽象层、asar 隔离机制、模块清单、SM-2 算法
- [UI 设计系统](./docs/UI_DESIGN.md) — 安静单色设计（北极星靛蓝 #6366F1）
- [动效规范](./docs/ANIMATION.md) — 两档时长 + 单缓动
- [开发指南](./docs/DEVELOPER_GUIDE.md) — asar 解压调试、三态环境、Sub-Agent 协作
- [发布流程](./docs/RELEASE.md) — V2 发布 checklist、NSIS / APK 构建
- [变更记录](./CHANGELOG.md) — V2 BREAKING 变更与 v1.0 历史摘要
- [AI 编程规范](./AGENTS.md) — 主上下文保护红线、并行执行、Spec 驱动纪律

## 许可证

AGPL-3.0
