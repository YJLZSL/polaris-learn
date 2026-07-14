# Checklist — 后端可靠性与功能完善

> 验证 spec 中每个需求是否实现。逐条检查代码，通过后勾选。

---

## 阶段一：数据层修复

- [x] `ConversationRepository.deleteConversation` 用事务包裹，先删 Messages 再删 Conversations
- [x] `ConversationRepository` 存在 `getConversation(String id)` 精确查询方法，不全表加载
- [x] `ConversationRepository.getAllConversations` 支持 `limit` / `offset` 分页参数
- [x] `ConversationRepository` 存在 `count()` 方法
- [x] `MessageRepository.getMessages` 支持 `limit` / `offset` 分页参数
- [x] `MessageRepository` 存在 `count(String conversationId)` 方法
- [x] `NoteRepository.getAllNotes` 支持 `limit` / `offset` 分页参数
- [x] `NoteRepository` 存在 `count()` 方法
- [x] `ProviderConfigRepository.testConnection` 死代码已删除
- [x] `repositories_test.dart` 覆盖级联删除、精确查询、分页
- [x] `StreakService.recordStudyActivity` 的 delete+insert 用 `_db.transaction` 包裹
- [x] `streak_service_test.dart` 验证事务原子性
- [x] `DataExportService.importAll` 用 `db.transaction` 包裹
- [x] `DataExportService.exportAll` 不再 N+1 查询（先取全部 Messages 再内存分组）
- [x] `DataExportService._parseDate` 解析失败返回 null 而非 DateTime.now()
- [x] `data_export_test.dart` 验证导入事务回滚

## 阶段二：AI 引擎增强

- [x] `lib/features/ai/ai_error_mapper.dart` 存在公共错误映射函数
- [x] 四个 Provider 的 Dio 设置了 `connectTimeout: 30s` / `receiveTimeout: 5min` / `sendTimeout: 30s`
- [x] 四个 Provider 的 `chatStream` catch 块使用 `AiErrorMapper.mapException` 返回中文错误
- [x] `lib/features/ai/retry_interceptor.dart` 实现指数退避重试（maxRetries 3，间隔 500ms/1s/2s）
- [x] RetryInterceptor 仅重试 connectionError/timeout/5xx，cancel 不重试
- [x] 四个 Provider 的 Dio 注入了 `SecureLogInterceptor`
- [x] 四个 Provider 的 Dio 注入了 `RetryInterceptor`
- [x] `AiProviderRegistry` 创建 Provider 时确保 Dio 已注入两个 Interceptor
- [x] `providers_test.dart` 验证超时与错误映射
- [x] `AiStreamEvent` 增加 `UsageEvent` 类型
- [x] 四个 Provider 解析流式 `usage` 字段并 emit `UsageEvent`
- [x] `OpenAICompatibleProvider` 解析 `reasoning_content` 字段
- [x] `ChatController._commitAssistant` 接收 `UsageEvent` 并写入 `Messages.tokens`
- [x] `ChatController` state 暴露当前对话累计 token 数
- [x] `providers_test.dart` 验证 usage 解析
- [x] `chat_controller_test.dart` 验证 token 写入
- [x] `ChatController.sendMessage` 从 `ProviderConfig` 读取 temperature/maxTokens（非硬编码 0.7）
- [x] `ChatController` 创建 Conversation 时填充 `provider` 和 `model` 字段
- [x] `AiProviderRegistry` 存在 `invalidateCache()` 方法
- [x] `ApiSettingsPage` 保存配置后调用 `ref.invalidate(currentAiProviderProvider)`
- [x] `ChatController.sendMessage` 发送前校验 Provider 可用性，不可用时不落盘
- [x] `ChatController._finishStreamingWithError` 保留已接收内容（若非空则落盘）
- [x] `chat_controller_test.dart` 验证参数传递与 Provider 缺失场景

## 阶段三：业务逻辑完善

- [x] `PromptManager.loadPrompts` 有 try-catch，失败时使用内置兜底提示词
- [x] `SseTransformer._parseString` 剥离 UTF-8 BOM
- [x] `sse_transformer_test.dart` 验证 BOM 处理
- [x] `prompt_manager_test.dart` 验证兜底逻辑
- [x] `AchievementService.checkAndUnlockByEvent` 用 `course.level == CourseLevel.l0` 判断（非字符串包含）
- [x] `socraticModeProvider` 改为 StateNotifier，setter 中同步写入 SharedPreferences
- [x] `achievement_service_test.dart` 验证枚举级别判断
- [x] `socratic_mode_persistence_test.dart` 验证持久化
- [x] `CourseRepository._loadCourseFiles` 读取 `AssetManifest.json` 动态过滤课程文件
- [x] `CourseRepository` 暴露 `clearCache()` 方法
- [x] `ChatController._flushTimer` 每次 delta 时 cancel+reset
- [x] `course_repository_test.dart` 验证动态清单

## 阶段四：测试补齐

- [x] `test/features/settings/api_test_service_test.dart` 覆盖 401/403/429/500/超时/网络断开
- [x] `test/features/ai/prompt_manager_test.dart` 覆盖正常加载与兜底场景
- [x] `test/secure_log_interceptor_test.dart` 增加边界场景（密钥含空格/Unicode/嵌套 JSON）
- [x] `test/features/ai/providers_test.dart` 增加 reasoning_content 解析测试
- [ ] `flutter analyze` 零错误
- [ ] `flutter test` 全部通过

---

## 跨阶段验收

- [x] 删除对话后数据库中无孤儿消息
- [x] AI 请求超时后自动重试，全失败后显示中文错误
- [x] SecureLogInterceptor 已注入所有 Provider（grep 验证）
- [x] token 用量写入 Messages.tokens（非 0）
- [x] 用户配置的 temperature 生效（非硬编码 0.7）
- [x] socraticMode 重启后恢复
- [x] Provider 配置修改后立即生效（无需重启）
- [x] 流式错误时已接收内容不丢失
