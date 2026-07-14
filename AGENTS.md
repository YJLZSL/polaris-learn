# AGENTS.md — 灵犀学院 AI 协作者规范

> 本文档面向所有参与灵犀学院开发的 AI 协作者（Trae/Claude/Cursor 等），规定了项目约定、代码规范与安全红线。**阅读本文档后再开始任何代码修改。**
>
> ⚠️ **安全红线章节（见下文）为强制约束，违反将导致密钥泄露等严重后果，任何修改都必须严格遵守。**

---

## 项目概述与定位

- **项目名称**：灵犀学院（Lingxi Academy，包名 `lingxi_academy`）
- **定位**：引导式 AI 学习应用，面向 AI 编程与 AI 应用方向的初学者与进阶学习者，提供结构化课程、苏格拉底式对话、笔记、成就与连续学习激励。
- **目标用户**：自学者、学生、对 AI 应用开发感兴趣的开发者。
- **核心理念**：
  - **非商业化**：项目不以盈利为目的，不内置任何付费墙或广告。
  - **用户自备 API**：应用本身不分发 AI 服务，用户需自行在设置中配置自己的 API Key（OpenAI 兼容 / Anthropic / Gemini / Ollama）。API Key 仅本地加密存储，绝不上传。
- **三端支持**：Android + Windows + macOS。**不包含 iOS 与 Linux**，提交 PR 时请不要引入仅 iOS/Linux 可用的依赖或插件。

---

## 环境要求

| 项 | 要求 |
|----|------|
| Flutter SDK | 3.44.4（推荐），兼容 pubspec 中 `sdk: '>=3.10.0 <4.0.0'` |
| Dart SDK | 3.12.2（随 Flutter 3.44.4 自带） |
| 开发工具 | Trae / VS Code / Android Studio（任选其一，需安装 Flutter 与 Dart 插件） |
| Android | minSdkVersion 24（见 `pubspec.yaml` 中 `flutter_launcher_icons.min_sdk_android`） |
| Windows | Windows 10 及以上，需启用开发者模式 |
| macOS | 11.0 及以上，需 Xcode 命令行工具 |

### Flutter SDK 路径

- **开发环境（本机）**：`C:\Users\23501\AppData\Local\Temp\flutter\bin\flutter.bat`
- **CI 环境**：直接使用 `flutter`（假定已加入 PATH）

下文命令速查中，开发环境示例统一写作 `$ flutter`，实际使用时替换为上述完整路径或确保 `flutter` 已在 PATH 中。

---

## 技术栈与版本约束

以下版本号严格取自 `pubspec.yaml`，**修改依赖时务必同步更新本节**。

### 核心依赖（dependencies）

| 依赖 | 版本 | 用途 |
|------|------|------|
| `flutter_riverpod` | ^2.5.1 | 状态管理（主框架） |
| `riverpod_annotation` | ^2.3.5 | Riverpod 代码生成注解 |
| `go_router` | ^14.2.0 | 声明式路由 |
| `drift` | ^2.18.0 | 类型安全 SQLite ORM |
| `sqlite3_flutter_libs` | ^0.5.24 | 桌面端 SQLite FFI |
| `sqlcipher_flutter_libs` | ^0.6.4 | 加密 SQLite（预留） |
| `path_provider` | ^2.1.3 | 跨端文件路径 |
| `path` | ^1.9.0 | 路径处理 |
| `sqflite` | ^2.3.3+1 | Android 端 SQLite |
| `uuid` | ^4.4.0 | UUID v4 主键生成 |
| `flutter_secure_storage` | ^9.2.2 | API Key 加密存储 |
| `dio` | ^5.4.3+1 | HTTP 客户端 |
| `rive` | ^0.13.13 | 吉祥物动画（目标方案） |
| `lottie` | ^3.1.2 | 备用动画 |
| `flutter_svg` | ^2.0.10+1 | SVG 渲染 |
| `flutter_markdown` | ^0.7.2+1 | Markdown 渲染 |
| `flutter_highlight` | ^0.7.0 | 代码高亮 |
| `flutter_math_fork` | ^0.7.2 | 数学公式渲染 |
| `markdown` | ^7.2.0 | Markdown 解析 |
| `google_fonts` | ^6.2.1 | 字体（Noto Sans SC + Quicksand） |
| `intl` | ^0.20.2 | 国际化工具 |
| `shared_preferences` | ^2.2.3 | KV 偏好存储 |
| `cupertino_icons` | ^1.0.8 | iOS 风格图标 |
| `flutter_localizations` | sdk | 本地化委托 |

### 开发依赖（dev_dependencies）

| 依赖 | 版本 | 用途 |
|------|------|------|
| `flutter_lints` | ^4.0.0 | Lint 规则集 |
| `build_runner` | ^2.4.11 | 代码生成运行器 |
| `drift_dev` | ^2.18.0 | Drift 代码生成 |
| `riverpod_generator` | ^2.4.0 | Riverpod 代码生成 |
| `json_serializable` | ^6.8.0 | JSON 序列化代码生成 |
| `flutter_launcher_icons` | ^0.13.1 | 应用图标生成 |
| `flutter_native_splash` | ^2.4.1 | 启动屏生成 |
| `http_mock_adapter` | ^0.6.1 | Dio HTTP mock（测试用） |

### 版本锁定策略

- **使用 `^` 语义化版本范围**，允许 patch/minor 升级，禁止 major 自动升级。
- 升级依赖前先在分支上运行完整 `flutter test`，确认无回归。
- `pubspec.lock` 提交到仓库，保证团队与 CI 环境依赖一致。
- 不要引入未在 `pubspec.yaml` 中声明的新依赖而不更新本节。

---

## 目录结构与分层约定

```
lib/
├── main.dart                     # 应用入口（初始化 SharedPreferences → ProviderScope）
├── app.dart                      # LingxiApp（MaterialApp.router 根 Widget）
├── core/                         # 核心层：与业务无关的基础设施
│   ├── constants/                #   常量（app_constants.dart）
│   ├── motion/                   #   动画曲线（spring_motion.dart）
│   ├── providers/                #   全局 Provider（app_providers.dart）
│   ├── router/                   #   路由（app_router.dart, route_names.dart）
│   └── theme/                    #   主题（app_theme.dart, lingxi_colors.dart, shape_variants.dart）
├── data/                         # 数据层：本地持久化与数据模型
│   ├── db/                       #   Drift 数据库（database.dart, connection.dart, secure_database.dart）
│   ├── models/                   #   纯数据模型（provider_config.dart, course_content.dart）
│   ├── providers/                #   数据层 Provider 注册（db_providers.dart, storage_providers.dart, course_providers.dart）
│   ├── repositories/             #   仓库（每张表一个 Repository）
│   └── services/                 #   数据服务（secure_storage_service.dart）
├── features/                     # 功能层：按业务模块组织
│   ├── achievements/             #   成就页
│   ├── ai/                       #   AI Provider 抽象与实现、SSE、安全日志、提示词管理
│   ├── chat/                     #   对话列表与对话页
│   ├── help/                     #   帮助中心
│   ├── home/                     #   首页（含 empty_states 子目录）
│   ├── learning/                 #   学习路径与课时（含 widgets 子目录）
│   ├── mascot/                   #   吉祥物（controller, state, painter, widget, overlay, rive）
│   ├── notes/                    #   笔记列表与编辑
│   ├── onboarding/               #   引导与 API 配置向导
│   ├── progress/                 #   进度统计、成就服务、连续学习服务
│   └── settings/                 #   设置、API 设置、数据导出、Provider 编辑
└── shared/                       # 共享层：跨 feature 复用
    ├── utils/                    #   工具（responsive.dart, misconception_parser.dart）
    └── widgets/                  #   通用组件（lingxi_card, lingxi_button, lingxi_app_bar 等）
```

### 各层职责

| 层 | 职责 | 依赖方向 |
|----|------|----------|
| `core/` | 主题、路由、全局 Provider、常量、动画曲线。**不含业务逻辑**。 | 只依赖 Flutter/第三方库 |
| `data/` | Drift 表定义、Repository、数据模型、SecureStorage。**只做数据 CRUD，不做业务编排**。 | 可依赖 `core/` |
| `features/` | 业务模块。Page + Controller + 该模块专属 Widget。**业务编排在此**。 | 可依赖 `core/`、`data/`、`shared/` |
| `shared/` | 跨 feature 复用的纯 UI 组件与工具函数。**不依赖任何 feature**。 | 可依赖 `core/` |

### 新增功能时放在哪一层？

- **新页面**：`lib/features/<feature>/<feature>_page.dart`
- **新表/数据**：`lib/data/db/database.dart` 加表 + `lib/data/repositories/` 加 Repository + `lib/data/providers/db_providers.dart` 注册 Provider
- **新全局配置**：`lib/core/providers/app_providers.dart`
- **新路由**：`lib/core/router/route_names.dart` 加常量 + `lib/core/router/app_router.dart` 加 GoRoute
- **新通用组件**：`lib/shared/widgets/`
- **新工具函数**：`lib/shared/utils/`

---

## 命名规范

| 类型 | 约定 | 示例 |
|------|------|------|
| 文件名 | snake_case | `chat_controller.dart`、`api_settings_page.dart` |
| 类名 | PascalCase | `ChatController`、`ApiSettingsPage` |
| 变量/函数 | camelCase | `sendMessage()`、`currentAssistantText` |
| 常量 | camelCase 或 `k` 前缀 | `kAppName`、`kRedactedPlaceholder`、`defaultLocale` |
| 枚举值 | camelCase | `MascotMood.thinking`、`ProviderType.openaiCompatible` |
| Provider | `xxxProvider` / `xxxServiceProvider` | `chatControllerProvider`、`secureStorageServiceProvider` |
| Repository | `XxxRepository` | `ConversationRepository`、`NoteRepository` |
| Page | `XxxPage` | `ChatPage`、`LearningPathPage` |
| Widget | `XxxWidget` / `XxxCard` / `XxxButton` / `XxxAppBar` | `LingxiCard`、`LingxiButton`、`LingxiAppBar` |
| Controller（StateNotifier） | `XxxController` + `XxxControllerState` | `ChatController` + `ChatControllerState` |
| 路由路径 | `/kebab-case` | `/onboarding/api-setup` |
| 路由 name | camelCase，通过 `RouteNames.xxx` 引用 | `RouteNames.apiSetup`、`RouteNames.noteEditor` |

---

## 状态管理约定（Riverpod）

项目使用 `flutter_riverpod` 2.5.x，**所有跨组件状态必须通过 Riverpod 管理**，禁止使用 `setState` 管理全局状态（局部一次性 UI 状态除外）。

### Provider 类型选择指南

| 类型 | 适用场景 | 项目示例 |
|------|----------|----------|
| `Provider` | 无状态的依赖/服务/单例 | `databaseProvider`、`secureStorageServiceProvider`、`goRouterProvider` |
| `StateProvider` | 简单可变状态（一个值的 getter/setter） | `themeModeProvider`、`localeProvider`、`socraticModeProvider` |
| `FutureProvider` | 异步一次性数据（加载完不变） | `currentAiProviderProvider`、`promptManagerProvider` |
| `StreamProvider` | 持续推送的数据流 | （暂未使用，监听 Drift `watch()` 时可用） |
| `StateNotifierProvider` | 复杂状态机、需要封装业务方法 | `chatControllerProvider`、`mascotControllerProvider` |
| `NotifierProvider` | 新版 Notifier（项目目前以 StateNotifier 为主） | （暂未使用） |

### 何时用 autoDispose

- **当前项目未广泛使用 `autoDispose`**。Repository/Service/数据库连接等单例 Provider **不要**加 autoDispose。
- 仅在以下场景考虑 `autoDispose`：
  - 列表页的临时搜索结果 Provider
  - 编辑页的临时表单状态 Provider
- `currentAiProviderProvider` 等 FutureProvider 可考虑加 `.autoDispose`，但当前实现依赖 `invalidate` 重建，**不要随意修改**。

### Provider 组合模式

```dart
// 典型模式：Provider 依赖其他 Provider
final conversationRepositoryProvider = Provider<ConversationRepository>((ref) {
  return ConversationRepository(ref.watch(databaseProvider));
});

// 典型模式：StateNotifierProvider 持有 Ref 以读取其他 Provider
class ChatController extends StateNotifier<ChatControllerState> {
  ChatController(this._ref) : super(const ChatControllerState());
  final Ref _ref;
  // 内部通过 _ref.read(xxxProvider) 按需获取依赖
}
```

### Consumer vs ConsumerWidget vs ConsumerStatefulWidget

| 选择 | 场景 |
|------|------|
| `Consumer` | 在 `StatelessWidget` 内局部订阅（如 `_AppShell` 中嵌入） |
| `ConsumerWidget` | 整个页面只需要 `ref`，无生命周期（多数 Page） |
| `ConsumerStatefulWidget` | 需要 `initState`/`dispose` 等生命周期 + `ref`（如 LessonPage 加载课程） |

### ref.read vs ref.watch 使用场景

- **`ref.watch`**：在 `build` 方法内订阅，状态变化时重建 UI。
- **`ref.read`**：在回调、事件处理、Controller 方法内**一次性读取**，不触发重建。
- **禁止**在 `build` 内使用 `ref.read` 监听响应式数据。

```dart
// ✅ 正确
final themeMode = ref.watch(themeModeProvider);
// ✅ 正确（一次性读取）
Future<void> send() async {
  final repo = ref.read(conversationRepositoryProvider);
  await repo.createConversation('新对话');
}
// ❌ 错误（在 build 内 read 响应式数据）
Widget build(BuildContext context, WidgetRef ref) {
  final socratic = ref.read(socraticModeProvider); // 不会随状态变化重建
  ...
}
```

---

## 路由约定（GoRouter）

### 路由表维护位置

- 路由路径与 name 常量：`lib/core/router/route_names.dart` 中的 `RouteNames` 类。
- 路由配置（GoRoute 树）：`lib/core/router/app_router.dart` 中的 `goRouterProvider`。

### 新增路由步骤

1. 在 `RouteNames` 添加 `name` 与 `path` 常量（两者成对出现）：
   ```dart
   static const String courseDetail = 'courseDetail';
   static const String courseDetailPath = '/course/:courseId';
   ```
2. 在 `goRouterProvider` 的 `routes` 数组中添加 `GoRoute`，引用常量而非硬编码字符串。
3. 嵌套子路由放在父 `GoRoute` 的 `routes` 字段下（如 `/learning/:courseId/:lessonId`）。
4. 跳转使用 `context.go(path)`（替换栈）或 `context.push(path)`（入栈），优先用 `context.namedLocation(RouteNames.xxx)`。

### 路由参数传递

- **路径参数**：通过 `state.pathParameters['xxx']` 读取（如 `courseId`、`lessonId`、`conversationId`、`noteId`）。
- **查询参数**：通过 `state.uri.queryParameters['xxx']` 读取。
- **对象传递**：复杂对象不通过路由传递，改为通过 Provider 共享（如 `chatControllerProvider.loadConversation(id)`）。

### redirect 逻辑（onboarding 引导）

`goRouterProvider` 中的 `redirect` 实现 onboarding 引导：

- 读取 `SharedPreferences` 的 `onboarding_completed` 标志。
- **未完成引导**时：除 `/onboarding`、`/onboarding/api-setup`、`/settings/api` 外，全部重定向到 `/onboarding`。
- **已完成引导**但访问 `/onboarding` 或 `/onboarding/api-setup` 时：重定向回 `/home`。
- **修改此逻辑时务必覆盖测试**（见 `test/onboarding_page_test.dart`）。

### ShellRoute 嵌套路由

- 主导航页面（首页、学习、对话、笔记、成就、统计、设置、API 设置、帮助）嵌套在 `ShellRoute` 下，由 `_AppShell` 提供导航壳。
- `_AppShell` 根据屏幕宽度（≥840）切换 `NavigationRail`（桌面）与 `NavigationBar`（移动）。
- onboarding 与 api-setup 不在 ShellRoute 内，无导航壳。

---

## 数据层约定（Drift）

### 三层架构：Table → Repository → Provider

```
Table（database.dart）  →  Repository（repositories/）  →  Provider（db_providers.dart）
   Drift 表定义               封装 CRUD                     Riverpod 注册
```

- **Table**：在 `lib/data/db/database.dart` 中以 `class XxxTable extends Table` 定义，主键统一用 UUID v4（`clientDefault(_uuid)`）。
- **Repository**：每个表对应一个 Repository 类，构造函数接收 `LingxiDatabase`，**只暴露业务语义化方法**，不直接暴露 `db.select/update`。
- **Provider**：在 `lib/data/providers/db_providers.dart` 注册，依赖 `databaseProvider` 单例。

### 当前表清单（schemaVersion = 1）

| 表 | 用途 |
|----|------|
| `Conversations` | 对话元信息（标题、模型、时间戳） |
| `Messages` | 对话消息（user/assistant/system，含 tokens） |
| `Notes` | 笔记（可关联 conversationId/courseId/lessonId） |
| `Progress` | 学习进度（status: not_started/in_progress/completed，score） |
| `ApiKeys` | API Key 元数据（**仅元数据，真实 Key 不入库**，存 SecureStorage） |
| `Settings` | 通用 KV 设置 |
| `Achievements` | 成就解锁记录 |
| `Streaks` | 连续学习天数（单行表） |

### 新增表步骤

1. 在 `database.dart` 添加 `class XxxTable extends Table`，主键用 `clientDefault(_uuid)`。
2. 在 `@DriftDatabase(tables: [...])` 注解中添加新表。
3. 在 `LingxiDatabase` 类内可通过 `_$LingxiDatabase` 生成的访问器访问。
4. 在 `repositories/` 添加 `XxxRepository`。
5. 在 `db_providers.dart` 注册 `xxxRepositoryProvider`。
6. **必须**：递增 `schemaVersion` 并在 `migration.onUpgrade` 中添加迁移代码（见下）。
7. 运行 `flutter pub run build_runner build --delete-conflicting-outputs` 重新生成 `database.g.dart`。

### migration 策略

```dart
@override
int get schemaVersion => 1;  // 每次表结构变更递增

@override
MigrationStrategy get migration => MigrationStrategy(
  onCreate: (m) async => await m.createAll(),
  onUpgrade: (m, from, to) async {
    // 示例：if (from < 2) { await m.addColumn(...); }
    // 当前仅 v1，无迁移步骤
  },
  beforeOpen: (details) async {
    await customStatement('PRAGMA foreign_keys = ON');
  },
);
```

- **必须**递增 `schemaVersion`，否则旧用户升级后新表不会创建。
- `onUpgrade` 中按版本号顺序执行迁移，**不可破坏已有数据**。

### DateTime 存储

```dart
@override
DriftDatabaseOptions get options =>
    const DriftDatabaseOptions(storeDateTimeAsText: true);
```

- **统一使用 `storeDateTimeAsText: true`**，以 ISO8601 文本存储，保留毫秒精度。
- 不要修改此选项，否则会导致旧数据时间戳解析错误。

### 跨端配置

`lib/data/db/connection.dart` 中 `openConnection()`：

- 数据库文件：`getApplicationDocumentsDirectory()/lingxi_academy.db`
- **Android**：使用 `sqflite`；旧版本（<7.0）调用 `applyWorkaroundToOpenSqlite3OnOldAndroidVersions()`。
- **桌面（Windows/macOS）**：使用 `sqlite3_flutter_libs` 提供的 FFI。
- 通过 `NativeDatabase.createInBackground` 在后台 isolate 打开，避免阻塞 UI。
- **生产环境关闭 SQL 日志**（`logStatements: false`）。

### 测试用数据库

```dart
factory LingxiDatabase.forTesting(QueryExecutor e) => LingxiDatabase(e);
// 测试中：NativeDatabase.memory()
```

---

## AI Provider 扩展约定

### 当前支持的 Provider

| ProviderType | 实现类 | 默认 baseUrl | 默认模型 |
|--------------|--------|--------------|----------|
| `openaiCompatible` | `OpenAICompatibleProvider` | `https://api.openai.com/v1` | `gpt-4o-mini` |
| `anthropic` | `AnthropicProvider` | `https://api.anthropic.com` | `claude-3-5-sonnet-20241022` |
| `gemini` | `GeminiProvider` | `https://generativelanguage.googleapis.com` | `gemini-1.5-flash` |
| `ollama` | `OllamaProvider` | `http://localhost:11434` | `llama3.2` |

### 新增 AI Provider 步骤

1. **实现 `AiProvider` 抽象接口**（`lib/features/ai/ai_provider.dart`）：
   - `chatStream({required List<ChatMessage> messages, required ChatOptions options})` → `Stream<AiStreamEvent>`
   - `chat({...})` → `Future<String>`（内部聚合 `chatStream`）
   - `cancel()` → 取消当前请求
   - `testConnection()` → `Future<bool>`

2. **在 `ProviderType` 枚举添加类型**（`lib/data/models/provider_config.dart`）：
   ```dart
   deepseek('deepseek', 'DeepSeek'),
   ```
   同步更新 `_defaultBaseUrl` 与 `_defaultModel` 映射。

3. **在 `AiProviderRegistry._createProvider` 注册**（`lib/features/ai/ai_provider_registry.dart`）：
   ```dart
   case ProviderType.deepseek:
     return DeepSeekProvider(
       baseUrl: config.baseUrl,
       apiKey: config.apiKey,
       model: config.model,
     );
   ```

4. **在 `ProviderEditDialog` 添加表单**（`lib/features/settings/provider_edit_dialog.dart`）：为新类型提供 baseUrl/model/温度等输入项。

5. **API Key 处理**：构造 Provider 时传入 `config.apiKey`（来自 SecureStorage），**不要在 Provider 内持久化或日志输出 Key**。

### SSE/NDJSON 流式解析规范

- 统一使用 `lib/features/ai/sse_transformer.dart` 中的 `SseTransformer` 解析 SSE 流。
- `SseTransformer.parse(byteStream)` 接收 `Stream<List<int>>`，输出 `Stream<String>`（每个元素是一个完整事件的 data 内容）。
- 遵循 W3C SSE 规范：按行分割、`data:` 前缀提取、空行触发 emit、`:` 开头为注释。
- **NDJSON** 风格（Ollama）：在 Provider 内部按行分割后逐行 JSON 解码。
- 所有流**必须**以 `DoneEvent`（正常完成）或 `ErrorEvent`（出错）终止；被 `cancel` 时静默结束不抛异常。

### 错误处理规范

- 网络错误、HTTP 非 2xx、JSON 解析失败 → emit `ErrorEvent(message)`。
- 鉴权失败（401/403）→ emit `ErrorEvent`，message 提示用户检查 API Key。
- `ChatController` 监听到 `ErrorEvent` 后调用 `_finishStreamingWithError`，设置 `state.error` 并联动吉祥物 `sad` 状态。
- **不要**在 Provider 内部 `print` 错误，统一通过 `ErrorEvent` 上抛。

---

## 吉祥物集成约定

### MascotMood 6 状态

定义在 `lib/features/mascot/mascot_state.dart`：

| 状态 | 含义 | 触发场景 |
|------|------|----------|
| `idle` | 待机（眨眼、轻微摇摆） | 默认状态 |
| `happy` | 开心（跳跃、微笑） | 用户点击吉祥物 |
| `thinking` | 思考（托腮、问号） | AI 流式响应中 |
| `sad` | 难过（低头、泪滴） | AI 出错 |
| `celebrate` | 庆祝（欢呼、星星） | AI 完成回复 / 连续点击 5 次彩蛋 |
| `curious` | 好奇（歪头、放大镜） | 进入新页面（预留） |

### 新页面集成吉祥物的步骤

1. 在页面顶部或合适位置嵌入 `MascotWidget`（或 `RiveMascotWidget` / `MascotOverlay`）。
2. 通过 `ref.watch(mascotControllerProvider)` 订阅状态。
3. 通过 `ref.read(mascotControllerProvider.notifier).setMood(...)` 切换情绪。
4. **不要**在页面内自行管理吉祥物状态，统一走 `mascotControllerProvider`。

### 状态联动规范

- **AI 思考中** → `setAiThinking(true)` → 切换为 `thinking`。
- **AI 完成** → `celebrate()` → 切换为 `celebrate`，3 秒后自动恢复 `idle`。
- **AI 出错** → `setMood(MascotMood.sad)`。
- **用户点击** → `triggerTap()`：单次点击切 `happy` 1.5 秒后恢复；2 秒内连续 5 次触发 `celebrate` 彩蛋。

参考实现：`lib/features/chat/chat_controller.dart` 中的 `sendMessage` / `_commitAssistant` / `_finishStreamingWithError`。

### 点击交互与彩蛋

- 2 秒内连续点击 5 次 → 触发庆祝彩蛋（`celebrate` 持续 3 秒）。
- 单次点击 → `happy` 持续 1.5 秒后恢复 `idle`。
- `mounted` 检查：`Future.delayed` 回调中必须判断 `mounted`，避免 Controller 已销毁后修改状态。

---

## 安全红线（必须遵守）

> 🚨 **本章节为强制约束。任何修改若违反以下任一条，PR 将被直接拒绝。**

### 1. API Key 处理

- **API Key 只能通过 `SecureStorageService` 存储**（底层 `flutter_secure_storage`）。
- **绝不**将 API Key 写入 Drift 数据库、`SharedPreferences`、文件、日志、导出 JSON。
- `ApiKeys` 表只存元数据（providerType、baseUrl、model、temperature、maxTokens、enabled），**不含** apiKey 字段。
- `ProviderConfig.apiKey` 字段仅在内存中持有，`toJson()` **必须**跳过 apiKey（见 `lib/data/models/provider_config.dart` 第 94-103 行）。
- 构造 `AiProvider` 时从 `ProviderConfigRepository`（内部读 SecureStorage）获取 apiKey 传入。

### 2. 日志过滤

- **所有 dio 请求必须经过 `SecureLogInterceptor`**（`lib/features/ai/secure_log_interceptor.dart`）。
- 自动脱敏的请求头：`authorization`、`x-api-key`、`x-goog-api-key` → 替换为 `[REDACTED]`。
- 自动脱敏的查询参数：`key`、`api_key` → 替换为 `[REDACTED]`。
- 自动脱敏的请求体字段：`api_key`、`apikey`、`apiKey`、`key` → 替换为 `[REDACTED]`。
- URL 中的查询参数也会被脱敏（`redactUrl`）。
- **禁止**绕过 `SecureLogInterceptor` 直接 `print` 请求/响应内容。
- 使用 `debugPrint` 而非 `print`（lint 规则 `avoid_print` 已启用）。

### 3. 数据导出

- `DataExportService.exportAll()` 中 `ProviderConfig.toJson()` **必须**不含 apiKey。
- 代码中已有 `assert(!json.containsKey('apiKey'))` 断言，**不要移除**。
- 导入时 `copyWith(apiKey: '')` 强制清空 apiKey（导出文件本身不含 apiKey）。
- 修改 `ProviderConfig.toJson` 时**必须**保持不含 apiKey 字段。

### 4. .gitignore 必须包含敏感文件

当前 `.gitignore` 已包含：

```
*.keystore
*.jks
*.env
config.json
config.local.json
android/key.properties
macos/Runner/*.entitlements.priv
*.secure
```

- **禁止**移除以上条目。
- 新增包含敏感信息的文件时，同步在 `.gitignore` 添加规则。

### 5. 截图/错误报告不能暴露 API Key

- 提交 Issue/PR 时，截图前确认无 API Key 残留（设置页、日志、调试控制台）。
- 错误报告中若包含请求/响应，确保已通过 `SecureLogInterceptor` 脱敏。
- **不要**在 Issue/PR 描述/commit message 中粘贴真实 API Key。

---

## 测试约定

### 测试目录结构

```
test/
├── data/
│   ├── repositories/          # Repository 测试
│   └── services/              # 服务测试（secure_storage_test.dart）
├── features/
│   └── ai/                    # AI Provider 测试（providers_test.dart, sse_transformer_test.dart）
├── shared/
│   └── utils/                 # 工具函数测试
├── chat_controller_test.dart  # Controller 测试（顶层）
├── data_export_test.dart      # 导出服务测试
├── secure_log_interceptor_test.dart
├── streak_service_test.dart
└── widget_test.dart           # Widget 测试
```

### 命名与组织

- 文件名：`xxx_test.dart`（与被测文件同名加 `_test` 后缀）。
- 单元测试：`test('描述', () { ... })`。
- Widget 测试：`testWidgets('描述', (tester) async { ... })`。

### 内存数据库测试

```dart
final db = LingxiDatabase.forTesting(NativeDatabase.memory());
// 测试结束：await db.close();
```

- Repository 测试统一用 `NativeDatabase.memory()`，避免污染真实数据库。
- SecureStorage 测试用 mock（见 `test/data/services/secure_storage_test.dart`）。

### 测试覆盖要求

- **Repository 必须有测试**（每个 Repository 至少覆盖 CRUD 主路径）。
- **Service 必须有测试**（如 `StreakService`、`DataExportService`、`SecureLogInterceptor`）。
- **AI Provider 必须有测试**（用 `http_mock_adapter` mock dio 请求）。
- 新增功能时**必须**同步添加测试，PR 自检清单要求勾选"已为新增功能编写测试"。

### 运行命令

```bash
flutter test                          # 运行所有测试
flutter test test/data/               # 运行指定目录
flutter test --coverage               # 生成覆盖率报告（coverage/lcov.info）
```

---

## 代码风格与 lint 规则

### analysis_options.yaml 配置说明

- 继承 `package:flutter_lints/flutter.yaml`。
- 开启 **strict-casts / strict-inference / strict-raw-types** 三项严格分析。
- 排除 `**/*.g.dart` 与 `**/*.freezed.dart`（代码生成文件）。

### 常见 lint 规则解读

| 规则 | 说明 |
|------|------|
| `prefer_const_constructors` | 能用 const 构造就用 const |
| `prefer_const_declarations` | 能用 const 就不用 final |
| `prefer_final_locals` | 局部变量优先 final |
| `prefer_final_in_for_each` | for-each 循环变量优先 final |
| `avoid_print` | 禁止 `print`，用 `debugPrint` |
| `always_declare_return_types` | 必须声明返回类型 |
| `annotate_overrides` | 重写方法必须加 `@override` |
| `avoid_empty_else` | 禁止空 else |
| `avoid_unused_constructor_parameters` | 构造函数参数必须使用 |
| `require_trailing_commas` | 多行集合/参数列表必须尾随逗号 |

### const 使用建议

- 能 `const` 就 `const`：构造函数、列表、Map、Widget。
- `const` Widget 不会被重建，性能更优。
- 列表字面量优先 `const <Type>[]`。

### 避免 print

```dart
// ❌ 禁止
print('debug info');
// ✅ 推荐
debugPrint('debug info');
// ✅ 生产日志走 SecureLogInterceptor
```

### 提交前自检

```bash
flutter analyze   # 必须零 error、零 warning
```

- 已有 warning 需在 PR 中说明原因。
- **禁止**通过 `// ignore:` 注释绕过 lint 规则，除非有充分理由并在注释中说明。

---

## 提交规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### type 选择

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更（含 AGENTS.md / README / CONTRIBUTING） |
| `style` | 代码格式调整（不影响功能） |
| `refactor` | 代码重构（非新功能、非修复 Bug） |
| `test` | 测试相关 |
| `chore` | 构建、依赖、配置等杂项 |

### scope 选择

scope 取功能模块名，如 `chat`、`mascot`、`ai`、`database`、`router`、`theme`、`settings`、`learning`、`notes`、`progress`、`onboarding`。

### 中文 commit message 示例

```
feat(chat): 添加苏格拉底式对话引导模式

- 在 ChatController 中根据 socraticModeProvider 注入系统提示词
- 完成流式响应后联动吉祥物庆祝动画
- 新增 saveAsNote 方法支持将 AI 回复保存为笔记

Closes #42
```

```
fix(database): 修复课程进度同步问题

Progress 表 lastStudiedAt 未正确更新，导致 Streak 计数漏算
```

```
docs(agents): 新增 AGENTS.md AI 协作者规范文档
```

```
test(mascot): 补充 MascotController 彩蛋触发测试
```

---

## 分支策略

### main 分支保护

- `main` 分支为受保护分支，**禁止**直接 push。
- 所有变更通过 Pull Request 合并，需至少一人 review 通过。
- 合并前必须通过 `flutter analyze` + `flutter test`。

### feature 分支命名

格式：`<type>/<brief-description>`

| 示例 | 说明 |
|------|------|
| `feat/course-player` | 新功能：课程播放器 |
| `fix/splash-crash` | 修复：启动屏崩溃 |
| `docs/agents-md` | 文档：AGENTS.md |
| `refactor/chat-controller` | 重构：对话控制器 |
| `test/mascot` | 测试：吉祥物 |

### PR 流程

1. 从 `main` 切出 feature 分支。
2. 编写代码 + 测试，确保 `flutter analyze` 与 `flutter test` 通过。
3. 提交遵循 Conventional Commits。
4. 推送分支并在 GitHub 创建 PR，填写 PR 模板（见 `CONTRIBUTING.md`）。
5. 等待 review，根据反馈修改。
6. 合并后删除 feature 分支。

---

## 已知技术债与待优化项

> 以下为项目当前已知的不足，新增相关功能时**请勿**被这些现状误导为"约定"。

| 项 | 现状 | 待优化方向 |
|----|------|------------|
| 吉祥物动画 | `MascotPainter`（CustomPainter）作为 fallback，`RiveMascotWidget` 为目标方案，目前双轨并存 | 待 Rive `.riv` 资源完善后移除 CustomPainter fallback，统一走 Rive |
| 图表 | `fl_chart` 未引入，统计页图表用 `CustomPainter` 手绘 | 待引入 `fl_chart`，重写统计页图表 |
| 国际化 | UI 文案大量硬编码中文，仅 `app.dart` 配置了 `supportedLocales` 与 delegates | 待抽取 `intl` ARB 文件，启用 `flutter gen-l10n` |
| 课程内容 | 仅 L0 Python 示例课程，`assets/courses/` 内容单薄 | 待扩充更多课程（L1/L2、其他语言） |
| 数据导出 | `file_picker` / `share_plus` 未引入，导出仅写入应用文档目录返回路径 | 待引入 `share_plus` 支持系统分享，或 `file_picker` 支持自定义保存位置 |
| Riverpod 代码生成 | 已引入 `riverpod_generator` 但未广泛使用 `@riverpod` 注解，仍以手写 Provider 为主 | 待逐步迁移到代码生成风格 |
| ProviderType 扩展 | 枚举与 `_defaultBaseUrl`/`_defaultModel` 分离，新增类型需改多处 | 可考虑用枚举增强属性封装 |
| iOS / Linux | 不支持 | 当前不计划支持，PR 不要引入 iOS/Linux 专属依赖 |

---

## 常用命令速查

> 开发环境 Flutter SDK 路径：`C:\Users\23501\AppData\Local\Temp\flutter\bin\flutter.bat`
> CI 环境直接用 `flutter`（假定已加入 PATH）
> 以下示例统一写作 `flutter`，请按需替换为完整路径。

```bash
# 依赖
flutter pub get                                       # 安装依赖
flutter pub upgrade                                   # 升级依赖（谨慎）

# 代码生成（Drift / Riverpod / JSON）
flutter pub run build_runner build --delete-conflicting-outputs   # 生成 .g.dart
flutter pub run build_runner watch --delete-conflicting-outputs   # 监听模式

# 静态分析
flutter analyze                                       # 必须零 error/warning

# 测试
flutter test                                          # 运行所有测试
flutter test test/data/                               # 运行指定目录
flutter test --coverage                               # 生成覆盖率（coverage/lcov.info）

# 构建（release）
flutter build apk --release                           # Android
flutter build windows --release                       # Windows
flutter build macos --release                         # macOS

# 图标与启动屏
flutter pub run flutter_launcher_icons                # 生成应用图标
flutter pub run flutter_native_splash:create          # 生成启动屏
```

### 运行应用

```bash
flutter run -d <device-id>                            # 指定设备运行
flutter run -d windows                                # Windows 桌面
flutter run -d macos                                  # macOS 桌面
flutter run -d <android-device-id>                    # Android 设备
flutter devices                                       # 列出可用设备
```

---

## AI 协作建议

> 本节专门面向 AI 协作者（Trae/Claude/Cursor 等），帮助你高效、安全地参与本项目。

### 修改前

1. **先阅读 `AGENTS.md`（本文档）**，特别是"安全红线"章节。
2. **阅读相关代码**：不要凭文件名猜测实现，先 `Read` 实际文件理解上下文。
3. **大改动先写 spec**：涉及多文件、跨模块的改动，先在 `docs/` 下写一份设计文档（spec），经确认后再实现。
4. **复用现有模式**：新增 Repository/Provider/Widget 时，参考同类已有实现（如 `ConversationRepository`、`LingxiCard`），保持风格一致。

### 修改中

5. **并行任务用 Sub-Agent**：将独立的子任务（如写测试、写文档、写 UI）拆分给 Sub-Agent 并行执行。
6. **遵守命名与分层约定**：文件放对层，命名遵循上文规范。
7. **不修改已签名/加密相关的代码逻辑**（除非任务明确要求）：
   - `SecureStorageService`
   - `SecureLogInterceptor` 的脱敏逻辑
   - `ProviderConfig.toJson` 的字段过滤
   - `DataExportService` 的 apiKey 断言
   - `database.dart` 的 `storeDateTimeAsText`
8. **不引入新依赖**：除非任务明确要求，不要在 `pubspec.yaml` 添加新包。如确需添加，先确认是否支持 Android + Windows + macOS 三端。

### 修改后

9. **运行 `flutter analyze` 确认零错误**：任何 warning 都需在 PR 中说明。
10. **运行相关测试**：修改了 Repository/Service 必须运行对应测试；新增功能必须补测试。
11. **重新生成代码**：修改了 Drift 表定义或 Riverpod 注解后，运行 `flutter pub run build_runner build --delete-conflicting-outputs`。
12. **更新文档**：若修改了依赖版本、目录结构、安全相关逻辑，同步更新 `AGENTS.md` 对应章节。
13. **提交遵循 Conventional Commits**：中文 commit message，type/scope 准确。

### 禁止事项

- ❌ 不要在代码中硬编码真实 API Key（即使是测试用）。
- ❌ 不要 `print` 请求/响应内容（用 `debugPrint` + `SecureLogInterceptor`）。
- ❌ 不要绕过 `analysis_options.yaml` 的 lint 规则（除非有充分理由并注释说明）。
- ❌ 不要引入仅 iOS/Linux 可用的依赖。
- ❌ 不要直接 push 到 `main` 分支。
- ❌ 不要在未阅读相关代码的情况下"凭直觉"修改。

---

*本文档随项目演进持续更新。如有疑问或建议，提交 Issue 或在 PR 中讨论。*

---

## AI 助手行为规范（面向不同年龄段）

灵犀学院面向 K12 至大学阶段的学习者，AI 助手（苏格拉底对话）需根据用户画像中的 `ageGroup` 调整交互风格。

### 小学高年级 / 初中生（`ageGroup: young`）

| 维度 | 规范 |
|------|------|
| 语言 | 简洁通俗，句子不超过 20 字为宜 |
| 解释 | 大量使用生活类比（盒子→变量、自动贩卖机→函数） |
| 情感 | 鼓励为主，永远不说"错了"、"不对" |
| 节奏 | 每次只讲一个概念，确认理解再推进 |
| 游戏化 | 描述为"闯关"、"解谜"、增加趣味性 |

### 高中生 / 大学生（`ageGroup: advanced`）

| 维度 | 规范 |
|------|------|
| 语言 | 严谨但不晦涩，可使用术语但需首次出现时解释 |
| 解释 | 深度追问、举一反三、引导发现概念间关联 |
| 情感 | 尊重为主，鼓励独立思考和质疑 |
| 节奏 | 允许深度讨论，适度挑战舒适区 |
| 学术性 | 可引入设计模式、时间复杂度等进阶概念 |

### 统一底线（所有年龄段）

- **不输出有害、歧视或不当内容**
- **不替代完成作业**：引导思考为主，即使学习者直接索要答案
- **困惑降级**：连续 3 次无法回答时，自动切换为直接解答模式并提示
- **安全边界**：不讨论非学习相关话题；超出课程范围时引导回到学习路径

### 对应实现

- 提示词文件：`assets/prompts/socratic_young_learner.md`、`assets/prompts/socratic_advanced.md`
- 代码入口：`PromptManager.getSystemPrompt(socraticMode: true, ageGroup: ...)`
- 数据来源：`LearnerProfiles` 表的 `ageGroup` 字段

---

## 课程内容编写规范

社区贡献者或 AI 协作者创建新课程内容时，需遵循以下规范。

### JSON 结构要求

- **校验**：所有课程 JSON 必须通过 `assets/courses/schema.json` 的 JSON Schema 校验
- **ID 规范**：使用层级命名 `{level}_{module}_{lesson}_{kp}`，如 `l0_m1_l1_kp1`
- **排序**：`order` 字段从 1 开始，不要跳号

### 知识点粒度标准

| 字段 | 要求 |
|------|------|
| `estimatedMinutes` | 5-15 分钟可学完一个知识点 |
| `difficulty` | 1-5 递增，同一课时内难度应逐步提升 |
| `prerequisites` | 列出前置知识点 ID，避免循环依赖 |
| `coreExplanation` | 3-5 句话说清核心概念，不超过 200 字 |
| `whyItMatters` | 解释"为什么要学这个"，与实际应用建立连接 |

### 测验设计规范

- 每个知识点至少 3 道测验题
- 题型分布：单选为主 + 至少 1 道填空/多选
- 难度梯度：第 1 题考基本概念 → 第 2 题考应用 → 第 3 题考辨析
- `explanation` 必填且详尽，告诉学习者"为什么对/为什么错"

### 苏格拉底种子问题编写技巧

- 问题应该是开放性的，不能简单回答 YES/NO
- 应引导学习者思考"为什么"而非"是什么"
- 好的种子问题："为什么 Python 不需要声明变量类型？"
- 坏的种子问题："Python 需要声明变量类型吗？"

---

## 吉祥物交互扩展规范

### 新场景接入规则

新页面或功能需要接入吉祥物时：
1. 使用 `ref.read(mascotControllerProvider.notifier)` 控制情绪
2. 不要在页面内自行管理吉祥物状态
3. 情绪切换后设置定时恢复（happy: 1.5s、celebrate: 3s）
4. 所有 `Future.delayed` 回调中必须判断 `mounted`

### 情绪触发优先级

当多个事件同时触发时，按以下优先级：

1. `sad`（AI 出错）— 最高优先级
2. `celebrate`（完成成就/彩蛋）
3. `thinking`（AI 请求中）
4. `happy`（用户点击/streak≥3）
5. `curious`（预留：进入新页面）
6. `idle`（默认恢复状态）

### 动画时长标准

| 状态 | 持续时间 | 恢复目标 |
|------|----------|----------|
| happy | 1.5s | idle |
| celebrate | 3.0s | idle |
| thinking | 不定（跟随 AI 响应） | celebrate/sad |
| sad | 不自动恢复 | 等待下次交互 |
| curious | 2.0s | idle |

---

## 性能预算

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| 首屏渲染 | <1.5s | 从 main() 到 HomePage 首帧 |
| 流式首 token | <500ms（网络延迟除外） | 从发送到 TextDeltaEvent 首次 emit |
| 内存占用 | <200MB | Release 模式下正常使用峰值 |
| 列表滚动 | 60fps | 对话列表/课程列表不丢帧 |
| 动画帧率 | 60fps | `PerformanceOverlay` 不出现红条 |
| 数据库查询 | <50ms | 单次 Repository 方法调用 |
| 课程加载 | <200ms | getAllCourses() 含 JSON 解析 |

### 性能优化策略

- 流式响应使用 50ms 节流，避免频繁 setState
- 课程数据内存缓存，避免重复 IO
- 图片使用适当分辨率，避免过大资源
- 长列表使用 `ListView.builder` 懒加载
- 减少动效模式（`MediaQuery.disableAnimations`）时跳过所有动画
