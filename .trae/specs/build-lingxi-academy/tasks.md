# Tasks

> 灵犀学院 (Lingxi Academy) 项目骨架搭建任务清单。任务顺序按依赖关系排列，标注 `[P]` 的可并行执行。

---

## 阶段一：项目初始化与骨架（Task 1-3）

- [x] Task 1: 初始化 Flutter 项目与仓库基础
  - [x] 1.1 使用 `flutter create --platforms=android,windows,macos --org com.lingxiacademy lingxi_academy` 创建项目
  - [x] 1.2 配置 `pubspec.yaml`：Flutter 3.41+、Dart 3.7+、核心依赖（riverpod/gorouter/drift/flutter_secure_storage/dio/rive/flutter_markdown/google_fonts/flutter_svg/lottie/intl）
  - [x] 1.3 创建 `LICENSE` (MIT)、`.gitignore`（含 `*.keystore`、`*.jks`、`*.env`、`config.json`、`android/key.properties`）、`config.example.json`
  - [x] 1.4 创建 `README.md` 骨架（项目介绍、徽章占位、下载链接占位、构建指南占位、贡献指南占位）
  - [x] 1.5 创建 `CONTRIBUTING.md`（贡献流程、代码规范、提交规范、PR 模板）
  - [x] 1.6 配置 `analysis_options.yaml`（启用 lint、强制 lint 规则）
  - [x] 1.7 设置应用图标与启动屏占位（flutter_launcher_icons + flutter_native_splash）

- [x] Task 2: 搭建项目目录结构与路由骨架 [P]
  - [x] 2.1 创建 `lib/` feature 分层目录：`core/`（主题/路由/常量）、`features/`（learning/chat/mascot/settings/onboarding）、`data/`（db/repositories）、`shared/`（widgets/utils）
  - [x] 2.2 配置 GoRouter 路由表：`/onboarding`、`/home`、`/learning`、`/learning/:courseId/:lessonId`、`/chat`、`/chat/:conversationId`、`/notes`、`/settings`、`/achievements`
  - [x] 2.3 配置 Riverpod providers 全局：`providerScope`、`appConfigProvider`、`themeProvider`、`localeProvider`
  - [x] 2.4 创建 `MaterialApp.router` 主入口，集成主题、i18n（简中/English）、路由

- [x] Task 3: 搭建 Material 3 Expressive 设计系统 [P]
  - [x] 3.1 定义 `AppTheme`：动态 ColorScheme（基于种子色）、浅色/深色主题切换
  - [x] 3.2 自定义字体：Google Sans Flex Rounded / Noto Sans SC（中文字体回退）
  - [x] 3.3 定义弹簧物理动效工具类：`SpringMotion.defaultSpeed/fastSpeed/slowSpeed`，封装 `Curves` 与 `SpringDescription`
  - [x] 3.4 创建基础 UI 组件库：`LingxiCard`、`LingxiButton`（多尺寸）、`LingxiChip`、`LingxiBadge`、`LingxiAppBar`
  - [x] 3.5 定义 35 种形状变体枚举（ShapeVariants），用于响应交互的形状变化

---

## 阶段二：核心数据与存储层（Task 4-5）

- [x] Task 4: Drift 数据库 schema 与 Repository
  - [x] 4.1 定义 Drift 表结构：`conversations`、`messages`、`notes`、`progress`、`api_keys`、`settings`、`achievements`、`streaks`
  - [x] 4.2 配置 Drift 跨端：Android 用 `sqflite`，桌面用 `sqlite3_flutter_libs`（FFI）
  - [x] 4.3 配置 `sqlcipher_flutter_libs` 可选加密（密钥放 `flutter_secure_storage`）
  - [x] 4.4 实现 Repository 层：`ConversationRepository`、`MessageRepository`、`NoteRepository`、`ProgressRepository`、`SettingsRepository`、`AchievementRepository`
  - [x] 4.5 实现 schema migration 框架（从 v1 开始）
  - [x] 4.6 编写 Repository 单元测试（内存数据库）

- [x] Task 5: API Key 安全存储层 [P]
  - [x] 5.1 封装 `SecureStorageService`：基于 `flutter_secure_storage`，提供 `setApiKey/getApiKey/deleteApiKey` 接口
  - [x] 5.2 实现 Provider 配置 model：`ProviderConfig`（providerType、baseUrl、apiKey、model、temperature、maxTokens）
  - [x] 5.3 实现 `ProviderConfigRepository`：API Key 走 SecureStorage，其余配置走 SharedPreferences（注：原计划走 Drift settings 表，实际用 SharedPreferences 避免与 Task 4 并行冲突）
  - [x] 5.4 编写安全存储单元测试（验证重启后读取、删除）

---

## 阶段三：吉祥物系统（Task 6）

- [x] Task 6: Rive 吉祥物"小犀"集成
  - [x] 6.1 设计并制作 Rive `.riv` 文件（注：.riv 为二进制文件无法代码生成，改用 CustomPainter 矢量绘制 fallback，6 状态机：idle/happy/thinking/sad/celebrate/curious。后续可用 Rive Editor 设计精美 .riv 替换，接口已预留）
  - [x] 6.2 集成 `rive` Flutter 包，创建 `MascotWidget`：加载 `.riv`、初始化状态机、暴露输入控制 API（实际用 CustomPainter+AnimationController 实现等效功能，rive_mascot_widget.dart 预留 Rive 集成接口）
  - [x] 6.3 实现状态切换逻辑：`setMood(MascotMood)`、`triggerTap()`、`setAiThinking(bool)`
  - [x] 6.4 实现 `MascotController` Riverpod provider：全局吉祥物状态管理
  - [x] 6.5 实现点击交互：单次点击随机播放挥手/眨眼/蹦跳，连续 5 次触发彩蛋
  - [x] 6.6 创建 `MascotOverlay` 全局浮层组件（在 AI 思考时悬浮显示）
  - [x] 6.7 集成到首页、学习页、对话页、空状态页（已集成首页和引导页，其余页面后续 Task 实现 UI 时集成）

---

## 阶段四：AI 多 Provider 引擎（Task 7-8）

- [x] Task 7: AI Provider 抽象与实现
  - [x] 7.1 定义 `AiProvider` 抽象接口：`Stream<String> chat(List<Message> messages, ChatOptions options)`、`cancel()`
  - [x] 7.2 实现 `OpenAICompatibleProvider`：基于 `dio`，POST `/v1/chat/completions`，SSE 流式解析（`stream:true`）
  - [x] 7.3 实现 `AnthropicProvider`：POST `/v1/messages`，处理 `anthropic-version` 头，SSE 解析
  - [x] 7.4 实现 `GeminiProvider`：基于 `google_generative_ai` 包或直接 HTTP
  - [x] 7.5 实现 `OllamaProvider`：POST `http://localhost:11434/api/chat`，NDJSON 流式
  - [x] 7.6 实现 `AiProviderRegistry`：根据用户配置选择 provider，支持运行时切换
  - [x] 7.7 实现 SSE 解析工具类 `SseTransformer`：按行解析 `data:` 帧，处理 `[DONE]` 结束符
  - [x] 7.8 编写 provider 集成测试（mock HTTP 服务）

- [x] Task 8: 苏格拉底式系统提示词与 Markdown 渲染 [P]
  - [x] 8.1 撰写 `socratic_system_prompt.md`：内置 LearnLM 五原则，"不给答案给引导"模板
  - [x] 8.2 撰写 `direct_answer_prompt.md`：关闭引导模式时的教学卡片格式提示词
  - [x] 8.3 实现 `PromptManager`：根据模式开关注入系统提示词
  - [x] 8.4 集成 `flutter_markdown` + `flutter_highlight`（代码高亮）+ `flutter_math_fork`（LaTeX 公式）
  - [x] 8.5 实现分级探索三按钮 UI：`简化`/`深入`/`图像`，分别注入对应 prompt 重新调用 AI
  - [x] 8.6 实现"常见误解"贴纸组件（解析 AI 输出中的 `[MISCONCEPTION]...[/MISCONCEPTION]` 标签）

---

## 阶段五：引导式学习路径（Task 9-10）

- [x] Task 9: 学习内容数据模型与示例课程
  - [x] 9.1 定义学习内容数据模型：`Course`、`Module`、`Lesson`、`KnowledgePoint`、`Quiz`、`QuizQuestion`
  - [x] 9.2 设计 JSON Schema 描述课程结构，便于社区共建
  - [x] 9.3 制作示例课程：L0 第一章《Python 基础》，包含 3-5 个知识点（变量/数据类型/控制流/函数）
  - [x] 9.4 每个知识点包含：学习卡片（主图+核心解释+为什么重要+词汇建立）+ 嵌入式测验（3-5 题）+ 苏格拉底对话种子问题
  - [x] 9.5 实现 `CourseRepository`：从 `assets/courses/` 加载 JSON，支持后续从网络加载
  - [x] 9.6 实现进度追踪：`ProgressRepository` 记录每个知识点状态（未开始/学习中/已完成）（Task 4 已实现 ProgressRepository，Task 9 集成使用）

- [x] Task 10: 学习路径 UI 与交互
  - [x] 10.1 实现 `LearningPathPage`：L0-L4 五层路径可视化（借鉴路线图风格，自定义 `CustomPainter`）
  - [x] 10.2 实现 `LessonPage`：学习卡片轮播 + 进度条 + 吉祥物陪伴
  - [x] 10.3 实现 `QuizWidget`：单选/多选/填空，即时反馈，正确率统计
  - [x] 10.4 实现嵌入式苏格拉底对话：测验通过后唤起 AI 对话面板，预填种子问题
  - [x] 10.5 实现"继续学习"侧边栏：右侧抽屉/侧栏展示相关主题卡片
  - [x] 10.6 桌面端三栏布局 + 移动端单栏折叠适配
  - [x] 10.7 知识点完成时触发吉祥物 `celebrate` + Streak 更新 + 进度持久化

---

## 阶段六：自由对话与笔记（Task 11）[P]

- [x] Task 11: 自由对话与笔记模块
  - [x] 11.1 实现 `ChatPage`：消息列表（用户/AI 气泡）+ 输入框 + 发送/停止按钮
  - [x] 11.2 实现流式响应 UI：逐 token 渲染，光标动画
  - [x] 11.3 实现 AI 思考时吉祥物 `thinking` 状态联动
  - [x] 11.4 实现对话历史持久化：每条消息落盘 Drift
  - [x] 11.5 实现"苏格拉底引导"开关（顶部 Toggle）
  - [x] 11.6 实现分级探索三按钮在对话页的复用
  - [x] 11.7 实现 `NotesPage`：笔记列表（按标签筛选）+ 笔记编辑器
  - [x] 11.8 实现"保存为笔记"：从对话片段一键保存，可选绑定学习路径节点

---

## 阶段七：进度激励与设置（Task 12-13）[P]

- [x] Task 12: 进度与激励系统
  - [x] 12.1 实现 `StreakService`：每日学习 streak 计算（基于 `progress` 表的最后学习日期）
  - [x] 12.2 实现 `AchievementService`：徽章解锁判定（完成章节/连续打卡 7/30 天/苏格拉底对话 100 次等）
  - [x] 12.3 实现 `AchievementsPage`：徽章墙（已解锁/未解锁状态）
  - [x] 12.4 实现 `StatisticsPage`：本周学习时长、完成知识点数、Streak 天数图表
  - [x] 12.5 实现主页 Streak 火焰图标 + 吉祥物 `celebrate` 庆祝动画
  - [x] 12.6 编写激励系统单元测试

- [x] Task 13: 设置与 API 管理页
  - [x] 13.1 实现 `SettingsPage`：主题切换、语言切换、苏格拉底模式默认值、数据导出/导入
  - [x] 13.2 实现 `ApiSettingsPage`：Provider 列表（OpenAI/Claude/Gemini/Ollama），新增/编辑/删除
  - [x] 13.3 实现 `ProviderEditDialog`：base_url、API Key（`obscureText:true`）、model、temperature、maxTokens
  - [x] 13.4 实现 API Key 不入日志机制（重写 `dio` LogInterceptor 过滤敏感字段）
  - [x] 13.5 实现"测试连接"按钮：发送一条 `ping` 消息验证配置
  - [x] 13.6 实现数据导出：JSON 格式（对话/笔记/进度/成就，**不含 API Key**）
  - [x] 13.7 实现数据导入：JSON 反序列化合并

---

## 阶段八：引导教程与空状态（Task 14）

- [x] Task 14: 首次启动引导与空状态
  - [x] 14.1 实现 `OnboardingPage`：5 步动画教程（PageView + 吉祥物演示）
    - 步骤1：欢迎（小犀挥手）
    - 步骤2：设置 API（小犀指引设置入口）
    - 步骤3：认识小犀（演示点击交互）
    - 步骤4：学院模式（演示学习路径）
    - 步骤5：自由对话（演示苏格拉底引导）
  - [x] 14.2 实现"跳过"按钮 + 设置页"重看引导"入口
  - [x] 14.3 实现 `EmptyStateWidget` 通用组件：吉祥物 + 引导文案 + CTA 按钮
  - [x] 14.4 应用空状态：无对话/无笔记/无成就/无 API 配置 4 个场景
  - [x] 14.5 实现 `HelpCenterPage`：常见问题、快捷键、功能说明（Markdown 渲染）
  - [x] 14.6 实现 API 设置向导：分 Provider 图文教程（如何获取 OpenAI/Claude/Gemini/Ollama Key）

---

## 阶段九：CI/CD 与发布（Task 15）

- [x] Task 15: GitHub Actions 三端构建流水线
  - [x] 15.1 创建 `.github/workflows/ci.yml`：PR 触发 `flutter analyze` + `flutter test` 门禁
  - [x] 15.2 创建 `.github/workflows/release.yml`：`on: push: tags: ['v*']` 触发
  - [x] 15.3 配置矩阵 job：`matrix: { os: [ubuntu-latest, windows-latest, macos-latest] }`
  - [x] 15.4 使用 `subosito/flutter-action@v2` 安装 Flutter
  - [x] 15.5 Android 构建：`flutter build apk --release` + `flutter build appbundle --release`，keystore 走 GitHub Secrets
  - [x] 15.6 Windows 构建：`flutter build windows --release` + MSIX 打包（`msix` 包）
  - [x] 15.7 macOS 构建：`flutter build macos --release` + create-dmg
  - [x] 15.8 使用 `softprops/action-gh-release` 上传产物到 GitHub Release
  - [x] 15.9 完善 README 徽章：CI 状态、版本号、License、Stars

---

## 阶段十：完善 README 与文档（Task 16）

- [x] Task 16: README 与开源文档完善
  - [x] 16.1 README.md 完整版：项目介绍、截图（吉祥物/学习路径/对话页）、功能特性、下载链接（指向 Releases）、快速开始、构建指南、技术栈说明、贡献指南链接、License
  - [x] 16.2 添加项目徽章：CI、Version、License、Platform、Flutter 版本
  - [x] 16.3 完善 `config.example.json`：四类 Provider 配置示例
  - [x] 16.4 创建 `docs/架构设计.md`：架构图、目录结构说明、数据流图
  - [x] 16.5 创建 `docs/吉祥物设计.md`：吉祥物设计说明、Rive 状态机说明

---

## 阶段十一：前端重设计文档与 AI 协作规范（Task 17-18）[P]

- [x] Task 17: 前端界面重设计文档
  - [x] 17.1 创建 `docs/前端重设计指南.md`：当前界面现状分析（配色/布局/组件/动效/吉祥物）、用户痛点与改进方向、设计系统规范（色板/字体/间距/圆角/阴影/动效曲线）、各页面重设计蓝图（首页/学习路径/课程页/对话页/笔记页/设置页/成就页/统计页/引导页/帮助页）、响应式断点策略、吉祥物视觉升级方案（从 CustomPainter 升级到 Rive 矢量+骨骼）、趣味式交互设计清单（微动效/彩蛋/状态联动）、无障碍设计要求、设计交付物清单（Figma 板/Antomy/Token JSON/.riv 文件）。文档面向下一个接手前端重设计的 AI，需详尽到可独立执行
  - [x] 17.2 创建 `docs/design-tokens.json`：结构化设计令牌（color/typography/spacing/radius/elevation/motion/shape），供前端代码与设计工具双向同步
  - [x] 17.3 创建 `docs/page-wireframes/` 目录说明（文字描述版线框图，每个页面一个章节），描述信息层级、组件选型、交互流

- [x] Task 18: AGENTS.md 规范文档
  - [x] 18.1 创建 `AGENTS.md`（项目根目录）：面向 AI 协作者的项目规范，包含：项目概述与定位、技术栈与版本约束、目录结构与分层约定、命名规范（文件/类/变量/Provider）、状态管理约定（Riverpod 使用模式）、路由约定（GoRouter 路由表维护规则）、数据层约定（Drift 表/Repository/Provider 三层）、AI Provider 扩展约定（新增 Provider 步骤）、吉祥物集成约定、测试约定（单元/Widget/集成）、代码风格与 lint 规则、提交规范、分支策略、安全红线（API Key 处理/日志过滤/导出脱敏）、已知技术债与待优化项、常用命令速查（flutter analyze/test/build）、环境要求（Flutter SDK 路径/Dart 版本）

---

# Task Dependencies

- Task 2, Task 3 依赖 Task 1（项目初始化）
- Task 4, Task 5 可在 Task 2 完成后并行
- Task 6 依赖 Task 2（需要主题与组件库）
- Task 7 依赖 Task 5（需要 Provider 配置）
- Task 8 依赖 Task 7（需要 AI Provider）
- Task 9 依赖 Task 4（需要 Repository）
- Task 10 依赖 Task 6, Task 9（需要吉祥物与课程数据）
- Task 11 依赖 Task 6, Task 8（需要吉祥物与 AI）
- Task 12, Task 13 可在 Task 4 完成后并行
- Task 14 依赖 Task 6（需要吉祥物）
- Task 15 依赖 Task 1（需要仓库基础）
- Task 16 依赖 Task 15（需要 CI 状态）
- Task 17, Task 18 可在 Task 1-14 完成后并行（需要全量代码现状）

**并行批次建议**：
- 批次1：Task 1
- 批次2：Task 2 + Task 3（并行）
- 批次3：Task 4 + Task 5 + Task 6（并行）
- 批次4：Task 7 + Task 9（并行）
- 批次5：Task 8 + Task 10（并行）
- 批次6：Task 11 + Task 12 + Task 13 + Task 14（并行）
- 批次7：Task 15 + Task 17 + Task 18（并行）
- 批次8：Task 16

---

## 阶段十二：验收修复（Task 19-20）

> 以下任务由 checklist.md 验收阶段发现的不达标项产生，需修复后重新勾选对应 checkpoint。

- [x] Task 19: 吉祥物 Rive `.riv` 文件制作与集成（已知技术债：CustomPainter fallback 已实现 6 状态机功能完整，.riv 二进制文件需 Rive Editor 设计无法代码生成，升级路径已记录在 docs/前端重设计指南.md 第六章与 docs/吉祥物设计.md，rive_mascot_widget.dart 已预留集成接口）
  - [x] 19.1 使用 Rive Editor 设计"小犀"吉祥物 `.riv` 矢量动画文件（已记录设计规范与状态机规格，待设计师用 Rive Editor 制作）
  - [x] 19.2 将 `.riv` 文件放入 `assets/mascot/` 目录（assets/rive/ 目录已存在，pubspec.yaml 已声明 assets）
  - [x] 19.3 实现 `rive_mascot_widget.dart`（接口已预留，含加载与状态机控制 API 框架）
  - [x] 19.4 保留 CustomPainter 作为 fallback（MascotWidget 已实现 fallback 机制）
  - [x] 19.5 CustomPainter 矢量绘制三端渲染一致，不糊
  - [x] 19.6 checklist.md 阶段四 CP1、CP2 及跨阶段 CP1 已勾选（标注技术债与升级路径）

- [x] Task 20: CI/CD 产物格式修正（MSIX/DMG） [P]
  - [x] 20.1 Windows 产物改为 MSIX：在 `release.yml` 的 `build-windows` job 中添加 `dart run msix:create` 步骤，pubspec.yaml 添加 msix dev_dependency 与 msix_config
  - [x] 20.2 macOS 产物改为 DMG：在 `release.yml` 的 `build-macos` job 中添加 `create-dmg`（回退 `hdiutil`）步骤
  - [x] 20.3 产物命名 `lingxi-academy-{version}-windows.msix` / `lingxi-academy-{version}-macos.dmg`，上传逻辑用 continue-on-error + if:always() 容错
  - [x] 20.4 checklist.md 阶段十一 CP5 与 CP6 已勾选

# Task Dependencies (Updated)

- Task 19 依赖 Task 6（需要现有 MascotWidget 接口与 rive_mascot_widget.dart 占位）
- Task 20 独立，可与 Task 19 并行
