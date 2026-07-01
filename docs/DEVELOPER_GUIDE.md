# Polaris 开发指南（V2.0）

> 本文档规范 Polaris V2.0 的本地开发环境、三态开发模式、app.asar 解压调试流程、userData 路径分桶与 Sub-Agent 协作纪律。配套文档：[ARCHITECTURE.md](./ARCHITECTURE.md)、[RELEASE.md](./RELEASE.md)、[AGENTS.md](../AGENTS.md)。

## 1. 本地开发环境

### 1.1 前置依赖

- Node.js 22+（推荐 22 LTS）
- npm 10+
- Android Studio（仅 Android 构建，含 SDK 28+）
- Windows 10/11 64 位（仅 Windows 打包）

### 1.2 安装与启动

```bash
# 1. 安装依赖
npm install

# 2. 启动 Vite 开发服务器（http://localhost:5173）
npm run dev

# 3. 类型检查（必须零错误）
npx tsc --noEmit

# 4. Lint
npm run lint
```

> 大模型 API Key 由用户在「设置」页面填入并保存在设备本地安全存储（Electron `safeStorage` / Android Keystore / Web 内存混淆），前端发起 LLM 调用时携带用户自己的 Key，平台不存储、不经手任何用户密钥。

## 2. 三态开发模式（POLARIS_DEV_MODE）

Polaris 通过 `POLARIS_DEV_MODE` 环境变量区分三种 Electron 运行态。对应的环境文件：

| 环境文件 | `POLARIS_DEV_MODE` | 用途 |
|---------|---------------------|------|
| `.env.development` | `vite` | 日常开发，连 Vite Dev Server |
| `.env.unpacked` | `unpacked` | 解压调试，加载生产 `app/dist` 产物 |
| `.env.production` | `packaged`（默认） | 正式发布，加载 `app.asar` |

### 2.1 三态加载源与 userData 分桶

`electron/main.mjs` 顶部读取 `DEV_MODE = process.env.POLARIS_DEV_MODE || "packaged"`，按模式决定加载源与 `userData` 路径：

| 模式 | 加载源 | userData 后缀 | DevTools | secureStorage 路径 |
|------|--------|--------------|----------|-------------------|
| `vite` | `http://localhost:5173` | `-dev` | 自动打开（detach） | `<userData>-dev/polaris-secure-storage.json` |
| `unpacked` | `app/dist/index.html`（解压目录） | `-staging` | 不自动打开 | `<userData>-staging/polaris-secure-storage.json` |
| `packaged` | `app.asar/dist/index.html` | 默认 | 不自动打开 | `<userData>/polaris-secure-storage.json` |

启动日志统一打印 `[Polaris] Mode: <MODE> | UserData: <path>`。`secureStorageFile` 在 `app.whenReady()` 回调中按分桶后的 `userData` 重新计算，确保三种模式的 IndexedDB、安全存储、配置文件互不污染。

### 2.2 为什么需要三态

- **vite**：日常开发，热更新快，但无法验证"生产构建产物"的行为（Vite Dev Server 与 `vite build` 产物存在差异）。
- **unpacked**：解压 `app.asar` 为 `app/` 目录后，可直接修改 `app/dist` 与 `app/electron/main.mjs` 验证生产产物，无需每次 `vite build` + `electron:build` 完整链路。
- **packaged**：正式发布态，加载 `app.asar`，与用户实际安装的形态一致。

## 3. app.asar 解压调试流程

### 3.1 解压（unpack）

```bash
# 1. 先构建一次 Electron 安装包（产出 electron-dist/win-unpacked/resources/app.asar）
npm run electron:build

# 2. 解压 app.asar 为 app/ 目录
npm run electron:unpack
```

`scripts/unpack-asar.mjs` 行为：
- 将 `app.asar` 重命名为 `app.asar.bak` 作为备份
- 将 asar 内容解压到 `app/` 目录
- 优先用 `@electron/asar extract`；失败回退逐文件容忍解压（跳过缺失的 unpacked 文件）
- Windows 文件锁重试 6 次（EBUSY/EPERM/ENOTEMPTY/EACCES）
- 同时处理 `app.asar.unpacked` 伴随目录

### 3.2 调试（unpacked 模式启动）

```bash
# 以 unpacked 模式启动，Electron 加载 app/dist/index.html
POLARIS_DEV_MODE=unpacked npm run electron:dev
```

此时可直接修改 `app/dist/`、`app/electron/main.mjs` 并重启 Electron 验证，无需重新打包。`userData` 路径追加 `-staging`，不污染生产用户数据。

### 3.3 重打包（repack，发布前必跑）

```bash
npm run electron:repack
```

`scripts/repack-asar.mjs` 行为：
- 删除 `app/` 目录
- 将 `app.asar.bak` 重命名为 `app.asar`
- 若 `app.asar.bak.unpacked` 存在则恢复为 `app.asar.unpacked`
- 若 `app/` 不存在则提示"无需 repack"并以退出码 0 退出

> ⚠️ **发布红线**：Electron 启动时若 `resources/` 同时存在 `app/` 与 `app.asar`，**优先加载 `app/` 目录**。解压调试后忘记 `repack` 会发布解压态。发布前必须验证 `app.asar` 存在、`app/` 目录已删除。

## 4. 开发工作流

推荐的三段式开发工作流：

```
vite 开发（日常迭代）
   │  npm run dev
   │  快速热更新，验证 UI 与逻辑
   ▼
unpacked 调试（验证生产产物）
   │  npm run electron:build && npm run electron:unpack
   │  POLARIS_DEV_MODE=unpacked npm run electron:dev
   │  验证 vite build 产物在 Electron 生产态的行为
   ▼
packaged 正式发布
   │  npm run electron:repack（确保回到 asar 态）
   │  npm run electron:build（最终打包）
   │  验证安装包内只有 app.asar
   ▼
GitHub Release v2.0.0
```

## 5. 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 生产构建，产出 `dist/` |
| `npm run lint` | ESLint 检查 |
| `npx tsc --noEmit` | TypeScript 类型检查（必须零错误） |
| `npm run electron:dev` | Electron 开发模式（按 POLARIS_DEV_MODE 加载） |
| `npm run electron:build` | 构建 Windows NSIS 安装包 |
| `npm run electron:unpack` | 解压 `app.asar` 为 `app/` 用于调试 |
| `npm run electron:repack` | 重新打包为 `app.asar`（发布前必跑） |
| `npm run electron:icon` | 重新生成应用图标 |
| `npm run android:build` | 构建 Android APK（`vite build && cap sync android`） |
| `npm run android:open` | 在 Android Studio 中打开项目 |
| `npm run version:check` | 查看当前版本号 |

## 6. 代码规范

- **TypeScript 严格模式**：`npx tsc --noEmit` 必须零错误，禁止使用 `any`（必要时用 `unknown` + 类型守卫）。
- 使用路径别名 `@/` 指向 `src/`。
- 组件使用函数式声明，优先使用箭头函数。
- 状态管理优先使用 Zustand，避免 prop drilling。
- **数据访问必须通过 `src/lib/repositories/` 层**，不直接操作 IndexedDB。
- LLM 调用通过 `src/lib/services/ai-service.ts`；认证通过 `src/lib/services/auth-service.ts`。
- **动画使用 Framer Motion，配置统一在 `src/lib/motion.ts`**，所有动画 props 用 `useSafeMotion` 包裹以支持 `prefers-reduced-motion` 降级。
- UI 组件优先使用 shadcn/ui，自定义组件放在 `src/components/common/`。

## 7. Sub-Agent 协作规范摘要

为避免 IDE 卡死与协作失序，V2 重写 `AGENTS.md` 新增 7 大章节，本节摘要关键红线（完整规范见 [AGENTS.md](../AGENTS.md)）：

### 7.1 主上下文保护红线

- 禁止在主上下文用 `Read` 读取单文件 > 500 行（用 `offset/limit` 分段或委托 Sub-Agent）。
- 禁止在主上下文用 `Edit` 替换 > 200 行的 `old_string`（拆分为多次小 Edit 或委托 Sub-Agent）。
- 禁止在主上下文执行 `npm run build`、`electron:build`、`cap sync` 等长命令（用 `RunCommand` 非阻塞 + `CheckCommandStatus` 轮询）。
- 主上下文单次响应的 tool calls 数 ≤ 5（除并行 Read 外）。

### 7.2 Sub-Agent 委托强制场景

- 单文件重写 > 200 行 → Sub-Agent
- 跨 3+ 文件的重构 → Sub-Agent
- 运行测试 / 构建 / 验证 → Sub-Agent（用 `general_purpose_task`）
- 多文件搜索 + 阅读汇总 → `search` Sub-Agent

### 7.3 并行执行规则

- 无依赖的任务必须并行 Sub-Agent（同一条消息内多个 Task 工具调用）。
- 主上下文禁止"等一个 Sub-Agent 完成再起下一个"的串行模式（除非有显式依赖）。
- 并行 Sub-Agent 数量上限 5（避免资源争用）。

### 7.4 临时文件与长命令纪律

- 所有辅助脚本必须放 `ai-edu-platform/.trae/tmp/`（已 gitignored）。
- 禁止在 `d:\AIKFCC\Polaris\` 或 `ai-edu-platform\` 根目录创建临时 `.js`、`.mjs`、`.json`、`.log`、`.txt`。
- 临时脚本用完即删（任务结束前 `DeleteFile`）。
- `npm run build`、`electron:build`、`vite build`、`cap sync android`、`npx tsc --noEmit` 等必须 `blocking: false`，用 `CheckCommandStatus` 轮询（间隔 ≥ 3 秒）。

### 7.5 Spec 驱动与回滚红线

- 任何 > 3 步的任务必须先写 spec（spec.md + tasks.md + checklist.md）。
- 实现阶段每个 task 完成后必须勾选 `tasks.md` 对应项；验证阶段必须委托 Sub-Agent 对照 `checklist.md` 逐项核验。
- 禁止 `git reset --hard`、`git checkout .`、`git clean -f` 等破坏性操作（除非用户显式要求）。
- 禁止删除 `.trae/specs/` 下任何已存在的 spec 文档（即使已被取代）。
- 开始工作前必须 `git status` 确认工作区状态。

## 8. 调试技巧

- **查看当前模式**：启动 Electron 后访问 `polaris://__health` 查看当前 `POLARIS_DEV_MODE` 与加载源。
- **userData 路径**：启动日志 `[Polaris] Mode: <MODE> | UserData: <path>` 直接打印，便于定位 IndexedDB 与安全存储文件。
- **IndexedDB 调试**：Electron / Web 环境下打开 DevTools → Application → IndexedDB 查看 store 数据；Android 环境用 `adb shell` 配合 `chrome://inspect`。
- **stage 标签剥离**：AI 回复若包含历史遗留的 `<stage>...</stage>` 标签，前端静默剥离，不报错、不更新进度指示器。
