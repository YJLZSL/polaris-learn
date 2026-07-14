# 灵犀学院 架构设计文档

> 本文档描述灵犀学院的整体架构、分层职责、数据流、AI 调用流程、吉祥物状态机、路由结构与安全架构。
>
> **技术栈**：Flutter 3.44.4 / Dart 3.12.2，支持 Android + Windows + macOS 三端
>
> **最后更新**：2026-07-11

---

## 目录

- [一、架构概览](#一架构概览)
- [二、目录结构说明](#二目录结构说明)
- [三、数据流图](#三数据流图)
- [四、AI 调用流程](#四ai-调用流程)
- [五、吉祥物状态机](#五吉祥物状态机)
- [六、路由结构](#六路由结构)
- [七、安全架构](#七安全架构)

---

## 一、架构概览

灵犀学院采用**分层架构**，从上到下分为五层，每层职责清晰、依赖方向单向向下：

```
┌─────────────────────────────────┐
│         UI Layer (features/)     │   页面、组件、交互逻辑
├─────────────────────────────────┤
│     State Management (Riverpod)  │   Provider / StateNotifier
├─────────────────────────────────┤
│      Business Logic (Services)   │   成就服务、连续学习、数据导出
├─────────────────────────────────┤
│    Data Access (Repositories)    │   每表一个 Repository，封装 CRUD
├─────────────────────────────────┤
│      Storage (Drift + Secure)    │   SQLite 数据库 + SecureStorage
└─────────────────────────────────┘
```

### 各层职责

| 层 | 目录 | 职责 | 依赖方向 |
|----|------|------|----------|
| **UI 层** | `lib/features/` | 页面 Widget、业务编排、交互响应 | 依赖 State / Data / Shared |
| **状态层** | Riverpod Providers | 跨组件状态共享、依赖注入 | 依赖 Data 层 |
| **业务层** | `lib/features/*/services/` | 成就解锁、Streak 计算、数据导出等业务逻辑 | 依赖 Data 层 |
| **数据层** | `lib/data/repositories/` | 表 CRUD、数据模型转换 | 依赖 Storage 层 |
| **存储层** | `lib/data/db/` + `lib/data/services/` | Drift SQLite + flutter_secure_storage | 只依赖第三方库 |

### 分层原则

1. **依赖方向单向向下**：上层可依赖下层，下层不可反向依赖上层。
2. **core 层无业务逻辑**：`lib/core/` 只含主题、路由、常量、动画曲线等基础设施。
3. **shared 层不依赖 feature**：`lib/shared/` 是跨 feature 复用的纯 UI 组件与工具。
4. **业务编排集中在 features**：Controller（StateNotifier）负责调用 Repository / Service 完成业务流程。

---

## 二、目录结构说明

```
lib/
├── main.dart                     # 应用入口：初始化 SharedPreferences → ProviderScope
├── app.dart                      # LingxiApp：MaterialApp.router 根 Widget
├── core/                         # 核心层（无业务逻辑）
│   ├── constants/                #   常量定义（app_constants.dart）
│   ├── motion/                   #   动画曲线（spring_motion.dart）
│   ├── providers/                #   全局 Provider（app_providers.dart）
│   ├── router/                   #   路由配置（app_router.dart, route_names.dart）
│   └── theme/                    #   主题（app_theme.dart, lingxi_colors.dart, shape_variants.dart）
├── data/                         # 数据层
│   ├── db/                       #   Drift 数据库
│   │   ├── database.dart         #     表定义 + LingxiDatabase
│   │   ├── connection.dart       #     跨端连接配置（Android sqflite / 桌面 FFI）
│   │   └── database.g.dart       #     代码生成文件
│   ├── models/                   #   纯数据模型（provider_config.dart, course_content.dart）
│   ├── providers/                #   数据层 Provider 注册
│   │   ├── db_providers.dart     #     Repository Provider 注册
│   │   ├── storage_providers.dart#     SecureStorage Provider 注册
│   │   └── course_providers.dart #     课程数据 Provider
│   ├── repositories/             #   仓库（每张表一个 Repository）
│   └── services/                 #   数据服务（secure_storage_service.dart）
├── features/                     # 功能层（按业务模块组织）
│   ├── achievements/             #   成就页
│   ├── ai/                       #   AI Provider 抽象与实现
│   │   ├── ai_provider.dart      #     AiProvider 抽象接口
│   │   ├── ai_provider_registry.dart #  Provider 注册中心
│   │   ├── openai_compatible_provider.dart
│   │   ├── anthropic_provider.dart
│   │   ├── gemini_provider.dart
│   │   ├── ollama_provider.dart
│   │   ├── sse_transformer.dart  #     SSE/NDJSON 流式解析
│   │   ├── secure_log_interceptor.dart # 日志脱敏拦截器
│   │   └── prompt_manager.dart   #     提示词管理（苏格拉底系统提示词注入）
│   ├── chat/                     #   对话列表与对话页
│   ├── help/                     #   帮助中心
│   ├── home/                     #   首页（含 empty_states 子目录）
│   ├── learning/                 #   学习路径与课时（含 widgets 子目录）
│   ├── mascot/                   #   吉祥物小犀
│   │   ├── mascot_state.dart     #     MascotMood 枚举 + MascotState
│   │   ├── mascot_controller.dart#     StateNotifier 控制器
│   │   ├── mascot_painter.dart   #     CustomPainter 矢量绘制（当前实现）
│   │   ├── mascot_widget.dart    #     吉祥物 Widget（交互入口）
│   │   ├── mascot_overlay.dart   #     AI 思考时的悬浮吉祥物
│   │   └── rive_mascot_widget.dart#    Rive 吉祥物（预留接口）
│   ├── notes/                    #   笔记列表与编辑
│   ├── onboarding/               #   引导页与 API 配置向导
│   ├── progress/                 #   进度统计、成就服务、连续学习服务
│   └── settings/                 #   设置、API 配置、数据导出
└── shared/                       # 共享层（跨 feature 复用）
    ├── utils/                    #   工具函数（responsive.dart, misconception_parser.dart）
    └── widgets/                  #   通用组件（lingxi_card, lingxi_button 等）
```

---

## 三、数据流图

灵犀学院采用**单向数据流**，从用户操作到 UI 更新的完整路径如下：

```
┌──────────┐    用户操作     ┌──────────────┐    调用方法    ┌───────────────┐
│  用户操作 │ ──────────────▶ │  UI Widget    │ ────────────▶ │  Controller    │
│ (点击/输入)│                │ (ConsumerWidget)│              │ (StateNotifier) │
└──────────┘                 └──────────────┘               └───────┬───────┘
                                                                    │
                                                           ref.read(xxxProvider)
                                                                    │
                                                                    ▼
┌──────────────┐  返回数据   ┌───────────────┐  调用 CRUD   ┌───────────────┐
│  UI Widget    │ ◀────────── │  Controller    │ ◀────────── │  Repository    │
│ (重建渲染)    │  state 变化 │ (更新 state)   │             │ (数据访问)      │
└──────────────┘             └───────────────┘             └───────┬───────┘
                                                                  │
                                                          db.select / db.update
                                                                  │
                                                                  ▼
                                                        ┌───────────────┐
                                                        │  Drift Database│
                                                        │ (SQLite)       │
                                                        └───────────────┘
```

### 数据流示例：用户发送对话消息

1. **用户操作**：用户在对话页输入文本并点击发送按钮
2. **UI Widget**：`ChatPage` 的发送按钮 `onPressed` 回调被触发
3. **Controller**：调用 `ref.read(chatControllerProvider.notifier).sendMessage(text)`
4. **业务编排**：
   - `ChatController.sendMessage` 先调用 `conversationRepository.createMessage()` 持久化用户消息
   - 调用 `ref.read(currentAiProviderProvider)` 获取 AI Provider
   - 调用 `promptManager.buildMessages()` 注入苏格拉底系统提示词
   - 调用 `aiProvider.chatStream()` 发起流式请求
   - 联动 `mascotControllerProvider.setAiThinking(true)` 切换吉祥物为 thinking
5. **流式更新**：每收到一个 `TextDeltaEvent`，更新 `state.currentAssistantText`，UI 自动重建
6. **完成处理**：
   - 收到 `DoneEvent` → 调用 `conversationRepository.createMessage()` 持久化 AI 回复
   - 调用 `streakService.recordStudyActivity()` 更新连续学习天数
   - 调用 `mascotControllerProvider.celebrate()` 切换吉祥物为庆祝
7. **UI 渲染**：`ChatPage` 通过 `ref.watch(chatControllerProvider)` 订阅状态变化，自动重建消息列表

---

## 四、AI 调用流程

AI 调用是灵犀学院的核心流程，涉及提示词注入、Provider 选择、流式解析、安全脱敏多个环节。

### 完整调用链

```
用户输入
   │
   ▼
┌───────────────────┐
│   ChatController   │  1. 持久化用户消息到 Messages 表
│  (sendMessage)     │  2. 读取 socraticModeProvider 判断模式
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   PromptManager    │  3. 根据模式注入系统提示词：
│  (buildMessages)   │     - 苏格拉底模式：引导提问，不给答案
└─────────┬─────────┘     - 自由模式：普通对话
          │
          ▼
┌───────────────────┐
│ AiProviderRegistry │  4. 根据 ProviderType 创建对应 Provider：
│ (_createProvider)  │     openaiCompatible / anthropic / gemini / ollama
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   具体 AiProvider   │  5. 通过 dio 发起 HTTP 请求
│  (chatStream)      │     - 请求经过 SecureLogInterceptor（脱敏）
└─────────┬─────────┘     - 响应通过 SseTransformer 解析
          │
          ▼
┌───────────────────┐
│   SseTransformer   │  6. 解析 SSE/NDJSON 流：
│  (parse)           │     - 按行分割 → 提取 data: → JSON 解码
└─────────┬─────────┘     - 输出 Stream<AiStreamEvent>
          │
          ▼
┌───────────────────┐
│   AiStreamEvent    │  7. 事件类型：
│  (流式事件)         │     - TextDeltaEvent: 增量文本
└─────────┬─────────┘     - DoneEvent: 流式结束
          │                - ErrorEvent: 出错
          ▼
┌───────────────────┐
│   ChatController   │  8. 逐事件处理：
│  (事件消费)         │     - TextDelta: 追加到 currentAssistantText
└───────────────────┘     - Done: 持久化 AI 消息 + 吉祥物 celebrate
                          - Error: 设置 error + 吉祥物 sad
```

### 四类 Provider 对比

| ProviderType | 实现类 | 默认 baseUrl | 默认模型 | 流式协议 |
|--------------|--------|--------------|----------|----------|
| `openaiCompatible` | `OpenAICompatibleProvider` | `https://api.openai.com/v1` | `gpt-4o-mini` | SSE |
| `anthropic` | `AnthropicProvider` | `https://api.anthropic.com` | `claude-3-5-sonnet-20241022` | SSE |
| `gemini` | `GeminiProvider` | `https://generativelanguage.googleapis.com` | `gemini-1.5-flash` | SSE |
| `ollama` | `OllamaProvider` | `http://localhost:11434` | `llama3.2` | NDJSON |

### AiProvider 抽象接口

所有 Provider 实现统一的 `AiProvider` 抽象接口（`lib/features/ai/ai_provider.dart`）：

- `chatStream({messages, options})` → `Stream<AiStreamEvent>`：流式聊天
- `chat({messages, options})` → `Future<String>`：非流式聊天（内部聚合 chatStream）
- `cancel()`：取消当前请求
- `testConnection()` → `Future<bool>`：测试连接可用性

### 苏格拉底模式提示词注入

当 `socraticModeProvider` 为 `true` 时，`PromptManager` 会在消息列表头部注入系统提示词，要求 AI：

1. 不直接给出答案，而是通过提问引导用户思考
2. 将问题拆解为更小的步骤
3. 鼓励用户尝试自己推导
4. 在用户卡住时给予适度的提示而非完整答案

---

## 五、吉祥物状态机

吉祥物小犀拥有 6 种情绪状态，由 `MascotMood` 枚举定义（`lib/features/mascot/mascot_state.dart`），由 `MascotController`（StateNotifier）全局管理。

### 状态转换图

```
                    ┌──────────┐
        ┌───────────│   idle   │◀───────────┐
        │           │ (待机)    │            │
        │           └────┬─────┘            │
        │                │                  │
        │   用户点击      │ AI 思考开始       │ 超时/恢复
        │ (triggerTap)   │ (setAiThinking)  │
        │                ▼                  │
        ▼          ┌──────────┐             │
   ┌────────┐     │ thinking │             │
   │ happy  │     │ (思考)    │             │
   │ (开心)  │     └────┬─────┘             │
   └───┬────┘          │                   │
       │               │ 流式完成 / 出错     │
       │ 1.5s 后恢复    ▼                   │
       │          ┌──────────┐  ┌──────────┐│
       │          │celebrate │  │   sad    ││
       └─────────▶│ (庆祝)    │  │ (难过)    ││
                  └────┬─────┘  └────┬─────┘│
                       │             │      │
                       │ 3s 后恢复    │ 3s 后恢复
                       └─────────────┴──────┘
                                       │
                              ┌────────┘
                              ▼
                    ┌──────────┐
                    │ curious  │
                    │ (好奇)    │
                    └──────────┘
```

### 6 状态说明

| 状态 | 触发场景 | 持续时间 | 恢复到 |
|------|----------|----------|--------|
| `idle` | 默认状态 / 超时恢复 | 持续 | — |
| `happy` | 用户点击吉祥物 / Streak ≥ 3 | 1.5s | idle |
| `thinking` | AI 流式响应中 | 直至流式结束 | celebrate / sad |
| `sad` | AI 出错 | 3s | idle |
| `celebrate` | AI 完成回复 / 完成知识点 / 连点 5 次彩蛋 | 3s | idle |
| `curious` | 进入新页面（预留） | 1.5s | idle |

### 交互彩蛋

- **单次点击**：切换为 `happy`，1.5s 后恢复 `idle`
- **2 秒内连续点击 5 次**：触发 `celebrate` 彩蛋，持续 3s + 额外星光粒子（`extraSparkle`）

---

## 六、路由结构

路由使用 GoRouter（`lib/core/router/app_router.dart`），路由名与路径常量统一定义在 `RouteNames`（`lib/core/router/route_names.dart`）。

### 路由树

```
/ (根)
├── /onboarding                    # 引导页（5 步 PageView）
│   └── /onboarding/api-setup      # API 设置向导
│
└── ShellRoute (导航壳 _AppShell)
    │
    │  导航壳根据屏幕宽度切换：
    │  - ≥840px：NavigationRail（桌面/平板）
    │  - <840px：NavigationBar（移动）
    │
    ├── /home                      # 首页
    │
    ├── /learning                  # 学习路径页
    │   └── /learning/:courseId/:lessonId  # 课程页（知识点学习）
    │
    ├── /chat                      # 对话列表页
    │   └── /chat/:conversationId  # 对话页
    │
    ├── /notes                     # 笔记列表页
    │   └── /notes/:noteId         # 笔记编辑器
    │
    ├── /achievements              # 成就页
    │
    ├── /statistics                # 学习统计页
    │
    ├── /settings                  # 设置页
    │   └── /settings/api          # API 配置页
    │
    └── /help                      # 帮助中心
```

### 路由 redirect 逻辑

`goRouterProvider` 中的 `redirect` 实现 onboarding 引导：

- 读取 `SharedPreferences` 的 `onboarding_completed` 标志
- **未完成引导**：除 `/onboarding`、`/onboarding/api-setup`、`/settings/api` 外，全部重定向到 `/onboarding`
- **已完成引导**但访问 `/onboarding` 或 `/onboarding/api-setup`：重定向回 `/home`

### 路由参数传递

- **路径参数**：`state.pathParameters['xxx']`（如 `courseId`、`lessonId`、`conversationId`、`noteId`）
- **查询参数**：`state.uri.queryParameters['xxx']`
- **复杂对象**：不通过路由传递，改为通过 Provider 共享（如 `chatControllerProvider.loadConversation(id)`）

---

## 七、安全架构

安全是灵犀学院的核心设计原则。API Key 的存储、传输、日志全链路均有安全措施。

### API Key 存储与过滤流程

```
┌─────────────────────────────────────────────────────────────┐
│                    API Key 全生命周期                         │
└─────────────────────────────────────────────────────────────┘

  用户输入 API Key
        │
        ▼
┌───────────────────┐
│ ProviderEditDialog │  用户在设置页填写 API Key
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│SecureStorageService│  通过 flutter_secure_storage 加密存储
│  (存储 API Key)    │  - Android: Android Keystore
└─────────┬─────────┘  - Windows: DPAPI
          │              - macOS: Keychain
          │
          ▼
┌───────────────────┐
│  ApiKeys 表(Drift) │  仅存元数据：providerType、baseUrl、
│  (仅存元数据)       │  model、temperature、maxTokens、enabled
└───────────────────┘  ❌ 不含 apiKey 字段

═══════════════════════════════════════════════════════════

  发起 AI 请求时
        │
        ▼
┌───────────────────────┐
│ProviderConfigRepository│  从 SecureStorage 读取 apiKey
│  (读取 API Key)        │  组装为 ProviderConfig（内存持有）
└───────────┬───────────┘
            │
            ▼
┌───────────────────┐
│ AiProviderRegistry │  用 ProviderConfig 构造具体 Provider
│  (创建 Provider)    │  apiKey 作为构造参数传入
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  dio HTTP 请求     │  请求头携带 Authorization / x-api-key
└─────────┬─────────┘
          │
          ▼
┌───────────────────────┐
│  SecureLogInterceptor  │  日志脱敏拦截器：
│  (日志脱敏)            │  - 请求头: authorization / x-api-key / x-goog-api-key → [REDACTED]
└───────────┬───────────┘  - 查询参数: key / api_key → [REDACTED]
            │                - 请求体字段: apiKey / api_key / key → [REDACTED]
            │                - URL 查询参数: redactUrl()
            ▼
┌───────────────────┐
│  debugPrint 日志   │  输出已脱敏的日志（生产环境关闭 SQL 日志）
└───────────────────┘

═══════════════════════════════════════════════════════════

  数据导出时
        │
        ▼
┌───────────────────┐
│ ProviderConfig     │  toJson() 必须跳过 apiKey 字段
│  .toJson()         │  assert(!json.containsKey('apiKey'))
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│DataExportService   │  exportAll() 导出的 JSON 不含 apiKey
│  .exportAll()      │  导入时 copyWith(apiKey: '') 强制清空
└───────────────────┘
```

### 安全红线

1. **API Key 只能通过 `SecureStorageService` 存储**，绝不写入 Drift 数据库、SharedPreferences、文件、日志、导出 JSON
2. **所有 dio 请求必须经过 `SecureLogInterceptor`**，禁止绕过拦截器直接 print 请求/响应
3. **`ProviderConfig.toJson()` 必须不含 apiKey**，代码中有 `assert` 断言保护
4. **`.gitignore` 必须包含敏感文件**：`config.json`、`*.env`、`*.keystore`、`android/key.properties` 等
5. **截图/错误报告不能暴露 API Key**，提交 Issue/PR 前确认无残留

### 跨端加密方案

| 平台 | flutter_secure_storage 底层实现 |
|------|-------------------------------|
| Android | Android Keystore（硬件级加密） |
| Windows | DPAPI（Windows Data Protection API） |
| macOS | Keychain Services |

---

*本文档随项目演进持续更新。如有疑问或建议，提交 Issue 或在 PR 中讨论。*
