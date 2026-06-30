# Polaris 架构说明（v5.0.0 Vite SPA）

> 本文档描述 Polaris v5.0.0 的纯前端 SPA 架构：整体架构、数据层设计、AI 老师链、游戏化系统、跨功能数据流与跨端策略。v5.0.0 在 v4.0.0 纯 SPA 基础上完成体验重构，未改变"无服务器 / 无数据库 / 客户端直连 LLM"的核心架构。

## 1. 整体架构

### 1.1 设计哲学

Polaris v5.0.0 仍是**纯前端单页应用（SPA）**，构建产物为纯静态文件，运行时无需任何服务端进程：

- **无服务器**：部署后无需运行任何 Node.js 服务进程，仅需静态文件加载
- **无数据库**：所有数据由浏览器原生 IndexedDB 持久化，按用户设备隔离
- **无中间层**：LLM 调用由客户端 `fetch` 直连供应商 API，SSE 流式响应
- **无会话服务**：认证完全在客户端完成，token 存 localStorage + IndexedDB

### 1.2 整体数据流（文字 + 箭头）

```
浏览器 / WebView
   │
   ▼
React 19 SPA（Vite 构建）
   │
   ├─ Pages (src/pages/) ──► Hooks / Components ──► Stores (Zustand)
   │
   ▼
React Router 7（HashRouter）
   │  routes/index.tsx + ProtectedRoute + PublicOnlyRoute
   ▼
Services 层（客户端业务逻辑）
   ├─ ai-service.ts        （直连 LLM，SSE 流式，6 阶段苏格拉底）
   ├─ auth-service.ts      （PBKDF2 本地认证）
   ├─ voice-service.ts     （TTS / STT 语音）
   └─ home-stats / game    （聚合、游戏化结算）
   │
   ▼
Repository 层（数据访问抽象，12 个 repository）
   │
   ▼
IndexedDB 封装（src/lib/db/indexeddb.ts，idb 库）
   │
   ├─► IndexedDB（浏览器原生，DB_VERSION=3，14 个 store）
   └─► localStorage（API Key 加密 / Session token / 多 LLM 配置）
                                    │
                                    ▼ fetch（HTTPS / SSE）
                          LLM 供应商 API（外部）
                          DeepSeek / Qwen / OpenAI / Ollama
```

### 1.3 关键设计原则

1. **纯 SPA**：构建产物为单个 `index.html` + 静态资源包，运行时由浏览器/WebView 加载执行
2. **HashRouter 路由**：hash 路由兼容 Capacitor 本地文件加载，无需服务端 SPA fallback
3. **Repository 模式**：数据访问层抽象，未来如需切换到云端可平滑替换
4. **Service 层**：业务逻辑封装，与 UI 解耦
5. **学段自适应**：通过根元素 `data-mode` 属性下发，CSS variables（`--radius-scale` / `--text-scale` / `--game-strength`）全局响应
6. **客户端隔离**：每个浏览器/设备的数据独立，无中心化数据共享

## 2. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 构建框架 | **Vite 7** | 极速冷启动 + HMR，纯 SPA 构建产物 |
| UI 框架 | **React 19** | 函数组件 + Hooks |
| 语言 | **TypeScript 5** | 严格模式，零类型错误（`npx tsc --noEmit`） |
| 路由 | **React Router 7**（HashRouter） | 客户端路由，兼容 Capacitor |
| 样式 | **Tailwind CSS 4** | 原子化 CSS + PostCSS |
| 组件库 | **shadcn/ui**（基于 Radix UI） | 可定制、可复制粘贴的组件库 |
| 动画 | **Framer Motion 12** | 统一 EASE_OUT_EXPO，`useSafeMotion` 包裹无障碍降级 |
| 状态管理 | **Zustand** + React Context | 用户状态 + SessionProvider |
| 本地存储 | **IndexedDB**（通过 `idb` 库封装） | 浏览器原生持久化，DB_VERSION=3 |
| 语音 | Web Speech API + Capacitor TextToSpeech | TTS / STT，移动端 fallback |
| 认证 | **Web Crypto API**（PBKDF2） | 客户端密码哈希 |
| AI 服务 | 客户端 `fetch` 直连 + SSE | DeepSeek / Qwen / OpenAI / Ollama |
| 字体 | Inter Variable + 思源黑体 / PingFang SC | 中文优先 |
| 桌面端 | **Electron 42** + electron-serve + electron-builder + electron-updater | PC 桌面应用打包与自动更新 |
| 移动端 | **Capacitor 8** | Android APK 壳 |
| PWA | manifest.json + Service Worker（可选，Capacitor 原生环境跳过） | 可安装到桌面/主屏 |

## 3. 数据层设计

### 3.1 IndexedDB Schema

定义在 `src/lib/db/schema.ts`，使用 idb 库的版本化迁移机制。当前 `DB_VERSION = 3`：

| Store | 主键 (keyPath) | 索引 | 说明 |
|------|----------------|------|------|
| users | id (uuid) | email (unique), learningMode | 用户 |
| sessions | token (uuid) | userId, expiresAt | 会话 |
| practice_records | id | userId, subject, questionId, createdAt | 练习记录 |
| error_notes | id | userId, subject, status | 错题（new/reviewing/mastered） |
| knowledge_points | id | subject, gradeLevel | 知识点 |
| badges | id | category | 徽章定义 |
| user_badges | id | userId, badgeId | 用户徽章 |
| streak_records | userId | - | 连胜记录 |
| ai_conversations | id | userId, createdAt | AI 对话 |
| subjects | id | mode | 学科 |
| questions | id | subject, difficulty, gradeLevel | 题库 |
| user_stats | userId | - | XP / 等级 / 学习时长 |
| currency_transactions | id | userId, createdAt, currency | 双货币流水（v2 新增） |
| daily_quests | id | userId, date, templateId | 每日任务（v3 新增） |

### 3.2 版本化迁移

```typescript
// src/lib/db/indexeddb.ts
const DB_VERSION = 3;

openDB('polaris_learn', DB_VERSION, {
  upgrade(db) {
    // upgrade 回调按 objectStoreNames 兜底创建
    // v1: 基础 stores
    // v2: 新增 currency_transactions
    // v3: 新增 daily_quests
  },
});
```

`upgrade` 回调按 `objectStoreNames` 兜底创建，对 v1/v2 既有库平滑迁移，老用户打开应用即自动升级。

### 3.3 通用 CRUD 封装

```typescript
// 通用工具函数（src/lib/db/indexeddb.ts）
getAll<T>(store): Promise<T[]>
getByKey<T>(store, key): Promise<T | undefined>
put<T>(store, value): Promise<void>
deleteByKey(store, key): Promise<void>
queryByIndex<T>(store, index, value): Promise<T[]>
```

所有 repository 都基于这 5 个工具函数构建，无需直接操作事务。

### 3.4 Repository 模式

数据访问逻辑集中到一层，UI 和业务逻辑层无需关心数据来源。可测试（UI 层可 mock repository）、可替换（未来切换云端 API 仅替换 repository 实现）、统一接口。

| Repository | 文件 | 主要职责 |
|-----------|------|---------|
| User | `user.repository.ts` | 用户 CRUD、学段切换、`totalStudyHours` / `starlight` / `crystal` / `freezeCards` / `shieldCount` 字段 |
| Auth | `auth.repository.ts` | 注册、登录、改密、会话管理 |
| Practice | `practice.repository.ts` | 题库查询、答题记录、统计 |
| ErrorNotes | `error-notes.repository.ts` | 错题收录、按薄弱度排序、消灭战取题 |
| Knowledge | `knowledge.repository.ts` | 知识点、掌握度更新、`getDecayedNodes()` 超期节点、`bumpSubjectRootMastery` |
| Gamification | `gamification.repository.ts` | 徽章、连胜、XP |
| Conversation | `conversation.repository.ts` | AI 对话持久化 |
| Leaderboard | `leaderboard.repository.ts` | 5-15 人小队列、个人进步榜 |
| Courses | `courses.repository.ts` | 静态示例课程 |
| HomeStats | `home-stats.repository.ts` | 首页 Bento 统计聚合 |
| **Currency** | `currency.repository.ts` | 双货币（星光 / 晶核）产出 / 消耗 / 余额（v5 新增） |
| **Quest** | `quest.repository.ts` | 每日任务模板与生成、进度上报（v5 新增） |

使用示例：

```typescript
import { practiceRepository } from '@/lib/repositories/practice.repository';

const questions = await practiceRepository.getQuestions({
  subject: 'math',
  difficulty: 'medium',
  learningMode: 'MIDDLE',
});
```

## 4. AI 老师链设计

AI 老师是 Polaris 的核心模块，v5.0.0 完成全链路升级。定义在 `src/lib/services/ai-service.ts`。

### 4.1 6 阶段苏格拉底教学

苏格拉底式教学分 6 个阶段，AI 在每次回复末尾以 `<stage>` 标签标注当前阶段：

```
diagnostic（诊断）
   │
   ▼
clarification（澄清）
   │
   ▼
hypothesis（假设）
   │
   ▼
reasoning（推理）
   │
   ▼
verification（验证）
   │
   ▼
reflection（反思）
```

- **System Prompt 注入**：`buildSocraticSystemPrompt()` 末尾追加指令，要求模型以 `<stage>diagnostic|clarification|hypothesis|reasoning|verification|reflection</stage>` 标注阶段
- **前端解析**：`AiTeacherPage` 用正则 `/^<stage>(\w+)<\/stage>$/m` 解析 stage 标签驱动 `setCurrentStage`，渲染时剥离标签不显示给用户
- **阶段缺失兜底**：stage 标签缺失时保持当前阶段不变，不报错
- **学段差异化**：`buildModeStyleBlock()` 按 5 学段注入差异化教学风格（幼儿园亲切 emoji / 初高中学术严谨 / 上班族实用干练），`buildLengthRule()` 控制回复长度

### 4.2 weakPoints 薄弱点注入

```typescript
// chat() 调用链从 useUserStore 读取 weakPoints，传入 system prompt
const systemPrompt = buildSocraticSystemPromptForMode(learningMode, messages, weakPoints);
```

`weakPoints` 注入到 system prompt 的"当前学生信息"块，让 AI 针对学生薄弱点教学。

### 4.3 流式响应（SSE）

```typescript
export async function chat(
  messages: ChatMessage[],
  learningMode: string,
  apiKey?: string,
  provider?: LLMProvider,
  signal?: AbortSignal,        // AbortController 支持停止生成
  weakPoints?: string[],       // 薄弱点注入
  onChunk?: (chunk: string) => void  // 逐块回调
): Promise<ChatResult>
```

- `stream: true` 开启流式
- `ReadableStream` + `TextDecoder` 解析 SSE 流（`data: {...}` 格式）
- `onChunk(chunk)` 回调逐块返回内容，`AiTeacherPage` 每 50ms 一个字符流入气泡
- "停止生成"按钮触发 `abortController.abort()`，已接收内容保留，气泡标记"已中断"
- 流式结束后解析末尾 `<stage>` 标签更新进度条

### 4.4 模型配置（多配置 + 加密 + 连接测试）

- **多配置**：`llm_config_profiles` 数组 + `llm_config_active_id`，支持新建/切换/删除
- **加密存储**：`secure-storage.ts` 的 `obscureValue` / `deobscureValue`，Electron 用 `safeStorage`，Capacitor 用 Preferences + AES，Web 用 `btoa` + 指纹混淆
- **Ollama 自动探测**：`fetchOllamaModels()` 调用 `http://localhost:11434/api/tags` 列出已装模型
- **连接测试**：`testConnection()` 发送最小请求（"ping", max_tokens:5），返回延迟与模型名
- **配置向导**：`ModelConfigWizard`（3 步：选 provider → 输入 Key → 测试）+ `ModelConfigAdvanced`（baseUrl / model / temperature 三档 / maxTokens / topP）

### 4.5 降级响应

API Key 缺失、网络错误或限流时，`getFallbackResponse()` 返回本地生成的占位回复（按学科 × 阶段 × 学段语气适配），确保用户体验不中断。

## 5. 游戏化系统设计

游戏化逻辑集中在 `src/lib/game.ts` 与各 repository，遵循"避免多巴胺赌博机"原则。

### 5.1 双货币

| 货币 | 产出场景 | 用途 |
|------|---------|------|
| **星光（starlight）** | 日常产出：每日任务、节点掌握、错题消灭、专注时长、全对、连胜每日 | 购买冻结卡、个性化 |
| **晶核（crystal）** | 仅里程碑：7/30/100/365 天连胜、升入学霸/大师、稀有徽章、一周全勤 | 解锁特殊内容 |

设计原则：星光锚定 mastery 进步，每个动作产出固定无随机倍率；晶核仅里程碑产出，避免高频变动奖励。

### 5.2 连胜容错

- **冻结卡**：某日未学习时自动消耗冻结卡（若有），连胜不断
- **里程碑保护盾**：7/30/100 天奖励保护盾（`shieldCount`），专注护盾兜底
- **历史最高纪录**：断签后保留 `bestStreak` 展示

### 5.3 每日任务

- **每日生成**：首次打开应用时生成 3 个任务（基于当日学习目标）
- **任务模板**：完成 1 个新节点 / 消灭 5 道错题 / 专注 15 分钟等
- **复合键**：`${userId}_${date}_${templateId}` 保证唯一
- **完成反馈**：打勾动画 + 星光 count-up；全部完成触发宝箱动画 + 徽章碎片掉落

### 5.4 专注心流护盾

- 25 分钟番茄钟 + 5 分钟休息循环
- 心流能量条可视化（渐变填充，非倒计时数字）
- 深色聚焦态（背景变暗、侧边栏收起为图标条）
- 通知延后到专注结束
- 结束集中结算：专注 XP × 1.5 加成、消灭错题数、解锁节点

### 5.5 知识星图

- **自研轻量力导向图**（未引入新依赖）替代扁平节点图
- **三态编码**：已掌握亮星（白色+光晕）/ 未解锁星云遮蔽（半透明灰）/ 薄弱红光脉冲（红色+脉冲）
- **交互**：滚轮缩放、节点拖拽、点击亮星复习 / 红星进入消灭战
- **裂纹衰减**：超过复习周期（默认 7 天）的已掌握节点自动裂纹，进度环回退到 80%；`getDecayedNodes()` 查询超期节点；裂纹用 SVG filter（feTurbulence + feDisplacementMap）

### 5.6 错题消灭战

- 60 秒倒计时（心流能量条形式，非数字）
- 从 `error-notes.repository` 按薄弱度排序取题
- 连续答对将红色节点点亮成绿色（scaleIn + 颜色过渡）
- 答错节点闪烁但不退出（shake 动画）
- 结算页：消灭节点数 + 星光奖励 count-up

### 5.7 学习伙伴养成

- Polaris 小灵 4 形态：蛋（0h）→ 幼体（10h）→ 成体（50h）→ 觉醒（200h）
- 按累计学习时长（`totalStudyHours`）进化
- 情绪规则触发（非 AI）：连续学习开心、断签担心、攻克难题欢呼
- 进化时播放进化动画 + 庆祝特效
- 首页右下角常驻，可点击查看状态与心情

## 6. 跨功能数据流

v5.0.0（Task 19）打通各模块数据流，避免信息孤岛：

### 6.1 练习 / 错题 → AI 老师

```
PracticePage 答错
   │ 保存错题上下文
   ▼
答错页"问 AI 老师"按钮
   │ 跳转 AiTeacherPage 携带 router state
   ▼
AiTeacherPage 读取 location.state
   │ 构造苏格拉底 prompt 自动发送
   ▼
ErrorNotesPage 每条错题"问 AI"按钮
   │ 携带 {errorNoteId, question, userAnswer, correctAnswer, subject}
   ▼
AiTeacherPage 构造 prompt 自动发送
```

### 6.2 AI 老师 → 知识图谱掌握度

```
AI 对话进入 reflection 阶段
   │
   ▼
bumpSubjectRootMastery（学科根节点 mastery +5，封顶 100）
   │
   ▼
每轮对话 updateQuestProgress（ai_chat +1）
```

### 6.3 各模块 → 每日任务进度上报

```
PracticePage 答对 ──► correct_answers +1
knowledge.repository 首次达掌握阈值 70 ──► complete_node +1
ErrorEliminationBattle 每消灭一个红节点 ──► eliminate_errors +1
FocusShield 专注 ──► focus_minutes 上报
```

### 6.4 知识节点掌握 → 星光产出

```
knowledge.repository updateMastery
   │ 首次达满掌握 100
   ▼
addStarlight(10)
   │ 用 masteryRewardClaimed 幂等标志
   ▼
避免重复发放
```

## 7. 跨端策略

三端共用同一份 `dist/` 产物：

```
                    ┌──────────────┐
                    │  vite build  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   dist/ 目录  │
                    │ (静态文件)    │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │   Web    │     │ Android  │     │ Electron │
   │  (PWA)   │     │(Capacitor)│    │   (PC)   │
   └──────────┘     └──────────┘     └──────────┘
   静态托管          内嵌 WebView      electron-serve
   Vercel/           加载 dist/        加载 dist/
   Netlify/Nginx     androidScheme:    + DPI 缩放
                     https
```

### 7.1 Web（PWA）

- `npm run build` → `dist/`
- 上传到任意静态托管平台，`manifest.json` + Service Worker 可安装到桌面/主屏
- Service Worker 缓存静态资源，IndexedDB 数据天然离线

### 7.2 Android（Capacitor）

```typescript
// capacitor.config.ts
export default {
  appId: 'com.polaris.learn',
  appName: 'Polaris',
  webDir: 'dist',
  server: { androidScheme: 'https' },
};
```

- 纯本地加载 `dist/`，APK 启动无任何 HTTP 请求（彻底解决 `ERR_CLEARTEXT_NOT_PERMITTED`）
- `network_security_config.xml` 白名单 localhost / 局域网 IP，允许 Ollama 本地连接
- Service Worker 在 Capacitor 原生环境跳过注册
- 语音 STT 移动端用 `MediaRecorder` + Whisper API

### 7.3 Electron（PC）

```javascript
// electron/main.js
const loadURL = require('electron-serve')({ directory: 'dist' });
// 自动检测 scaleFactor，按比例缩放窗口与内容
// electron-updater 检查 GitHub Release 上的 latest.yml 自动更新
```

- `npm run electron:build` → `vite build && electron-builder` 打包
- API Key 加密用 `safeStorage`
- 自动更新：electron-updater + GitHub Releases

### 7.4 构建命令速查

| 目标 | 命令 | 产物路径 |
|------|------|---------|
| Web 静态 | `npm run build` | `dist/` |
| 开发服务器 | `npm run dev` | http://localhost:5173 |
| Android APK | `npm run android:build` → `cd android && ./gradlew assembleDebug` | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Electron 安装包 | `npm run electron:build` | `electron-dist/Polaris 北极星学习平台 Setup.exe` |

## 8. 相关文档

- [README.md](../README.md) - 项目概览与快速开始
- [CHANGELOG.md](../CHANGELOG.md) - 完整变更记录
- [RELEASE.md](./RELEASE.md) - 发布流程与 v5.0.0 发布说明
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [ANDROID_BUILD.md](./ANDROID_BUILD.md) - Android 构建指南
- [SECURITY.md](./SECURITY.md) - 安全规范
- [AGENTS.md](../AGENTS.md) - AI 编程规范与已知陷阱
