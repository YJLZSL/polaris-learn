import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lingxi_academy/data/models/provider_config.dart';
import 'package:lingxi_academy/data/repositories/provider_config_repository.dart';
import 'package:lingxi_academy/data/services/secure_storage_service.dart';
import 'package:lingxi_academy/features/ai/ai_error_mapper.dart';
import 'package:lingxi_academy/features/ai/ai_provider.dart';
import 'package:lingxi_academy/features/ai/ai_provider_registry.dart';
import 'package:lingxi_academy/features/ai/anthropic_provider.dart';
import 'package:lingxi_academy/features/ai/gemini_provider.dart';
import 'package:lingxi_academy/features/ai/ollama_provider.dart';
import 'package:lingxi_academy/features/ai/openai_compatible_provider.dart';
import 'package:lingxi_academy/features/ai/retry_interceptor.dart';

/// 自定义 HttpClientAdapter，用于注入模拟的流式响应。
///
/// 测试时将其设置到 Dio 实例上，所有请求都会返回预置的 [ResponseBody]。
class _MockStreamAdapter implements HttpClientAdapter {
  _MockStreamAdapter(this._responseFactory);

  /// 根据请求生成模拟响应的工厂函数。
  final ResponseBody Function(RequestOptions options) _responseFactory;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return _responseFactory(options);
  }
}

/// 构造一个返回 [body] 字节流的 [ResponseBody]。
ResponseBody _buildStreamResponse(String body, {int statusCode = 200}) {
  final bytes = utf8.encode(body);
  final stream =
      Stream<List<int>>.fromIterable([bytes]).cast<Uint8List>();
  return ResponseBody(stream, statusCode, headers: {
    Headers.contentTypeHeader: ['text/event-stream'],
  });
}

/// 按顺序返回预设响应的 HttpClientAdapter，用于测试重试逻辑。
///
/// [_items] 中的元素可以是 [ResponseBody]（成功）或 [DioException]（失败）。
/// 请求按顺序消费列表中的元素；列表耗尽后抛出 [StateError]。
class _SequenceAdapter implements HttpClientAdapter {
  _SequenceAdapter(this._items);

  final List<Object> _items;
  int _index = 0;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (_index >= _items.length) {
      throw StateError('No more mock responses');
    }
    final item = _items[_index++];
    if (item is DioException) {
      throw item;
    }
    return item as ResponseBody;
  }
}

/// 构造一个 [DioException]，便于测试。
DioException _makeDioException(
  DioExceptionType type, {
  int? statusCode,
  String? message,
}) {
  final requestOptions = RequestOptions(path: 'https://example.com/test');
  Response<dynamic>? response;
  if (statusCode != null) {
    response = Response(
      requestOptions: requestOptions,
      statusCode: statusCode,
      data: '',
    );
  }
  return DioException(
    type: type,
    requestOptions: requestOptions,
    response: response,
    message: message,
  );
}

/// 构造一个简单的 JSON 成功响应。
ResponseBody _buildJsonResponse(String body, {int statusCode = 200}) {
  final bytes = utf8.encode(body);
  final stream = Stream<List<int>>.fromIterable([bytes]).cast<Uint8List>();
  return ResponseBody(stream, statusCode, headers: {
    Headers.contentTypeHeader: ['application/json'],
  });
}

void main() {
  group('ChatMessage', () {
    test('工厂构造函数应设置正确的 role', () {
      final user = ChatMessage.user('hi');
      expect(user.role, MessageRole.user);
      expect(user.content, 'hi');

      final assistant = ChatMessage.assistant('hello');
      expect(assistant.role, MessageRole.assistant);

      final system = ChatMessage.system('rule');
      expect(system.role, MessageRole.system);
    });
  });

  group('ChatOptions', () {
    test('默认 stream 应为 true', () {
      const options = ChatOptions();
      expect(options.stream, isTrue);
    });

    test('应正确存储各项参数', () {
      const options = ChatOptions(
        temperature: 0.5,
        maxTokens: 1024,
        systemPrompt: 'You are helpful',
        stream: false,
      );
      expect(options.temperature, 0.5);
      expect(options.maxTokens, 1024);
      expect(options.systemPrompt, 'You are helpful');
      expect(options.stream, isFalse);
    });
  });

  group('AiStreamEvent', () {
    test('TextDeltaEvent 应携带 delta 文本', () {
      const event = TextDeltaEvent('chunk');
      expect(event.delta, 'chunk');
    });

    test('DoneEvent 应可被模式匹配识别', () {
      const AiStreamEvent event = DoneEvent();
      expect(event is DoneEvent, isTrue);
    });

    test('ErrorEvent 应携带 message', () {
      const event = ErrorEvent('boom');
      expect(event.message, 'boom');
    });

    test('UsageEvent 应携带 token 用量字段', () {
      const event = UsageEvent(
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      );
      expect(event.promptTokens, 100);
      expect(event.completionTokens, 50);
      expect(event.totalTokens, 150);
    });

    test('UsageEvent 应可被模式匹配识别', () {
      const AiStreamEvent event = UsageEvent(
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
      );
      expect(event is UsageEvent, isTrue);
    });
  });

  group('OpenAICompatibleProvider', () {
    test('应正确解析流式 SSE 响应并提取 delta', () async {
      // 构造 OpenAI 风格的 SSE 响应
      final sseBody = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        '',
        'data: {"choices":[{"delta":{"content":" world"}}]}',
        '',
        'data: {"choices":[{"delta":{"content":"!"}}]}',
        '',
        'data: [DONE]',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = OpenAICompatibleProvider(
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final deltas = events.whereType<TextDeltaEvent>().toList();
      expect(deltas.map((e) => e.delta).join(), 'Hello world!');
      expect(events.whereType<DoneEvent>().length, 1);
    });

    test('应忽略 delta.content 为空的帧', () async {
      final sseBody = [
        'data: {"choices":[{"delta":{}}]}',
        '',
        'data: {"choices":[{"delta":{"content":"text"}}]}',
        '',
        'data: [DONE]',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = OpenAICompatibleProvider(
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final deltas = events.whereType<TextDeltaEvent>().toList();
      expect(deltas.map((e) => e.delta).join(), 'text');
    });

    test('chat 应聚合所有 delta 为完整字符串', () async {
      final sseBody = [
        'data: {"choices":[{"delta":{"content":"abc"}}]}',
        '',
        'data: {"choices":[{"delta":{"content":"def"}}]}',
        '',
        'data: [DONE]',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = OpenAICompatibleProvider(
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
        dio: dio,
      );

      final result = await provider.chat(
        messages: [ChatMessage.user('hi')],
        options: const ChatOptions(),
      );
      expect(result, 'abcdef');
    });

    test('systemPrompt 应被注入为首条 system 消息', () async {
      RequestOptions? capturedRequest;
      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter((options) {
        capturedRequest = options;
        return _buildStreamResponse('data: [DONE]\n\n');
      });

      final provider = OpenAICompatibleProvider(
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
        dio: dio,
      );

      await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(systemPrompt: 'Be concise'),
          )
          .toList();

      expect(capturedRequest, isNotNull);
      final data = capturedRequest!.data as Map<String, dynamic>;
      final messages = data['messages'] as List<dynamic>;
      expect(messages.first['role'], 'system');
      expect(messages.first['content'], 'Be concise');
      expect(messages.last['role'], 'user');
    });

    test('流式响应含 usage 字段时应 emit UsageEvent', () async {
      // OpenAI 在最后一个 chunk（choices 为空）中返回 usage
      final sseBody = [
        'data: {"choices":[{"delta":{"content":"Hi"}}]}',
        '',
        'data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}',
        '',
        'data: [DONE]',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = OpenAICompatibleProvider(
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final usageEvents = events.whereType<UsageEvent>().toList();
      expect(usageEvents.length, 1);
      expect(usageEvents.first.promptTokens, 10);
      expect(usageEvents.first.completionTokens, 5);
      expect(usageEvents.first.totalTokens, 15);

      // UsageEvent 应在 DoneEvent 之前
      final usageIndex = events.indexOf(usageEvents.first);
      final doneIndex = events.whereType<DoneEvent>().first;
      expect(events.indexOf(doneIndex) > usageIndex, isTrue);
    });

    test('delta 含 reasoning_content 时应 emit TextDeltaEvent', () async {
      // DeepSeek-R1 / o1 等推理模型的 reasoning_content 字段
      final sseBody = [
        'data: {"choices":[{"delta":{"reasoning_content":"思考中"}}]}',
        '',
        'data: {"choices":[{"delta":{"content":"答案"}}]}',
        '',
        'data: [DONE]',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = OpenAICompatibleProvider(
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'deepseek-r1',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final deltas = events.whereType<TextDeltaEvent>().toList();
      // reasoning_content 在前，content 在后
      expect(deltas.length, 2);
      expect(deltas[0].delta, '思考中');
      expect(deltas[1].delta, '答案');
    });

    test('请求体应包含 stream_options.include_usage', () async {
      RequestOptions? capturedRequest;
      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter((options) {
        capturedRequest = options;
        return _buildStreamResponse('data: [DONE]\n\n');
      });

      final provider = OpenAICompatibleProvider(
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
        dio: dio,
      );

      await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      expect(capturedRequest, isNotNull);
      final data = capturedRequest!.data as Map<String, dynamic>;
      final streamOptions =
          data['stream_options'] as Map<String, dynamic>?;
      expect(streamOptions, isNotNull);
      expect(streamOptions!['include_usage'], isTrue);
    });

    test('usage 字段缺失时不应 emit UsageEvent', () async {
      final sseBody = [
        'data: {"choices":[{"delta":{"content":"Hi"}}]}',
        '',
        'data: [DONE]',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = OpenAICompatibleProvider(
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      expect(events.whereType<UsageEvent>(), isEmpty);
      expect(events.whereType<DoneEvent>().length, 1);
    });
  });

  group('AnthropicProvider', () {
    test('应正确解析 content_block_delta 事件', () async {
      final sseBody = [
        'event: message_start',
        'data: {"type":"message_start","message":{}}',
        '',
        'event: content_block_delta',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}',
        '',
        'event: content_block_delta',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" Claude"}}',
        '',
        'event: message_stop',
        'data: {"type":"message_stop"}',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = AnthropicProvider(
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final deltas = events.whereType<TextDeltaEvent>().toList();
      expect(deltas.map((e) => e.delta).join(), 'Hello Claude');
      expect(events.whereType<DoneEvent>().length, 1);
    });

    test('systemPrompt 应放入 system 字段而非 messages', () async {
      RequestOptions? capturedRequest;
      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter((options) {
        capturedRequest = options;
        return _buildStreamResponse(
          'event: message_stop\ndata: {"type":"message_stop"}\n\n',
        );
      });

      final provider = AnthropicProvider(
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        dio: dio,
      );

      await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(systemPrompt: 'Be helpful'),
          )
          .toList();

      expect(capturedRequest, isNotNull);
      final data = capturedRequest!.data as Map<String, dynamic>;
      expect(data['system'], 'Be helpful');
      final messages = data['messages'] as List<dynamic>;
      // messages 中不应包含 system 角色
      for (final msg in messages) {
        expect((msg as Map<String, dynamic>)['role'], isNot('system'));
      }
    });

    test('流式响应含 usage 时应 emit UsageEvent（累积 input/output）', () async {
      // message_start.message.usage.input_tokens = 12
      // message_delta.usage.output_tokens = 8
      final sseBody = [
        'event: message_start',
        'data: {"type":"message_start","message":{"usage":{"input_tokens":12}}}',
        '',
        'event: content_block_delta',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}',
        '',
        'event: message_delta',
        'data: {"type":"message_delta","usage":{"output_tokens":8}}',
        '',
        'event: message_stop',
        'data: {"type":"message_stop"}',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = AnthropicProvider(
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final usageEvents = events.whereType<UsageEvent>().toList();
      expect(usageEvents.length, 1);
      expect(usageEvents.first.promptTokens, 12);
      expect(usageEvents.first.completionTokens, 8);
      expect(usageEvents.first.totalTokens, 20);

      // UsageEvent 应在 DoneEvent 之前
      final usageIndex = events.indexOf(usageEvents.first);
      final doneEvent = events.whereType<DoneEvent>().first;
      expect(events.indexOf(doneEvent) > usageIndex, isTrue);
    });

    test('usage 字段缺失时不应 emit UsageEvent', () async {
      final sseBody = [
        'event: message_start',
        'data: {"type":"message_start","message":{}}',
        '',
        'event: content_block_delta',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}',
        '',
        'event: message_stop',
        'data: {"type":"message_stop"}',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = AnthropicProvider(
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      expect(events.whereType<UsageEvent>(), isEmpty);
      expect(events.whereType<DoneEvent>().length, 1);
    });
  });

  group('GeminiProvider', () {
    test('应正确解析 candidates 中的文本', () async {
      final sseBody = [
        'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]},"finishReason":"STOP"}]}',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = GeminiProvider(
        apiKey: 'AIza-test',
        model: 'gemini-1.5-flash',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final deltas = events.whereType<TextDeltaEvent>().toList();
      expect(deltas.map((e) => e.delta).join(), 'Hello');
      expect(events.whereType<DoneEvent>().length, 1);
    });

    test('assistant 消息应映射为 model 角色', () async {
      RequestOptions? capturedRequest;
      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter((options) {
        capturedRequest = options;
        return _buildStreamResponse('data: {}\n\n');
      });

      final provider = GeminiProvider(
        apiKey: 'AIza-test',
        model: 'gemini-1.5-flash',
        dio: dio,
      );

      await provider
          .chatStream(
            messages: [
              ChatMessage.user('hi'),
              ChatMessage.assistant('hello'),
            ],
            options: const ChatOptions(),
          )
          .toList();

      expect(capturedRequest, isNotNull);
      final data = capturedRequest!.data as Map<String, dynamic>;
      final contents = data['contents'] as List<dynamic>;
      expect((contents[0] as Map<String, dynamic>)['role'], 'user');
      expect((contents[1] as Map<String, dynamic>)['role'], 'model');
    });

    test('URL 应包含 model 与 key 参数', () async {
      RequestOptions? capturedRequest;
      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter((options) {
        capturedRequest = options;
        return _buildStreamResponse('data: {}\n\n');
      });

      final provider = GeminiProvider(
        apiKey: 'AIza-secret-key',
        model: 'gemini-1.5-flash',
        dio: dio,
      );

      await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      expect(capturedRequest, isNotNull);
      expect(
        capturedRequest!.path,
        contains('models/gemini-1.5-flash:streamGenerateContent'),
      );
      expect(capturedRequest!.path, contains('key=AIza-secret-key'));
      expect(capturedRequest!.path, contains('alt=sse'));
    });

    test('流式响应含 usageMetadata 时应 emit UsageEvent', () async {
      // Gemini 在最后一个 chunk 中携带 usageMetadata
      final sseBody = [
        'data: {"candidates":[{"content":{"parts":[{"text":"Hi"}]}}]}',
        '',
        'data: {"candidates":[{"content":{"parts":[{"text":""}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":20,"candidatesTokenCount":10,"totalTokenCount":30}}',
        '',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(sseBody),
      );

      final provider = GeminiProvider(
        apiKey: 'AIza-test',
        model: 'gemini-1.5-flash',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final usageEvents = events.whereType<UsageEvent>().toList();
      expect(usageEvents.length, 1);
      expect(usageEvents.first.promptTokens, 20);
      expect(usageEvents.first.completionTokens, 10);
      expect(usageEvents.first.totalTokens, 30);

      // UsageEvent 应在 DoneEvent 之前
      final usageIndex = events.indexOf(usageEvents.first);
      final doneEvent = events.whereType<DoneEvent>().first;
      expect(events.indexOf(doneEvent) > usageIndex, isTrue);
    });
  });

  group('OllamaProvider', () {
    test('应正确解析 NDJSON 流（每行一个 JSON）', () async {
      // NDJSON：每行一个 JSON 对象，最后一行 done=true
      final ndjsonBody = [
        '{"model":"llama3.2","message":{"role":"assistant","content":"Hello"},"done":false}',
        '{"model":"llama3.2","message":{"role":"assistant","content":" world"},"done":false}',
        '{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(ndjsonBody),
      );

      final provider = OllamaProvider(
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final deltas = events.whereType<TextDeltaEvent>().toList();
      expect(deltas.map((e) => e.delta).join(), 'Hello world');
      expect(events.whereType<DoneEvent>().length, 1);
    });

    test('应忽略空 content 行', () async {
      final ndjsonBody = [
        '{"model":"llama3.2","message":{"role":"assistant","content":""},"done":false}',
        '{"model":"llama3.2","message":{"role":"assistant","content":"text"},"done":false}',
        '{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(ndjsonBody),
      );

      final provider = OllamaProvider(
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final deltas = events.whereType<TextDeltaEvent>().toList();
      expect(deltas.length, 1);
      expect(deltas.first.delta, 'text');
    });

    test('systemPrompt 应作为首条 system 消息注入', () async {
      RequestOptions? capturedRequest;
      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter((options) {
        capturedRequest = options;
        return _buildStreamResponse(
          '{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}',
        );
      });

      final provider = OllamaProvider(
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
        dio: dio,
      );

      await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(systemPrompt: 'Be local'),
          )
          .toList();

      expect(capturedRequest, isNotNull);
      final data = capturedRequest!.data as Map<String, dynamic>;
      final messages = data['messages'] as List<dynamic>;
      expect((messages.first as Map<String, dynamic>)['role'], 'system');
      expect((messages.first as Map<String, dynamic>)['content'], 'Be local');
    });

    test('请求应发往 /api/chat 端点', () async {
      RequestOptions? capturedRequest;
      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter((options) {
        capturedRequest = options;
        return _buildStreamResponse(
          '{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}',
        );
      });

      final provider = OllamaProvider(
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
        dio: dio,
      );

      await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      expect(capturedRequest, isNotNull);
      expect(capturedRequest!.path, 'http://localhost:11434/api/chat');
    });

    test('流式响应含 eval_count 时应 emit UsageEvent', () async {
      // Ollama 在 done=true 的最后一条 chunk 中携带 eval_count 与 prompt_eval_count
      final ndjsonBody = [
        '{"model":"llama3.2","message":{"role":"assistant","content":"Hi"},"done":false}',
        '{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true,"eval_count":15,"prompt_eval_count":25}',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(ndjsonBody),
      );

      final provider = OllamaProvider(
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      final usageEvents = events.whereType<UsageEvent>().toList();
      expect(usageEvents.length, 1);
      expect(usageEvents.first.promptTokens, 25);
      expect(usageEvents.first.completionTokens, 15);
      expect(usageEvents.first.totalTokens, 40);

      // UsageEvent 应在 DoneEvent 之前
      final usageIndex = events.indexOf(usageEvents.first);
      final doneEvent = events.whereType<DoneEvent>().first;
      expect(events.indexOf(doneEvent) > usageIndex, isTrue);
    });

    test('eval_count 缺失时不应 emit UsageEvent', () async {
      final ndjsonBody = [
        '{"model":"llama3.2","message":{"role":"assistant","content":"Hi"},"done":false}',
        '{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}',
      ].join('\n');

      final dio = Dio();
      dio.httpClientAdapter = _MockStreamAdapter(
        (_) => _buildStreamResponse(ndjsonBody),
      );

      final provider = OllamaProvider(
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
        dio: dio,
      );

      final events = await provider
          .chatStream(
            messages: [ChatMessage.user('hi')],
            options: const ChatOptions(),
          )
          .toList();

      expect(events.whereType<UsageEvent>(), isEmpty);
      expect(events.whereType<DoneEvent>().length, 1);
    });
  });

  group('AiProviderRegistry', () {
    late SecureStorageService secureStorage;
    late SharedPreferences prefs;
    late ProviderConfigRepository repository;
    late AiProviderRegistry registry;

    setUp(() async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      FlutterSecureStorage.setMockInitialValues(<String, String>{});
      secureStorage = SecureStorageService();
      prefs = await SharedPreferences.getInstance();
      repository = ProviderConfigRepository(secureStorage, prefs);
      registry = AiProviderRegistry(repository);
    });

    test('getProvider 无配置时应返回 null', () async {
      final provider = await registry.getProvider();
      expect(provider, isNull);
    });

    test('getProvider 应返回默认 Provider（OpenAI 兼容）', () async {
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(apiKey: 'sk-test'),
      );

      final provider = await registry.getProvider();
      expect(provider, isNotNull);
      expect(provider, isA<OpenAICompatibleProvider>());
    });

    test('getProvider 应返回默认 Provider（Anthropic）', () async {
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.anthropic)
            .copyWith(apiKey: 'sk-ant'),
      );

      final provider = await registry.getProvider();
      expect(provider, isNotNull);
      expect(provider, isA<AnthropicProvider>());
    });

    test('getProvider 应返回默认 Provider（Gemini）', () async {
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.gemini)
            .copyWith(apiKey: 'AIza-test'),
      );

      final provider = await registry.getProvider();
      expect(provider, isNotNull);
      expect(provider, isA<GeminiProvider>());
    });

    test('getProvider 应返回默认 Provider（Ollama，本地无需 apiKey）', () async {
      // Ollama 不需要 apiKey，但 getDefaultProvider 要求 apiKey 非空才会返回
      // 为测试 Ollama 路径，给一个占位 key
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.ollama)
            .copyWith(apiKey: 'local-placeholder'),
      );

      final provider = await registry.getProvider();
      expect(provider, isNotNull);
      expect(provider, isA<OllamaProvider>());
    });

    test('switchProvider 应切换到指定类型', () async {
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(apiKey: 'sk-openai'),
      );
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.anthropic)
            .copyWith(apiKey: 'sk-ant'),
      );

      // 初始获取 OpenAI
      var provider = await registry.getProvider();
      expect(provider, isA<OpenAICompatibleProvider>());

      // 切换到 Anthropic
      await registry.switchProvider(ProviderType.anthropic);
      provider = await registry.getProvider();
      expect(provider, isA<AnthropicProvider>());
    });

    test('getProvider 配置未变时应复用缓存实例', () async {
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(apiKey: 'sk-test'),
      );

      final first = await registry.getProvider();
      final second = await registry.getProvider();
      expect(identical(first, second), isTrue);
    });

    test('cancel 调用不应抛出异常（即使无进行中请求）', () {
      expect(() => registry.cancel(), returnsNormally);
    });
  });

  group('Provider cancel 行为', () {
    test('OpenAICompatibleProvider.cancel 调用不应抛出异常', () {
      final provider = OpenAICompatibleProvider(
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
      );
      expect(() => provider.cancel(), returnsNormally);
    });

    test('OllamaProvider.cancel 调用不应抛出异常', () {
      final provider = OllamaProvider(
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
      );
      expect(() => provider.cancel(), returnsNormally);
    });
  });

  group('AiErrorMapper', () {
    test('connectionTimeout 应返回中文超时提示', () {
      final err = _makeDioException(DioExceptionType.connectionTimeout);
      expect(
        AiErrorMapper.mapException(err),
        '连接超时，请检查网络或 Base URL',
      );
    });

    test('sendTimeout 应返回发送超时提示', () {
      final err = _makeDioException(DioExceptionType.sendTimeout);
      expect(AiErrorMapper.mapException(err), '发送超时，请检查网络');
    });

    test('receiveTimeout 应返回接收超时提示', () {
      final err = _makeDioException(DioExceptionType.receiveTimeout);
      expect(AiErrorMapper.mapException(err), '接收超时，AI 响应时间过长');
    });

    test('connectionError 应返回网络连接失败提示', () {
      final err = _makeDioException(DioExceptionType.connectionError);
      expect(
        AiErrorMapper.mapException(err),
        '网络连接失败，请检查网络或 Base URL',
      );
    });

    test('badResponse 401 应返回鉴权失败提示', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 401,
      );
      expect(AiErrorMapper.mapException(err), '鉴权失败，请检查 API Key');
    });

    test('badResponse 403 应返回访问被拒绝提示', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 403,
      );
      expect(AiErrorMapper.mapException(err), '访问被拒绝，请检查 API Key 权限');
    });

    test('badResponse 404 应返回接口不存在提示', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 404,
      );
      expect(AiErrorMapper.mapException(err), '接口不存在，请检查 Base URL');
    });

    test('badResponse 429 应返回请求频繁提示', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 429,
      );
      expect(AiErrorMapper.mapException(err), '请求过于频繁，请稍后重试');
    });

    test('badResponse 500 应返回服务器错误提示', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 500,
      );
      expect(AiErrorMapper.mapException(err), '服务器错误，请稍后重试');
    });

    test('badResponse 599 应返回服务器错误提示', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 599,
      );
      expect(AiErrorMapper.mapException(err), '服务器错误，请稍后重试');
    });

    test('badResponse 其他状态码应返回带状态码的消息', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 400,
      );
      expect(AiErrorMapper.mapException(err), '请求失败（状态码：400）');
    });

    test('cancel 应返回请求已取消提示', () {
      final err = _makeDioException(DioExceptionType.cancel);
      expect(AiErrorMapper.mapException(err), '请求已取消');
    });

    test('badCertificate 应返回证书验证失败提示', () {
      final err = _makeDioException(DioExceptionType.badCertificate);
      expect(AiErrorMapper.mapException(err), '证书验证失败');
    });

    test('unknown 带 message 应返回 message 内容', () {
      final err = _makeDioException(
        DioExceptionType.unknown,
        message: 'something went wrong',
      );
      expect(AiErrorMapper.mapException(err), 'something went wrong');
    });

    test('unknown 不带 message 应返回未知错误', () {
      final err = _makeDioException(DioExceptionType.unknown);
      expect(AiErrorMapper.mapException(err), '未知错误');
    });

    test('unknown 带空 message 应返回未知错误', () {
      final err = _makeDioException(
        DioExceptionType.unknown,
        message: '',
      );
      expect(AiErrorMapper.mapException(err), '未知错误');
    });

    test('非 DioException 应返回 toString 并截断到 200 字符', () {
      final err = Exception('a' * 300);
      final result = AiErrorMapper.mapException(err);
      expect(result.length, 200);
      expect(result, err.toString().substring(0, 200));
    });

    test('非 DioException 短消息应原样返回', () {
      const err = FormatException('bad format');
      final result = AiErrorMapper.mapException(err);
      expect(result, const FormatException('bad format').toString());
    });

    test('errorEvent 应返回包含映射消息的 ErrorEvent', () {
      final err = _makeDioException(DioExceptionType.cancel);
      final event = AiErrorMapper.errorEvent(err);
      expect(event, isA<ErrorEvent>());
      expect((event as ErrorEvent).message, '请求已取消');
    });
  });

  group('RetryInterceptor', () {
    test('connectionError 后成功应触发重试并返回响应', () async {
      final adapter = _SequenceAdapter([
        _makeDioException(DioExceptionType.connectionError),
        _buildJsonResponse('{"ok":true}'),
      ]);
      final dio = Dio();
      dio.httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(
        dio: dio,
        backoffDelays: const [Duration.zero],
      ));

      final response = await dio.get<dynamic>('https://example.com/test');

      expect(response.statusCode, 200);
      expect(adapter._index, 2); // 第一次失败 + 重试成功
    });

    test('cancel 不应触发重试', () async {
      final adapter = _SequenceAdapter([
        _makeDioException(DioExceptionType.cancel),
        _buildJsonResponse('{"ok":true}'),
      ]);
      final dio = Dio();
      dio.httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(
        dio: dio,
        backoffDelays: const [Duration.zero],
      ));

      DioException? caughtError;
      try {
        await dio.get<dynamic>('https://example.com/test');
      } on DioException catch (e) {
        caughtError = e;
      }

      expect(caughtError, isNotNull);
      expect(caughtError!.type, DioExceptionType.cancel);
      expect(adapter._index, 1); // 只调用了一次，未重试
    });

    test('badResponse 500 应触发重试', () async {
      final adapter = _SequenceAdapter([
        _makeDioException(DioExceptionType.badResponse, statusCode: 500),
        _buildJsonResponse('{"ok":true}'),
      ]);
      final dio = Dio();
      dio.httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(
        dio: dio,
        backoffDelays: const [Duration.zero],
      ));

      final response = await dio.get<dynamic>('https://example.com/test');

      expect(response.statusCode, 200);
      expect(adapter._index, 2);
    });

    test('badResponse 404 不应触发重试', () async {
      final adapter = _SequenceAdapter([
        _makeDioException(DioExceptionType.badResponse, statusCode: 404),
        _buildJsonResponse('{"ok":true}'),
      ]);
      final dio = Dio();
      dio.httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(
        dio: dio,
        backoffDelays: const [Duration.zero],
      ));

      DioException? caughtError;
      try {
        await dio.get<dynamic>('https://example.com/test');
      } on DioException catch (e) {
        caughtError = e;
      }

      expect(caughtError, isNotNull);
      expect(caughtError!.response?.statusCode, 404);
      expect(adapter._index, 1); // 未重试
    });

    test('超过 maxRetries 后应放行错误', () async {
      final adapter = _SequenceAdapter([
        _makeDioException(DioExceptionType.connectionError),
        _makeDioException(DioExceptionType.connectionError),
        _makeDioException(DioExceptionType.connectionError),
      ]);
      final dio = Dio();
      dio.httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(
        dio: dio,
        maxRetries: 2,
        backoffDelays: const [Duration.zero, Duration.zero],
      ));

      DioException? caughtError;
      try {
        await dio.get<dynamic>('https://example.com/test');
      } on DioException catch (e) {
        caughtError = e;
      }

      expect(caughtError, isNotNull);
      expect(caughtError!.type, DioExceptionType.connectionError);
      // 原始 1 次 + 2 次重试 = 3 次
      expect(adapter._index, 3);
    });
  });
}
