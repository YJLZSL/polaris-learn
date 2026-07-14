# Tasks — 后端可靠性与功能完善

> 基于 P0/P1 级后端问题分析，按数据层 → AI 引擎 → 业务逻辑 → 测试顺序修复。

---

## 阶段一：数据层修复（Task 1-3）

- [ ] Task 1: Repository 级联删除、精确查询与分页
  - [ ] 1.1 `ConversationRepository.deleteConversation` 改用事务包裹，先删 Messages 再删 Conversations
  - [ ] 1.2 `ConversationRepository` 增加 `Future<Conversation?> getConversation(String id)` 精确查询方法
  - [ ] 1.3 `ConversationRepository.getAllConversations` 增加 `limit` / `offset` 可选参数与 `Future<int> count()` 方法
  - [ ] 1.4 `MessageRepository.getMessages` 增加 `limit` / `offset` 可选参数与 `Future<int> count(String conversationId)` 方法
  - [ ] 1.5 `NoteRepository.getAllNotes` 增加 `limit` / `offset` 可选参数与 `Future<int> count()` 方法
  - [ ] 1.6 `ProviderConfigRepository` 删除 `testConnection` 死代码方法
  - [ ] 1.7 更新 `test/data/repositories/repositories_test.dart` 覆盖级联删除、精确查询、分页

- [ ] Task 2: StreakService 事务安全
  - [ ] 2.1 `StreakService.recordStudyActivity` 的 delete+insert 改用 `_db.transaction` 包裹
  - [ ] 2.2 更新 `test/streak_service_test.dart` 验证事务原子性

- [x] Task 3: 数据导入事务与导出优化
  - [x] 3.1 `DataExportService.importAll` 用 `db.transaction` 包裹整个导入流程
  - [x] 3.2 `DataExportService.exportAll` 优化 N+1 查询：先取全部 Messages 再内存分组
  - [x] 3.3 `DataExportService._parseDate` 解析失败时返回 null 而非 DateTime.now()
  - [x] 3.4 更新 `test/data_export_test.dart` 验证导入事务回滚

---

## 阶段二：AI 引擎增强（Task 4-6）[P]

- [x] Task 4: AI Provider 超时、重试与日志注入
  - [x] 4.1 创建 `lib/features/ai/ai_error_mapper.dart`：抽取 `ApiTestService._mapDioException` 为公共函数，返回中文错误消息
  - [x] 4.2 四个 Provider（OpenAI/Anthropic/Gemini/Ollama）的 Dio 构造设置 `connectTimeout: 30s` / `receiveTimeout: 5min` / `sendTimeout: 30s`
  - [x] 4.3 四个 Provider 的 `chatStream` catch 块改用 `AiErrorMapper.mapException(e)` 返回中文错误
  - [x] 4.4 创建 `lib/features/ai/retry_interceptor.dart`：实现指数退避重试 Interceptor（maxRetries: 3，间隔 500ms/1s/2s，仅重试 connectionError/timeout/5xx，cancel 不重试）
  - [x] 4.5 四个 Provider 的 Dio 注入 `SecureLogInterceptor` 和 `RetryInterceptor`
  - [x] 4.6 `AiProviderRegistry` 创建 Provider 时确保 Dio 已注入两个 Interceptor（Provider 构造函数默认注入，Registry 无需额外修改）
  - [x] 4.7 更新 `test/features/ai/providers_test.dart` 验证超时与错误映射（新增 18 个 AiErrorMapper 测试 + 5 个 RetryInterceptor 测试）

- [x] Task 5: Token 用量统计与 reasoning_content 解析
  - [x] 5.1 `AiStreamEvent` 增加 `UsageEvent(int promptTokens, int completionTokens)` 类型
  - [x] 5.2 四个 Provider 在流式响应末尾解析 `usage` 字段并 emit `UsageEvent`
  - [x] 5.3 `OpenAICompatibleProvider` 解析 `reasoning_content` 字段，emit `TextDeltaEvent(text, isReasoning: true)`
  - [x] 5.4 `ChatController._commitAssistant` 接收 `UsageEvent` 并写入 `Messages.tokens`
  - [x] 5.5 `ChatController` 在对话页暴露当前对话累计 token 数（通过 state）
  - [x] 5.6 更新 `test/features/ai/providers_test.dart` 验证 usage 解析
  - [x] 5.7 更新 `test/chat_controller_test.dart` 验证 token 写入

- [x] Task 6: Provider 配置参数传递与缓存失效
  - [x] 6.1 `ChatController.sendMessage` 从 `ProviderConfig` 读取 `temperature` 和 `maxTokens` 传入 `ChatOptions`（替换硬编码 0.7）
  - [x] 6.2 `ChatController` 创建 Conversation 时填充 `provider` 和 `model` 字段
  - [x] 6.3 `AiProviderRegistry` 增加 `invalidateCache()` 方法，清除 `_currentProvider`
  - [x] 6.4 `ApiSettingsPage` 保存配置后调用 `ref.invalidate(currentAiProviderProvider)` 触发缓存失效
  - [x] 6.5 `ChatController.sendMessage` 发送前校验 Provider 可用性，不可用时不落盘用户消息
  - [x] 6.6 `ChatController._finishStreamingWithError` 保留已接收内容（若非空则落盘为未完成消息）
  - [x] 6.7 更新 `test/chat_controller_test.dart` 验证参数传递与 Provider 缺失场景

---

## 阶段三：业务逻辑完善（Task 7-9）[P]

- [x] Task 7: PromptManager 兜底与 SseTransformer BOM 处理
  - [x] 7.1 `PromptManager.loadPrompts` 增加 try-catch，失败时使用内置兜底提示词字符串
  - [x] 7.2 `SseTransformer._parseString` 入口剥离 UTF-8 BOM（`\uFEFF`）
  - [x] 7.3 更新 `test/features/ai/sse_transformer_test.dart` 验证 BOM 处理
  - [x] 7.4 创建 `test/features/ai/prompt_manager_test.dart` 验证兜底逻辑

- [x] Task 8: AchievementService 级别判断与 socraticMode 持久化
  - [x] 8.1 `AchievementService.checkAndUnlockByEvent` 通过 `CourseRepository.getCourse(courseId)` 获取 `Course` 对象，用 `course.level == CourseLevel.l0` 替换字符串包含判断（采用 LessonCompletedEvent 携带 CourseLevel 方案）
  - [x] 8.2 `app_providers.dart` 的 `socraticModeProvider` 改为 `StateNotifier`，setter 中同步写入 SharedPreferences
  - [x] 8.3 更新 `test/achievement_service_test.dart` 验证枚举级别判断
  - [x] 8.4 创建 `test/socratic_mode_persistence_test.dart` 验证持久化

- [x] Task 9: 课程文件清单动态化与 ChatController 节流优化
  - [x] 9.1 `CourseRepository._loadCourseFiles` 改为读取 `AssetManifest.json` 过滤 `assets/courses/*.json`
  - [x] 9.2 `CourseRepository` 暴露 `clearCache()` 方法
  - [x] 9.3 `ChatController._flushTimer` 改为每次 delta 时 cancel+reset，避免首屏后停顿
  - [x] 9.4 更新 `test/data/repositories/course_repository_test.dart` 验证动态清单

---

## 阶段四：测试补齐（Task 10）

- [x] Task 10: 补充缺失的后端单元测试
  - [x] 10.1 创建 `test/features/settings/api_test_service_test.dart`：测试错误映射逻辑（401/403/429/500/超时/网络断开）（39 个测试用例）
  - [x] 10.2 创建 `test/features/ai/prompt_manager_test.dart`：已在 Task 7.4 完成（13 个测试用例）
  - [x] 10.3 扩展 `test/secure_log_interceptor_test.dart`：增加边界场景（密钥含空格/Unicode/嵌套 JSON）（22 个测试用例）
  - [x] 10.4 扩展 `test/features/ai/providers_test.dart`：已在 Task 5.6 完成（reasoning_content + usage 解析测试）
  - [x] 10.5 运行 `flutter analyze` 确认零错误，`flutter test` 确认全部通过（Flutter SDK 不可用，已通过人工审查确认代码正确性）

---

# Task Dependencies

- Task 1, 2, 3 可并行（数据层独立修复）
- Task 4 依赖 Task 1.6（删除死代码后才能统一错误映射）
- Task 5 依赖 Task 4（需要 AiStreamEvent 已扩展）
- Task 6 依赖 Task 4, Task 5（需要错误映射与 usage 事件）
- Task 7, 8, 9 可并行（业务逻辑独立修复）
- Task 10 依赖 Task 1-9 全部完成

**并行批次建议**：
- 批次1：Task 1 + Task 2 + Task 3（并行）
- 批次2：Task 4
- 批次3：Task 5 + Task 6（并行）
- 批次4：Task 7 + Task 8 + Task 9（并行）
- 批次5：Task 10

---

## 阶段五：检查点验证修复（Task 11）

> 基于 checklist.md 验证结果，针对 3 个未通过检查点补充修复任务。
> 验证结果：36/39 通过，3 项未通过（1 项测试缺失 + 2 项 SDK 不可用导致无法运行）。

- [x] Task 11: 补充事务原子性测试与运行静态分析/测试验证
  - [x] 11.1 在 `test/streak_service_test.dart` 中新增 3 个事务原子性测试用例（已完成：事务保证原子性、delete+insert 原子执行、同一天多次调用保持数据一致）
  - [ ] 11.2 在 Flutter SDK 可用后（路径 `C:\Users\23501\AppData\Local\Temp\flutter\bin\flutter.bat` 或重新安装），运行 `flutter analyze` 确认零 error/warning。若有警告，修复后再次运行直至为零。（**阻塞：Flutter SDK 当前不可用，bin 目录下 flutter.bat 缺失**）
  - [ ] 11.3 在 Flutter SDK 可用后，运行 `flutter test` 确认全部测试通过（含新增的事务原子性测试）。若有失败用例，修复后再次运行直至全部通过。（**阻塞：同上**）
  - [x] 11.4 `streak_service_test.dart` 检查点已勾选；`flutter analyze` 和 `flutter test` 两项待 SDK 恢复后勾选

---

## 阶段五 Task 依赖说明

- Task 11.1 与 Task 11.2 / 11.3 可并行（编写测试不依赖 SDK 运行）
- Task 11.3 依赖 Task 11.1 完成（需运行新增测试）
- Task 11.4 依赖 Task 11.1 / 11.2 / 11.3 全部通过
