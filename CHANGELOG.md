# Changelog

本项目所有重要变更记录均会写入此文件。版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [3.0.0] - 2026-06-30

### 重构亮点
- **纯前端架构**：移除所有后端依赖，Next.js 静态导出模式，无服务器即可运行
- **IndexedDB 数据层**：浏览器原生持久化存储，替代 Prisma + SQLite
- **客户端直连 LLM**：直接调用 DeepSeek/Qwen/OpenAI/Ollama API，不经服务器转发
- **本地认证系统**：Web Crypto API PBKDF2 哈希，无 NextAuth 依赖
- **跨平台适配**：PC（Electron）+ Android（Capacitor）+ Web（PWA）三端统一
- **响应式与高 PPI**：移动端底部导航栏、安全区适配、高 PPI 字号优化
- **前端美术升级**：玻璃拟态设计、Inter 可变字体、统一缓动曲线动画系统

### 新增
- IndexedDB schema 与封装（`src/lib/db/`）
- 8 个 repository（user/auth/practice/error-notes/knowledge/gamification/conversation/leaderboard）
- courses.repository.ts（静态示例课程）
- home-stats 聚合函数
- ai-service.ts（客户端 AI 直连，支持 5 个 provider）
- auth-service.ts（Web Crypto API PBKDF2 认证）
- version.ts（静态版本信息）
- 3 个响应式 hooks（use-media-query / use-is-mobile / use-device-pixel-ratio）
- MobileNav 底部导航栏组件
- Inter 可变字体引入
- 玻璃拟态 design tokens（--glass-bg / --glass-border）
- 5 级阴影 tokens
- slideInRight 动画预设
- EASE_OUT_EXPO 统一缓动曲线

### 变更
- Next.js 启用 `output: 'export'` 静态导出模式
- Capacitor 配置：`webDir: 'out'`，移除 `server.url`，`androidScheme: 'https'`
- Electron 改用 `electron-serve` 加载静态文件，移除 Next.js 子进程
- Electron 添加 DPI 缩放检测（`screen.getPrimaryDisplay().scaleFactor`）
- viewport 配置：`viewportFit: 'cover'`，`userScalable: false`
- globals.css：主色 `#6366f1`，强调色 `#f59e0b`（金色），暗色模式色板优化
- globals.css：`--radius` 从 `0.625rem` 调整为 `0.75rem`
- Card 组件：玻璃拟态效果（`backdrop-blur-md` + `bg-card/80`）
- Input 组件：focus ring 改为 `ring-primary/50`
- motion.ts：所有动画统一使用 `EASE_OUT_EXPO` 缓动曲线
- Header/Sidebar：从 next-auth/react 迁移到本地 SessionProvider
- SessionProvider：完全移除 NextAuth，改为 React Context + auth-service
- manifest.json：添加 `display_override` 和 `purpose: "maskable"` 图标
- ServiceWorkerRegister：在 Capacitor 原生环境跳过注册
- package.json build.files：`.next/**/*` 改为 `out/**/*`

### 移除
- Prisma ORM（`prisma/` 目录、`src/lib/prisma.ts`、`prisma.config.ts`）
- NextAuth（`src/auth.ts`、`src/app/api/auth/`）
- 所有 API Routes（`src/app/api/` 整个目录，20 个路由）
- `src/lib/llm-adapter.ts`（逻辑内联到 ai-service.ts）
- `src/lib/ai-tutor.ts`（未使用）
- 依赖：`@prisma/client`、`prisma`、`@prisma/adapter-libsql`、`@prisma/adapter-pg`、`@libsql/client`、`pg`、`bcryptjs`、`next-auth`、`dotenv`
- scripts：`db:migrate`、`db:seed`、`db:migrate-pg`

### 修复
- Android `ERR_CLEARTEXT_NOT_PERMITTED`：添加 network_security_config.xml + usesCleartextTraffic
- home 页面死链：`/error-book` → `/error-notes`，`/camera-search` → `/practice`

---

## [2.1.0] - 2026-06-29

### 重磅变更
- **5 种学习模式系统**：新增幼儿园（KINDERGARTEN）、小学（PRIMARY）、初高中（MIDDLE_HIGH）、大学生（COLLEGE）、上班族（PROFESSIONAL）5 种学习模式，覆盖全年龄段学习者

### 新增
- Prisma schema 新增 `LearningMode` 枚举与 `User.learningMode` / `User.birthDate` 字段
- `src/lib/learning-modes.ts`：模式配置中心（5 种模式的完整元数据 + 学科范围 + 难度范围 + UI 风格 + prompt 风格）
- `src/lib/constants.ts`：统一学科常量（6 学科：数学/语文/英语/物理/化学/生物）
- AI 苏格拉底 prompt 模式分层：`buildSocraticSystemPrompt()` 按 5 种模式注入差异化教学风格指令
- 降级响应 `getFallbackResponse()` / `simulateAIResponse()` 按 learningMode 调整语气
- `applyModeToneToResponse()`：PROFESSIONAL 模式剥离装饰性 emoji
- 练习页难度档位扩展为 5 档（基础/中等/困难/挑战/地狱，含对应颜色与 XP）
- `prisma/seed.ts`：种子数据脚本（12 徽章 + 39 知识点 + 60 道示例题目，5 模式分层）
- `POST /api/auth/change-password`：真实密码修改后端 API（NextAuth v5 + bcryptjs）
- `PATCH /api/user/profile`：支持 learningMode 更新（乐观更新 + 失败回滚）
- 设置页新增"学习模式"Tab：5 种模式卡片 + PATCH API + 即时 toast 反馈
- 首页 Banner 模式徽章 + DropdownMenu 快速切换
- 注册流程 5 个模式卡片选择 + grade 自动设置
- `[data-mode]` 属性下发到 dashboard layout 根元素
- `[data-mode="KINDERGARTEN"]` UI 样式：大圆角、大字号、大按钮、复杂图表自动隐藏
- `[data-mode="PROFESSIONAL"]` UI 样式：紧凑布局、首页"5 分钟速学"微学习入口、排行榜默认隐藏
- 学习报告页幼儿园模式：summary 卡片保留 + 复杂图表隐藏 + 友好提示卡
- 排行榜 EmptyState：PROFESSIONAL 模式默认隐藏 + 设置页 Switch 开关
- 全局 toast 系统（react-hot-toast）：密码修改成功/失败反馈
- 内置幼儿园友好提示卡（`kindergarten-friendly` CSS 类）

### 修复
- 侧边栏 3 个死链路径：`/ai-tutor`→`/ai-teacher`、`/progress`→`/analytics`、`/error-book`→`/error-notes`
- 5 个未实现页面标记 `disabled: true` + "敬请期待" tooltip（拍题/徽章/学习小组/PK挑战/学习计划）
- 密码修改假实现：移除 `setTimeout`，改为真实 API 调用
- AI 老师页苏格拉底阶段统一：前端 4 阶段 → 后端 6 阶段（诊断/澄清/假设/推理/验证/反思）
- 学科硬编码统一：AI 老师/练习/知识图谱页引用 `SUBJECTS` 常量
- `socratic.yaml` 标注为"设计参考文档（非运行时加载）"
- 练习/知识图谱页挂载时主动拉取 `/api/user/profile` 同步 learningMode（修复过滤失效）
- 首页 useEffect 依赖 `learningMode`：模式切换后自动重新拉取 home-stats
- 上班族模式排行榜默认隐藏逻辑：localStorage 未设置时按模式判断
- micro-learning-card CSS 优先级问题：使用 `!important` 确保生效

### 变更
- `app/appId` 保持 `com.polaris.learn` 不变
- 升级版本号：2.0.0 → 2.1.0
- `GET /api/version` 新增 2.1.0 release notes
- AI 老师回复气泡幼儿园模式字号增大（`text-lg leading-relaxed`）

---

## [2.0.0] - 2026-06-25

### 重磅变更
- **品牌重命名**：项目从「智学AI / ai-edu-platform」更名为 **Polaris / 北极星**（北极星隐喻导航指引，寓意引导学生学习之路）
- **全新应用图标**：设计北极星主题图标——深紫渐变夜空背景 + 金色 4 角星 + 中心白点 + 微小辅星，替换原有占位符图标
- **BREAKING**：appId 从 `com.zixueai.edu` 变更为 `com.polaris.learn`，npm 包名从 `ai-edu-platform` 变更为 `polaris-learn`

### 新增
- 安装 Framer Motion，创建统一动画预设库 `src/lib/motion.ts`（pageTransition、staggerContainer、listItem、cardHover、buttonTap、slideInBottom 等）
- 新增 CSS keyframes：`gradient-flow`（渐变流动）、`shimmer-fast`（快速闪烁）、`float`（浮动）
- Dashboard 页面切换过渡动画（AnimatePresence + motion.main）
- 首页 Banner 渐变流动动画
- 首页统计卡片 stagger 渐入 + CountUp 数字计数动画
- 侧边栏导航项 whileHover/whileTap 弹簧微交互 + 品牌 logo 悬停放大
- 练习页选项卡片 stagger 渐入 + 答题反馈缩放动画
- AI 老师消息气泡 slideInBottom 滑入动画
- 排行榜 Top3 领奖台 scaleIn + float 浮起 + 排名列表 stagger + Tab 切换 AnimatePresence
- 卡片 hover 浮起 + 阴影 elevation 细化
- 按钮按压缩放反馈（active:scale-[0.97]）
- 新增 `CHANGELOG.md`

### 修复
- 修复 Electron `main.js` 中 `autoUpdater` 未导入导致生产环境构建崩溃的严重 Bug
- 修复 Electron 窗口未显示应用图标的问题

### 变更
- 仓库名建议从 `ai-edu-platform` 改为 `polaris-learn`（需用户在 GitHub 端手动改名）
- 所有文档（README、CONTRIBUTING、docs/*）全量替换品牌名
- Service Worker 缓存名从 `zhixue-ai-v1` 更新为 `polaris-v1`
- Electron 窗口标题改为 `Polaris`

---

## [1.0.0] - 2026-06-25（已归档）

### 首次发布
- 开源个人 AI 学习平台（AGPL-3.0）
- 苏格拉底式 AI 辅导、智能题库、知识图谱、错题本、学习报告
- 游戏化学习：XP / 等级 / 徽章 / 排行榜 / 连续打卡
- 用户自带 LLM API Key（DeepSeek / Qwen / OpenAI / Ollama）
- PC 桌面端（Electron + electron-builder）
- 移动端（Capacitor Android）
- PWA Service Worker 离线支持
- Electron 自动更新（electron-updater + GitHub Releases）
- Android 版本检查（/api/version + 更新提示横幅）
- 环境隔离（.env.development / .env.production）
- 密钥安全规范（docs/SECURITY.md）
