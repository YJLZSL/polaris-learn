/// AI Provider 抽象接口与相关数据模型。
///
/// 该文件定义了所有 AI 服务商（OpenAI 兼容、Anthropic、Gemini、Ollama 等）
/// 必须遵循的统一接口 [AiProvider]，以及聊天所需的 [ChatMessage]、
/// [ChatOptions] 数据模型和流式响应事件 [AiStreamEvent] 体系。
///
/// 设计目标：
/// - 屏蔽不同 AI 服务商 API 差异，业务层只面向 [AiProvider] 编程。
/// - 统一流式响应模型（[AiStreamEvent]），便于上层 UI 增量渲染。
/// - 支持请求取消与连接测试。
library;

/// 聊天消息角色。
///
/// - [system]：系统提示词（设定助手行为）
/// - [user]：用户消息
/// - [assistant]：助手回复
enum MessageRole { system, user, assistant }

/// 聊天消息模型。
///
/// 不可变值对象，由 [role] 与 [content] 两个字段构成。
/// 提供三个命名构造函数 [ChatMessage.user]、[ChatMessage.assistant]、
/// [ChatMessage.system] 便于构造常用角色消息。
class ChatMessage {
  const ChatMessage({required this.role, required this.content});

  /// 用户消息。
  factory ChatMessage.user(String content) =>
      ChatMessage(role: MessageRole.user, content: content);

  /// 助手消息。
  factory ChatMessage.assistant(String content) =>
      ChatMessage(role: MessageRole.assistant, content: content);

  /// 系统消息。
  factory ChatMessage.system(String content) =>
      ChatMessage(role: MessageRole.system, content: content);

  /// 消息角色。
  final MessageRole role;

  /// 消息文本内容。
  final String content;
}

/// 聊天请求选项。
///
/// 控制生成行为与传输方式：
/// - [temperature]：采样温度，越高越随机。
/// - [maxTokens]：单次生成的最大 token 数。
/// - [systemPrompt]：系统提示词，若不为空会被注入到请求体中。
/// - [stream]：是否流式返回，默认 true。
class ChatOptions {
  const ChatOptions({
    this.temperature,
    this.maxTokens,
    this.systemPrompt,
    this.stream = true,
  });

  final double? temperature;
  final int? maxTokens;
  final String? systemPrompt;
  final bool stream;
}

/// AI 流式响应事件（sealed 类型，便于上层 exhaustive 模式匹配）。
///
/// - [TextDeltaEvent]：内容增量（一个或多个字符）
/// - [UsageEvent]：token 用量统计（在 [DoneEvent] 之前 emit）
/// - [DoneEvent]：流式结束（正常完成）
/// - [ErrorEvent]：流式过程中发生错误
sealed class AiStreamEvent {
  const AiStreamEvent();
}

/// 文本增量事件。
///
/// 携带本次增量文本 [delta]，UI 层应将其追加到当前消息末尾。
class TextDeltaEvent extends AiStreamEvent {
  const TextDeltaEvent(this.delta);

  /// 本次增量文本。
  final String delta;
}

/// 流式响应完成时的 token 用量事件。
///
/// 通常在 [DoneEvent] 之前 emit 一次。若服务商或模型不返回 usage 字段，
/// 则不会 emit 该事件，上层应将 token 数视作 0。
class UsageEvent extends AiStreamEvent {
  const UsageEvent({
    required this.promptTokens,
    required this.completionTokens,
    required this.totalTokens,
  });

  /// 提示词 token 数。
  final int promptTokens;

  /// 补全 token 数。
  final int completionTokens;

  /// 总 token 数（通常为 promptTokens + completionTokens）。
  final int totalTokens;
}

/// 流式结束事件，表示模型已生成完毕。
class DoneEvent extends AiStreamEvent {
  const DoneEvent();
}

/// 流式错误事件，携带错误描述信息。
class ErrorEvent extends AiStreamEvent {
  const ErrorEvent(this.message);

  /// 错误描述。
  final String message;
}

/// AI Provider 抽象接口。
///
/// 所有具体 AI 服务商实现均需实现该接口。业务层只依赖此抽象，不直接耦合
/// 具体 Provider，便于后续扩展新的服务商（例如国内厂商）。
abstract class AiProvider {
  /// 流式聊天。
  ///
  /// 输入 [messages] 与 [options]，返回 [AiStreamEvent] 流。
  /// 流必须以 [DoneEvent] 或 [ErrorEvent] 终止；正常完成时 emit [DoneEvent]，
  /// 出错时 emit [ErrorEvent]。被 [cancel] 取消时流应静默结束（不抛异常）。
  Stream<AiStreamEvent> chatStream({
    required List<ChatMessage> messages,
    required ChatOptions options,
  });

  /// 非流式聊天。
  ///
  /// 内部聚合 [chatStream] 的所有 [TextDeltaEvent]，返回完整文本。
  /// 若流中出现 [ErrorEvent]，应抛出异常。
  Future<String> chat({
    required List<ChatMessage> messages,
    required ChatOptions options,
  });

  /// 取消当前请求。
  ///
  /// 调用后正在进行的 [chatStream] 流应尽快终止，且不抛出异常。
  void cancel();

  /// 测试连接是否可用。
  ///
  /// 实现应发送一次极小的探测请求，返回 true 表示连通且鉴权通过。
  Future<bool> testConnection();
}
