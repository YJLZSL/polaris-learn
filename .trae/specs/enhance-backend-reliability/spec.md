# 后端可靠性与功能完善 Spec

## Why
前端界面重构已完成，但后端（数据层 + AI 引擎 + 业务逻辑层）存在多个影响功能正确性和用户体验的问题：删除对话产生孤儿消息、Streak 写入非原子、AI 请求无超时无重试、SecureLogInterceptor 未注入、Provider 配置参数被忽略、token 用量未统计等。需系统性修复以确保后端健壮性。

## What Changes
- 删除对话时级联删除消息（事务包裹）
- Streak 记录改用事务保证原子性
- ChatController 增加 `getConversation(id)` 精确查询，避免全表加载
- 移除 `ProviderConfigRepository.testConnection` 死代码
- ChatController 在发送前校验 Provider 可用性，失败时回滚已落盘消息
- 所有 AI Provider 的 Dio 配置超时（connectTimeout 30s / receiveTimeout 5min）
- AI 请求失败引入指数退避重试（maxRetries 3）
- SecureLogInterceptor 注入所有 Provider 的 Dio 实例
- Repository 增加分页查询（limit/offset）与 count 方法
- AI Provider 解析流式 usage 字段，写入 Messages.tokens
- ChatController 传递 ProviderConfig 的 temperature/maxTokens
- 错误消息中文化（抽取公共映射函数）
- AchievementService 用 CourseLevel 枚举判断级别
- DataImportService 导入改用事务
- PromptManager 加载失败时兜底
- ChatController 流式错误时保留已接收内容
- socraticModeProvider 持久化到 SharedPreferences
- Conversations.provider/model 字段在创建时填充
- AiProviderRegistry 缓存在配置变更时失效
- 课程文件清单改为动态读取 AssetManifest
- SseTransformer 处理 UTF-8 BOM
- OpenAICompatibleProvider 解析 reasoning_content
- 补充 ApiTestService / PromptManager 单元测试

## Impact
- Affected specs: build-lingxi-academy（数据层、AI 引擎、业务逻辑层）
- Affected code:
  - `lib/data/repositories/` — 8 个 Repository 增加分页、级联删除、精确查询
  - `lib/data/db/database.dart` — MigrationStrategy 完善
  - `lib/features/ai/` — 4 个 Provider 超时/重试/日志注入/usage 解析
  - `lib/features/chat/chat_controller.dart` — Provider 校验、参数传递、错误回滚
  - `lib/features/progress/streak_service.dart` — 事务包裹
  - `lib/features/progress/achievement_service.dart` — CourseLevel 判断
  - `lib/features/settings/data_export_service.dart` — 导入事务
  - `lib/features/ai/prompt_manager.dart` — 兜底逻辑
  - `lib/core/providers/app_providers.dart` — socraticMode 持久化
  - `test/` — 补充测试

## ADDED Requirements

### Requirement: 级联删除与事务安全
系统 SHALL 在删除对话时同步删除关联消息，使用数据库事务保证原子性。

#### Scenario: 删除对话
- **WHEN** 用户删除一条对话
- **THEN** 该对话及其所有消息在单个事务中被删除，不留孤儿数据

### Requirement: AI 请求超时与重试
系统 SHALL 为所有 AI Provider 配置连接超时（30s）和接收超时（5min），并对可重试错误（网络错误、5xx）执行最多 3 次指数退避重试。

#### Scenario: 网络超时
- **WHEN** AI 请求连接超时
- **THEN** 系统自动重试最多 3 次（间隔 500ms/1s/2s），全部失败后向用户显示"连接超时，请稍后重试"

#### Scenario: 用户取消
- **WHEN** 用户在流式响应中途点击停止
- **THEN** 请求立即取消，不触发重试，已接收内容保留

### Requirement: Token 用量统计
系统 SHALL 解析 AI 流式响应中的 usage 字段，将 token 数量持久化到 Messages.tokens，并在对话页显示累计用量。

#### Scenario: 流式响应完成
- **WHEN** AI 流式响应返回 usage 字段
- **THEN** prompt_tokens + completion_tokens 写入 Messages.tokens

### Requirement: Provider 配置参数传递
系统 SHALL 将用户在 ProviderEditDialog 中配置的 temperature 和 maxTokens 传递给 AI 请求。

#### Scenario: 自定义温度
- **WHEN** 用户设置 Provider temperature 为 0.3
- **THEN** 对话请求使用 temperature=0.3，而非硬编码 0.7

### Requirement: 错误消息中文化
系统 SHALL 将 AI 请求的 DioException 转换为用户友好的中文错误消息。

#### Scenario: 鉴权失败
- **WHEN** API 返回 401
- **THEN** 用户看到"鉴权失败，请检查 API Key"

### Requirement: SecureLogInterceptor 注入
系统 SHALL 为所有 AI Provider 的 Dio 实例注入 SecureLogInterceptor，确保 HTTP 日志脱敏。

#### Scenario: Provider 创建
- **WHEN** AiProviderRegistry 创建新 Provider 实例
- **THEN** 该 Provider 的 Dio 已添加 SecureLogInterceptor

## MODIFIED Requirements

### Requirement: Repository 分页查询
ConversationRepository / MessageRepository / NoteRepository SHALL 提供 limit/offset 分页参数和 count() 方法，避免大数据量全量加载。

### Requirement: ChatController 发送流程
ChatController.sendMessage SHALL 在发送前校验 Provider 可用性，失败时不落盘用户消息；流式错误时保留已接收内容并标记为未完成。

### Requirement: socraticMode 持久化
socraticModeProvider SHALL 在切换后立即持久化到 SharedPreferences，重启后恢复。

### Requirement: Provider 缓存失效
AiProviderRegistry SHALL 在 Provider 配置变更时失效缓存，确保修改 baseUrl/apiKey 后立即生效。

## REMOVED Requirements

### Requirement: ProviderConfigRepository.testConnection
**Reason**: 返回 true 的死代码，ApiTestService 已提供完整实现
**Migration**: 删除该方法，调用方统一使用 apiTestServiceProvider
