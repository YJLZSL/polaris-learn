// ignore_for_file: lines_longer_than_80_lines

import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/features/ai/ai_provider.dart';
import 'package:lingxi_academy/features/ai/ai_providers.dart';
import 'package:lingxi_academy/features/ai/prompt_manager.dart';
import 'package:lingxi_academy/features/chat/chat_controller.dart';
import 'package:lingxi_academy/features/mascot/mascot_controller.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 模拟 [AiProvider]：按预置事件序列发射流式响应。
///
/// 通过 [lastOptions] 暴露最近一次 [chatStream] 接收到的 [ChatOptions]，
/// 便于测试验证 temperature/maxTokens 等参数传递。
class _FakeAiProvider implements AiProvider {
  _FakeAiProvider(this.events);

  final List<AiStreamEvent> events;

  /// 最近一次 chatStream 调用接收到的选项（用于断言）。
  ChatOptions? lastOptions;

  @override
  Stream<AiStreamEvent> chatStream({
    required List<ChatMessage> messages,
    required ChatOptions options,
  }) {
    lastOptions = options;
    return Stream<AiStreamEvent>.fromIterable(events);
  }

  @override
  Future<String> chat({
    required List<ChatMessage> messages,
    required ChatOptions options,
  }) async {
    return events.whereType<TextDeltaEvent>().map((e) => e.delta).join();
  }

  @override
  void cancel() {}

  @override
  Future<bool> testConnection() async => true;
}

/// 轮询等待控制器结束流式状态。
Future<void> _waitForIdle(
  ChatController controller, {
  Duration timeout = const Duration(seconds: 2),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (controller.state.isStreaming && DateTime.now().isBefore(deadline)) {
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
}

void main() {
  group('ChatController', () {
    late LingxiDatabase db;
    late SharedPreferences prefs;

    setUp(() async {
      SharedPreferences.setMockInitialValues(<String, Object>{
        'onboarding_completed': true,
        'socratic_mode': true,
      });
      // 初始化 SecureStorage mock（空值），避免 sendMessage 读取
      // ProviderConfig 时因缺少平台通道而报错。
      FlutterSecureStorage.setMockInitialValues(<String, String>{});
      prefs = await SharedPreferences.getInstance();
      db = LingxiDatabase.forTesting(NativeDatabase.memory());
    });

    tearDown(() async {
      await db.close();
    });

    test('sendMessage 正常流式后落盘消息并清空流式状态', () async {
      final fake = _FakeAiProvider(const <AiStreamEvent>[
        TextDeltaEvent('Hello'),
        TextDeltaEvent(' world'),
        DoneEvent(),
      ]);
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith((ref) async => fake),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('你好');
      await _waitForIdle(controller);

      final state = controller.state;
      expect(state.isStreaming, isFalse);
      expect(state.error, isNull);
      expect(state.conversationId, isNotNull);
      expect(state.currentAssistantText, '');
      expect(state.messages.length, 2);
      expect(state.messages[0].role, MessageRole.user);
      expect(state.messages[0].content, '你好');
      expect(state.messages[1].role, MessageRole.assistant);
      expect(state.messages[1].content, 'Hello world');

      // 验证已落盘到数据库。
      final rows = await container
          .read(messageRepositoryProvider)
          .getMessages(state.conversationId!);
      expect(rows.length, 2);
      expect(rows[0].role, 'user');
      expect(rows[1].role, 'assistant');
      expect(rows[1].content, 'Hello world');

      // 验证吉祥物切换为庆祝态。
      expect(container.read(mascotControllerProvider).mood,
          MascotMood.celebrate);
    });

    test('sendMessage 收到 ErrorEvent 时保留已接收内容并设置错误', () async {
      final fake = _FakeAiProvider(const <AiStreamEvent>[
        TextDeltaEvent('部分内容'),
        ErrorEvent('boom'),
      ]);
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith((ref) async => fake),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('问题');
      await _waitForIdle(controller);

      final state = controller.state;
      expect(state.isStreaming, isFalse);
      expect(state.error, 'boom');
      // 用户消息 + 部分助手内容应被保留。
      expect(state.messages.length, 2);
      expect(state.messages[0].role, MessageRole.user);
      expect(state.messages[1].role, MessageRole.assistant);
      expect(state.messages[1].content, '部分内容');
      expect(container.read(mascotControllerProvider).mood, MascotMood.sad);

      // 验证部分内容已落盘到数据库。
      final rows = await container
          .read(messageRepositoryProvider)
          .getMessages(state.conversationId!);
      expect(rows.length, 2);
      expect(rows[0].role, 'user');
      expect(rows[1].role, 'assistant');
      expect(rows[1].content, '部分内容');
    });

    test('loadConversation 重新加载已持久化的历史消息', () async {
      final fake = _FakeAiProvider(const <AiStreamEvent>[
        TextDeltaEvent('答'),
        DoneEvent(),
      ]);
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith((ref) async => fake),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('问');
      await _waitForIdle(controller);
      final conversationId = controller.state.conversationId!;
      expect(controller.state.messages.length, 2);

      // 重置后重新加载应得到同样的历史。
      controller.reset();
      expect(controller.state.messages, isEmpty);

      await controller.loadConversation(conversationId);
      expect(controller.state.conversationId, conversationId);
      expect(controller.state.messages.length, 2);
      expect(controller.state.messages[0].role, MessageRole.user);
      expect(controller.state.messages[1].role, MessageRole.assistant);
    });

    test('sendMessage 空文本不触发流式', () async {
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith(
          (ref) async => _FakeAiProvider(const <AiStreamEvent>[DoneEvent()]),
        ),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('   ');
      expect(controller.state.isStreaming, isFalse);
      expect(controller.state.messages, isEmpty);
    });

    test('收到 UsageEvent 后 assistant 消息 tokens 字段正确写入',
        () async {
      final fake = _FakeAiProvider(const <AiStreamEvent>[
        TextDeltaEvent('回复'),
        UsageEvent(
          promptTokens: 30,
          completionTokens: 12,
          totalTokens: 42,
        ),
        DoneEvent(),
      ]);
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith((ref) async => fake),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('问题');
      await _waitForIdle(controller);

      // 验证 state.currentTokens 累计为 totalTokens
      expect(controller.state.currentTokens, 42);

      // 验证数据库中 assistant 消息的 tokens 字段
      final rows = await container
          .read(messageRepositoryProvider)
          .getMessages(controller.state.conversationId!);
      final assistantRow = rows.firstWhere((m) => m.role == 'assistant');
      expect(assistantRow.tokens, 42);
    });

    test('state.currentTokens 应在多次消息中累计', () async {
      // 第一次响应：10 tokens；第二次响应：20 tokens
      final sequences = <List<AiStreamEvent>>[
        <AiStreamEvent>[
          const TextDeltaEvent('回复 1'),
          const UsageEvent(
            promptTokens: 5,
            completionTokens: 5,
            totalTokens: 10,
          ),
          const DoneEvent(),
        ],
        <AiStreamEvent>[
          const TextDeltaEvent('回复 2'),
          const UsageEvent(
            promptTokens: 10,
            completionTokens: 10,
            totalTokens: 20,
          ),
          const DoneEvent(),
        ],
      ];
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith(
          (ref) async => _AiProviderSequence(sequences),
        ),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);

      // 第一次发消息
      await controller.sendMessage('问题 1');
      await _waitForIdle(controller);
      expect(controller.state.currentTokens, 10);

      // 第二次发消息
      await controller.sendMessage('问题 2');
      await _waitForIdle(controller);
      expect(controller.state.currentTokens, 30); // 10 + 20
    });

    test('无 UsageEvent 时 currentTokens 保持 0 且 tokens 字段为 0', () async {
      final fake = _FakeAiProvider(const <AiStreamEvent>[
        TextDeltaEvent('回复'),
        DoneEvent(),
      ]);
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith((ref) async => fake),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('问题');
      await _waitForIdle(controller);

      expect(controller.state.currentTokens, 0);

      final rows = await container
          .read(messageRepositoryProvider)
          .getMessages(controller.state.conversationId!);
      final assistantRow = rows.firstWhere((m) => m.role == 'assistant');
      expect(assistantRow.tokens, 0);
    });

    test('reset 应清空 currentTokens', () async {
      final fake = _FakeAiProvider(const <AiStreamEvent>[
        TextDeltaEvent('回复'),
        UsageEvent(
          promptTokens: 5,
          completionTokens: 5,
          totalTokens: 10,
        ),
        DoneEvent(),
      ]);
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith((ref) async => fake),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('问题');
      await _waitForIdle(controller);
      expect(controller.state.currentTokens, 10);

      controller.reset();
      expect(controller.state.currentTokens, 0);
      expect(controller.state.messages, isEmpty);
    });

    test('sendMessage 使用 ProviderConfig 的 temperature 而非硬编码 0.7',
        () async {
      // 预置 SecureStorage 中的 API Key。
      FlutterSecureStorage.setMockInitialValues(<String, String>{
        'api_key_openai_compatible': 'sk-test',
      });
      // 预置 SharedPreferences 中的 Provider 配置（temperature: 0.3）。
      await prefs.setString(
        'provider_config_openai_compatible',
        jsonEncode(<String, Object>{
          'providerType': 'openai_compatible',
          'baseUrl': 'https://api.openai.com/v1',
          'model': 'gpt-4o-mini',
          'temperature': 0.3,
          'maxTokens': 1024,
          'enabled': true,
        }),
      );

      final fake = _FakeAiProvider(const <AiStreamEvent>[
        TextDeltaEvent('回复'),
        DoneEvent(),
      ]);
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith((ref) async => fake),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('问题');
      await _waitForIdle(controller);

      // 验证传给 chatStream 的 temperature/maxTokens 来自 ProviderConfig。
      expect(fake.lastOptions?.temperature, 0.3);
      expect(fake.lastOptions?.maxTokens, 1024);
    });

    test('Provider 不可用时不创建 Conversation 不落盘消息', () async {
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith((ref) async => null),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('问题');

      // 验证状态：未创建对话、无消息、设置了错误。
      expect(controller.state.isStreaming, isFalse);
      expect(controller.state.error, isNotNull);
      expect(controller.state.conversationId, isNull);
      expect(controller.state.messages, isEmpty);

      // 验证数据库中没有对话记录。
      final convCount =
          await container.read(conversationRepositoryProvider).count();
      expect(convCount, 0);

      // 吉祥物应为难过态。
      expect(
          container.read(mascotControllerProvider).mood, MascotMood.sad);
    });

    test('创建 Conversation 时填充 provider/model 字段', () async {
      // 预置 SecureStorage 中的 API Key。
      FlutterSecureStorage.setMockInitialValues(<String, String>{
        'api_key_openai_compatible': 'sk-test',
      });
      // 预置 SharedPreferences 中的 Provider 配置。
      await prefs.setString(
        'provider_config_openai_compatible',
        jsonEncode(<String, Object>{
          'providerType': 'openai_compatible',
          'baseUrl': 'https://api.openai.com/v1',
          'model': 'gpt-4o-mini',
          'temperature': 0.7,
          'maxTokens': 2048,
          'enabled': true,
        }),
      );

      final fake = _FakeAiProvider(const <AiStreamEvent>[
        TextDeltaEvent('回复'),
        DoneEvent(),
      ]);
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
        databaseProvider.overrideWithValue(db),
        currentAiProviderProvider.overrideWith((ref) async => fake),
        promptManagerProvider.overrideWith((ref) async => PromptManager()),
      ]);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);
      await controller.sendMessage('问题');
      await _waitForIdle(controller);

      // 验证 Conversation 记录的 provider/model 字段。
      final conv = await container
          .read(conversationRepositoryProvider)
          .getConversation(controller.state.conversationId!);
      expect(conv, isNotNull);
      expect(conv!.provider, 'openai_compatible');
      expect(conv.model, 'gpt-4o-mini');
    });
  });
}

/// 按顺序返回多组事件序列的 [AiProvider]。
class _AiProviderSequence implements AiProvider {
  _AiProviderSequence(this._sequences);

  final List<List<AiStreamEvent>> _sequences;
  int _index = 0;

  @override
  Stream<AiStreamEvent> chatStream({
    required List<ChatMessage> messages,
    required ChatOptions options,
  }) {
    if (_index >= _sequences.length) {
      return Stream<AiStreamEvent>.fromIterable(const <AiStreamEvent>[
        DoneEvent(),
      ]);
    }
    final events = _sequences[_index++];
    return Stream<AiStreamEvent>.fromIterable(events);
  }

  @override
  Future<String> chat({
    required List<ChatMessage> messages,
    required ChatOptions options,
  }) async {
    return '';
  }

  @override
  void cancel() {}

  @override
  Future<bool> testConnection() async => true;
}
