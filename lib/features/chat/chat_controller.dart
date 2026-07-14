import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/data/providers/storage_providers.dart';
import 'package:lingxi_academy/data/repositories/message_repository.dart';
import 'package:lingxi_academy/features/ai/ai_provider.dart';
import 'package:lingxi_academy/features/ai/ai_providers.dart';
import 'package:lingxi_academy/features/ai/prompt_manager.dart';
import 'package:lingxi_academy/features/mascot/mascot_controller.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';

/// 对话控制器状态。
class ChatControllerState {
  const ChatControllerState({
    this.messages = const <ChatMessage>[],
    this.isStreaming = false,
    this.currentAssistantText = '',
    this.conversationId,
    this.conversationTitle = '新对话',
    this.currentTokens = 0,
    this.error,
  });

  /// 已落盘的聊天消息（含用户与助手，按时间正序）。
  final List<ChatMessage> messages;

  /// 是否正在接收流式响应。
  final bool isStreaming;

  /// 当前流式响应的累计文本（流式过程中持续更新，50ms 节流）。
  final String currentAssistantText;

  /// 当前对话 id，null 表示尚未创建。
  final String? conversationId;

  /// 当前对话标题。
  final String conversationTitle;

  /// 当前对话累计 token 数（每次 [UsageEvent] 累加）。
  final int currentTokens;

  /// 最近一次错误信息，null 表示无错误。
  final String? error;

  /// 派生新状态。
  ///
  /// [clearError] 为 true 时将 [error] 置为 null，用于发送新消息时清空旧错误。
  ChatControllerState copyWith({
    List<ChatMessage>? messages,
    bool? isStreaming,
    String? currentAssistantText,
    String? conversationId,
    String? conversationTitle,
    int? currentTokens,
    String? error,
    bool clearError = false,
  }) {
    return ChatControllerState(
      messages: messages ?? this.messages,
      isStreaming: isStreaming ?? this.isStreaming,
      currentAssistantText: currentAssistantText ?? this.currentAssistantText,
      conversationId: conversationId ?? this.conversationId,
      conversationTitle: conversationTitle ?? this.conversationTitle,
      currentTokens: currentTokens ?? this.currentTokens,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// 对话控制器：管理消息收发、流式渲染、持久化与吉祥物联动。
///
/// 流式响应采用 50ms 节流刷新 UI，避免高频 delta 导致卡顿。
/// 用户与助手消息均落盘到 [MessageRepository]，对话首次发送时自动
/// 创建 [Conversations] 记录。
class ChatController extends StateNotifier<ChatControllerState> {
  ChatController(this._ref) : super(const ChatControllerState());

  final Ref _ref;

  /// 流式响应节流计时器（50ms）。
  Timer? _flushTimer;

  /// 已刷新到状态中的流式文本。
  final StringBuffer _flushed = StringBuffer();

  /// 待刷新的流式文本缓冲。
  final StringBuffer _pending = StringBuffer();

  /// 当前流式订阅，用于停止与清理。
  StreamSubscription<AiStreamEvent>? _streamSub;

  /// 提交守卫，防止 DoneEvent 与 stream onDone 同时触发导致重复提交。
  bool _completing = false;

  /// 最近一次响应的 token 用量（在 [UsageEvent] 中接收，[DoneEvent] 后落盘）。
  int _lastUsageTokens = 0;

  /// 发送一条用户消息并触发 AI 流式响应。
  ///
  /// 流程：
  /// 1. 校验 AI Provider 可用性（不可用则直接返回，不创建对话/消息）；
  /// 2. 读取当前 ProviderConfig 获取 temperature/maxTokens 与 provider/model 元信息；
  /// 3. 若对话不存在则创建（填充 provider/model）；
  /// 4. 持久化用户消息；
  /// 5. 联动吉祥物思考态；
  /// 6. 注入系统提示词（按苏格拉底开关）发起流式请求；
  /// 7. 监听增量、完成、错误事件。
  Future<void> sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || state.isStreaming) return;

    // 1. 先校验 Provider 可用性（在创建 Conversation / addMessage 之前）。
    final AiProvider? provider =
        await _ref.read(currentAiProviderProvider.future);
    if (provider == null) {
      state = state.copyWith(
        error: '暂无可用 AI 服务，请先在设置中配置。',
        isStreaming: false,
      );
      _ref.read(mascotControllerProvider.notifier).setMood(MascotMood.sad);
      return;
    }

    // 2. 读取当前 ProviderConfig（用于 temperature/maxTokens 与对话元信息）。
    final config = await _ref
        .read(providerConfigRepositoryProvider)
        .getDefaultProvider();

    final mascot = _ref.read(mascotControllerProvider.notifier);
    final convRepo = _ref.read(conversationRepositoryProvider);
    final msgRepo = _ref.read(messageRepositoryProvider);

    // 3. 确保 conversation 存在（填充 provider/model）。
    var conversationId = state.conversationId;
    if (conversationId == null) {
      final title = trimmed.length > 20 ? trimmed.substring(0, 20) : trimmed;
      final conv = await convRepo.createConversation(
        title,
        provider: config?.providerType.value,
        model: config?.model,
      );
      conversationId = conv.id;
      state = state.copyWith(
        conversationId: conversationId,
        conversationTitle: conv.title,
      );
    }

    // 4. 持久化用户消息并追加到状态。
    await msgRepo.addMessage(conversationId, 'user', trimmed);
    final userMsg = ChatMessage.user(trimmed);
    state = state.copyWith(
      messages: <ChatMessage>[...state.messages, userMsg],
      clearError: true,
    );

    // 5. 准备流式响应。
    _flushed.clear();
    _pending.clear();
    _lastUsageTokens = 0;
    state = state.copyWith(
      isStreaming: true,
      currentAssistantText: '',
    );
    mascot.setAiThinking(true);

    // 6. 获取系统提示词。
    final PromptManager promptManager =
        await _ref.read(promptManagerProvider.future);
    final socratic = _ref.read(socraticModeProvider);
    final systemPrompt =
        promptManager.getSystemPrompt(socraticMode: socratic);

    // 7. 构建发送给 AI 的消息历史（系统提示词由 options 注入）。
    final history = state.messages
        .where((m) => m.role != MessageRole.system)
        .toList(growable: false);

    // 8. 发起流式请求（temperature/maxTokens 来自 ProviderConfig，null 时用默认值）。
    final stream = provider.chatStream(
      messages: history,
      options: ChatOptions(
        systemPrompt: systemPrompt,
        temperature: config?.temperature ?? 0.7,
        maxTokens: config?.maxTokens ?? 2048,
      ),
    );
    _streamSub = stream.listen(
      _onEvent,
      onError: (Object e, StackTrace _) =>
          _finishStreamingWithError('对话出错：$e'),
      onDone: () {
        // 流结束但未收到 DoneEvent 时的兜底提交。
        if (state.isStreaming) {
          _commitAssistant();
        }
      },
    );
  }

  /// 处理流式事件。
  void _onEvent(AiStreamEvent event) {
    if (!state.isStreaming) return;
    switch (event) {
      case TextDeltaEvent(:final delta):
        _pending.write(delta);
        _flushTimer?.cancel();
        _flushTimer = Timer(const Duration(milliseconds: 50), _flush);
      case UsageEvent(:final totalTokens):
        _lastUsageTokens = totalTokens;
        state = state.copyWith(
          currentTokens: state.currentTokens + totalTokens,
        );
      case DoneEvent():
        _commitAssistant();
      case ErrorEvent(:final message):
        _finishStreamingWithError(message);
    }
  }

  /// 将缓冲区文本刷新到状态（50ms 节流）。
  void _flush() {
    _flushTimer = null;
    if (_pending.isEmpty) return;
    _flushed.write(_pending);
    _pending.clear();
    state = state.copyWith(currentAssistantText: _flushed.toString());
  }

  /// 完成流式：刷新剩余文本、落盘助手消息、触发吉祥物庆祝。
  Future<void> _commitAssistant() async {
    if (_completing) return;
    _completing = true;
    await _streamSub?.cancel();
    _streamSub = null;
    _flushTimer?.cancel();
    _flushTimer = null;
    // 刷新剩余未节流的文本。
    if (_pending.isNotEmpty) {
      _flushed.write(_pending);
      _pending.clear();
    }
    final fullText = _flushed.toString();
    _flushed.clear();
    final conversationId = state.conversationId;
    if (conversationId != null && fullText.isNotEmpty) {
      final msgRepo = _ref.read(messageRepositoryProvider);
      await msgRepo.addMessage(
        conversationId,
        'assistant',
        fullText,
        tokens: _lastUsageTokens,
      );
    }
    final assistantMsg = ChatMessage.assistant(fullText);
    state = state.copyWith(
      messages: <ChatMessage>[...state.messages, assistantMsg],
      isStreaming: false,
      currentAssistantText: '',
    );
    _completing = false;
    _ref.read(mascotControllerProvider.notifier).celebrate();
  }

  /// 以错误结束流式：设置错误信息、吉祥物切换为难过。
  ///
  /// 如果已接收到部分流式内容，会先将其落盘为 assistant 消息并追加到状态，
  /// 这样用户能看到"AI 回复了一部分然后出错"，而不是已显示的内容突然消失。
  /// 状态更新（isStreaming/error/messages）同步完成，数据库落盘异步执行。
  Future<void> _finishStreamingWithError(String message) async {
    // 先停止流式订阅与节流计时器（同步操作）。
    final sub = _streamSub;
    _streamSub = null;
    _flushTimer?.cancel();
    _flushTimer = null;
    // 刷新剩余未节流的文本。
    if (_pending.isNotEmpty) {
      _flushed.write(_pending);
      _pending.clear();
    }
    final partialText = _flushed.toString();
    _flushed.clear();
    // 立即更新状态：标记非流式、设置错误、追加部分内容（如有）。
    if (partialText.isNotEmpty) {
      final assistantMsg = ChatMessage.assistant(partialText);
      state = state.copyWith(
        isStreaming: false,
        currentAssistantText: '',
        error: message,
        messages: <ChatMessage>[...state.messages, assistantMsg],
      );
    } else {
      state = state.copyWith(
        isStreaming: false,
        currentAssistantText: '',
        error: message,
      );
    }
    // 同步切换吉祥物为难过。
    _ref.read(mascotControllerProvider.notifier).setMood(MascotMood.sad);
    // 异步：取消订阅 + 落盘部分内容。
    await sub?.cancel();
    if (partialText.isNotEmpty) {
      final conversationId = state.conversationId;
      if (conversationId != null) {
        final msgRepo = _ref.read(messageRepositoryProvider);
        await msgRepo.addMessage(
          conversationId,
          'assistant',
          partialText,
          tokens: _lastUsageTokens,
        );
      }
    }
  }

  /// 停止当前流式响应。
  ///
  /// 调用 [AiProviderRegistry.cancel] 终止请求，并提交已收到的部分文本。
  void stopStreaming() {
    _ref.read(aiProviderRegistryProvider).cancel();
    if (state.isStreaming) {
      _commitAssistant();
    }
  }

  /// 追加一条助手消息并落盘（用于分级探索结果）。
  Future<void> appendAssistantMessage(String content) async {
    final conversationId = state.conversationId;
    if (conversationId == null || content.isEmpty) return;
    final msgRepo = _ref.read(messageRepositoryProvider);
    await msgRepo.addMessage(conversationId, 'assistant', content);
    state = state.copyWith(
      messages: <ChatMessage>[...state.messages, ChatMessage.assistant(content)],
    );
    _ref.read(mascotControllerProvider.notifier).celebrate();
  }

  /// 将一条 AI 消息内容保存为笔记。
  ///
  /// 标题取内容前 30 字，标签固定为 "对话"，关联当前对话 id。
  Future<void> saveAsNote(String content) async {
    final noteRepo = _ref.read(noteRepositoryProvider);
    final title = content.length > 30 ? content.substring(0, 30) : content;
    await noteRepo.createNote(
      title: title.isEmpty ? '未命名笔记' : title,
      content: content,
      tags: '对话',
      conversationId: state.conversationId,
    );
  }

  /// 加载指定对话的历史消息。
  Future<void> loadConversation(String id) async {
    if (id.isEmpty) {
      reset();
      return;
    }
    final msgRepo = _ref.read(messageRepositoryProvider);
    final convRepo = _ref.read(conversationRepositoryProvider);
    final rows = await msgRepo.getMessages(id);
    final messages = rows.map(_toChatMessage).toList(growable: false);
    var title = '新对话';
    try {
      final all = await convRepo.getAllConversations();
      final conv = all.firstWhere((c) => c.id == id);
      title = conv.title;
    } on Object {
      // 找不到对话时使用默认标题。
    }
    state = ChatControllerState(
      messages: messages,
      conversationId: id,
      conversationTitle: title,
    );
  }

  /// 重置为空白对话状态（用于新建对话）。
  void reset() {
    _streamSub?.cancel();
    _flushTimer?.cancel();
    _flushed.clear();
    _pending.clear();
    _lastUsageTokens = 0;
    state = const ChatControllerState();
  }

  /// 将 Drift [Message] 行转换为 [ChatMessage]。
  ChatMessage _toChatMessage(Message row) {
    final role = switch (row.role) {
      'user' => MessageRole.user,
      'assistant' => MessageRole.assistant,
      _ => MessageRole.system,
    };
    return ChatMessage(role: role, content: row.content);
  }

  @override
  void dispose() {
    _streamSub?.cancel();
    _flushTimer?.cancel();
    super.dispose();
  }
}

/// 对话控制器全局 Provider。
///
/// 单例：同一时刻仅有一个 [ChatPage] 挂载，切换对话时通过
/// [ChatController.loadConversation] 替换状态。
final chatControllerProvider =
    StateNotifierProvider<ChatController, ChatControllerState>(
  (ref) => ChatController(ref),
);
