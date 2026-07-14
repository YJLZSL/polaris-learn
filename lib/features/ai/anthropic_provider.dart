import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import 'ai_error_mapper.dart';
import 'ai_provider.dart';
import 'retry_interceptor.dart';
import 'secure_log_interceptor.dart';

/// Anthropic Claude Messages API Provider。
///
/// 适配 Claude 的 Messages API：
///
/// ```http
/// POST {baseUrl}/v1/messages
/// x-api-key: {apiKey}
/// anthropic-version: 2023-06-01
/// content-type: application/json
/// ```
///
/// 请求体：
/// ```json
/// {
///   "model": "claude-3-5-sonnet-20241022",
///   "max_tokens": 2048,
///   "system": "系统提示词",
///   "messages": [{"role": "user", "content": "消息"}],
///   "stream": true
/// }
/// ```
///
/// 流式 SSE 事件类型：
/// - `message_start`：消息开始
/// - `content_block_delta`：内容增量，`data.delta.text` 为文本片段
/// - `message_stop`：消息结束（对应 [DoneEvent]）
///
/// 注意：Anthropic 的系统提示词单独放在 `system` 字段，**不**放入 messages 数组。
class AnthropicProvider implements AiProvider {
  AnthropicProvider({
    required this.baseUrl,
    required this.apiKey,
    required this.model,
    Dio? dio,
  }) : _dio = dio ?? Dio(BaseOptions(
         connectTimeout: const Duration(seconds: 30),
         receiveTimeout: const Duration(minutes: 5),
         sendTimeout: const Duration(seconds: 30),
       )) {
    _dio.interceptors.add(const SecureLogInterceptor());
    _dio.interceptors.add(RetryInterceptor(dio: _dio));
  }

  /// 服务商基础地址（如 `https://api.anthropic.com`）。
  final String baseUrl;

  /// API Key，会被放入 `x-api-key` 头。
  final String apiKey;

  /// 模型名（如 `claude-3-5-sonnet-20241022`）。
  final String model;

  final Dio _dio;

  CancelToken? _cancelToken;

  @override
  Stream<AiStreamEvent> chatStream({
    required List<ChatMessage> messages,
    required ChatOptions options,
  }) async* {
    _cancelToken = CancelToken();

    final url = '$baseUrl/v1/messages';

    // 组装 messages 数组（system 不放入其中，单独传入 system 字段）
    final requestMessages = messages
        .map((m) => {'role': m.role.name, 'content': m.content})
        .toList();

    try {
      final response = await _dio.post<ResponseBody>(
        url,
        data: {
          'model': model,
          'max_tokens': options.maxTokens ?? 2048,
          if (options.systemPrompt != null &&
              options.systemPrompt!.isNotEmpty)
            'system': options.systemPrompt,
          'messages': requestMessages,
          'stream': true,
          if (options.temperature != null) 'temperature': options.temperature,
        },
        options: Options(
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'accept': 'text/event-stream',
          },
          responseType: ResponseType.stream,
        ),
        cancelToken: _cancelToken,
      );

      final bodyStream = response.data?.stream;
      if (bodyStream == null) {
        yield const ErrorEvent('响应体为空');
        return;
      }

      // Anthropic 需要 event 与 data 配对，使用专用解析器
      // usage 累积：input_tokens 来自 message_start，output_tokens 来自 message_delta
      var inputTokens = 0;
      var outputTokens = 0;
      await for (final event in _parseAnthropicSse(bodyStream)) {
        final type = event['type'];
        if (type == null) continue;

        switch (type) {
          case 'content_block_delta':
            final text = event['delta']?['text'] as String?;
            if (text != null && text.isNotEmpty) {
              yield TextDeltaEvent(text);
            }
          case 'message_delta':
            // message_delta 携带累积的 output_tokens
            final usage = event['usage'] as Map<String, dynamic>?;
            if (usage != null) {
              final out = _readInt(usage, 'output_tokens');
              if (out > 0) outputTokens = out;
            }
          case 'message_stop':
            // 在结束前 emit usage（若有）
            if (inputTokens > 0 || outputTokens > 0) {
              yield UsageEvent(
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: inputTokens + outputTokens,
              );
            }
            yield const DoneEvent();
            return;
          case 'message_start':
            // message_start.message.usage 携带 input_tokens
            final message =
                event['message'] as Map<String, dynamic>?;
            if (message != null) {
              final usage = message['usage'] as Map<String, dynamic>?;
              if (usage != null) {
                inputTokens = _readInt(usage, 'input_tokens');
              }
            }
            continue;
          case 'ping':
          case 'content_block_start':
          case 'content_block_stop':
            // 这些事件不携带需要 emit 的文本，跳过
            continue;
          default:
            // 未知事件类型，忽略
            continue;
        }
      }
      // 流自然结束但未收到 message_stop 也视为完成
      if (inputTokens > 0 || outputTokens > 0) {
        yield UsageEvent(
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        );
      }
      yield const DoneEvent();
    } on DioException catch (e) {
      if (e.type == DioExceptionType.cancel) return;
      yield AiErrorMapper.errorEvent(e);
    } catch (e) {
      yield AiErrorMapper.errorEvent(e);
    }
  }

  @override
  Future<String> chat({
    required List<ChatMessage> messages,
    required ChatOptions options,
  }) async {
    final buffer = StringBuffer();
    await for (final event
        in chatStream(messages: messages, options: options)) {
      if (event is TextDeltaEvent) {
        buffer.write(event.delta);
      } else if (event is ErrorEvent) {
        throw Exception(event.message);
      }
    }
    return buffer.toString();
  }

  @override
  void cancel() {
    _cancelToken?.cancel();
    _cancelToken = null;
  }

  @override
  Future<bool> testConnection() async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '$baseUrl/v1/messages',
        data: {
          'model': model,
          'max_tokens': 1,
          'messages': [
            {'role': 'user', 'content': 'ping'},
          ],
        },
        options: Options(
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        ),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// 安全读取 JSON 中的整型字段。
  ///
  /// 兼容 `int` 与 `num`（含 `double`）类型；解析失败返回 0。
  static int _readInt(Map<String, dynamic> json, String key) {
    final value = json[key];
    if (value is int) return value;
    if (value is num) return value.toInt();
    return 0;
  }

  /// 解析 Anthropic SSE 流。
  ///
  /// 由于 Anthropic 使用 `event:` + `data:` 配对，且 data 中的 JSON
  /// `type` 字段与 event 一致，这里通过解析 data JSON 提取 `type`
  /// 与相关字段，输出为 `Map<String, dynamic>`。
  ///
  /// 处理规则：
  /// - 累积同一事件内的 `data:` 行（多行以 `\n` 拼接）。
  /// - 空行触发当前事件 emit（解析 data JSON）。
  /// - 忽略注释行与 `event:`、`id:`、`retry:` 行（type 从 data JSON 获取）。
  static Stream<Map<String, dynamic>> _parseAnthropicSse(
    Stream<List<int>> byteStream,
  ) async* {
    // 通过 cast<List<int>> 匹配 utf8.decoder 的输入类型
    // （StreamTransformer 类型不变，Uint8List 流需显式转换）
    final lineStream = byteStream
        .cast<List<int>>()
        .transform(utf8.decoder)
        .transform(const LineSplitter());

    final dataBuffer = <String>[];

    await for (final line in lineStream) {
      if (line.isEmpty) {
        if (dataBuffer.isNotEmpty) {
          final raw = dataBuffer.join('\n');
          dataBuffer.clear();
          try {
            final json = jsonDecode(raw) as Map<String, dynamic>;
            yield json;
          } catch (_) {
            // 解析失败的帧忽略
          }
        }
        continue;
      }

      if (line.startsWith(':')) continue; // 注释

      if (line.startsWith('data:')) {
        var value = line.substring(5);
        if (value.startsWith(' ')) {
          value = value.substring(1);
        }
        dataBuffer.add(value);
        continue;
      }

      // event: / id: / retry: 等字段忽略内容
    }

    // 流结束时 flush 残留
    if (dataBuffer.isNotEmpty) {
      final raw = dataBuffer.join('\n');
      dataBuffer.clear();
      try {
        final json = jsonDecode(raw) as Map<String, dynamic>;
        yield json;
      } catch (_) {
        // 忽略
      }
    }
  }
}
