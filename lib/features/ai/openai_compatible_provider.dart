import 'dart:convert';

import 'package:dio/dio.dart';

import 'ai_error_mapper.dart';
import 'ai_provider.dart';
import 'retry_interceptor.dart';
import 'secure_log_interceptor.dart';
import 'sse_transformer.dart';

/// OpenAI 兼容 API Provider。
///
/// 适配所有兼容 OpenAI Chat Completions 协议的服务商（OpenAI 官方、
/// DeepSeek、Moonshot、本地 vLLM 等）。请求格式：
///
/// ```json
/// POST {baseUrl}/chat/completions
/// Authorization: Bearer {apiKey}
/// {
///   "model": "...",
///   "messages": [...],
///   "stream": true,
///   "temperature": ...,
///   "max_tokens": ...
/// }
/// ```
///
/// 流式响应为标准 SSE 格式，每帧 `data:` 字段为 JSON，包含
/// `choices[0].delta.content`；`data: [DONE]` 表示流结束。
class OpenAICompatibleProvider implements AiProvider {
  OpenAICompatibleProvider({
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

  /// 服务商基础地址（如 `https://api.openai.com/v1`）。
  final String baseUrl;

  /// API Key，会被放入 `Authorization: Bearer` 头。
  final String apiKey;

  /// 模型名（如 `gpt-4o-mini`）。
  final String model;

  final Dio _dio;

  /// 当前请求的取消令牌；非空表示有进行中的请求。
  CancelToken? _cancelToken;

  @override
  Stream<AiStreamEvent> chatStream({
    required List<ChatMessage> messages,
    required ChatOptions options,
  }) async* {
    _cancelToken = CancelToken();

    final url = '$baseUrl/chat/completions';
    // 组装请求体：systemPrompt 作为首条 system 消息注入
    final requestMessages = <Map<String, dynamic>>[
      if (options.systemPrompt != null && options.systemPrompt!.isNotEmpty)
        {'role': 'system', 'content': options.systemPrompt},
      ...messages.map(
        (m) => {'role': m.role.name, 'content': m.content},
      ),
    ];

    try {
      final response = await _dio.post<ResponseBody>(
        url,
        data: {
          'model': model,
          'messages': requestMessages,
          'stream': true,
          // 请求 usage 字段：OpenAI 在最后一个 chunk（choices 为空）中返回 usage
          'stream_options': {'include_usage': true},
          if (options.temperature != null) 'temperature': options.temperature,
          if (options.maxTokens != null) 'max_tokens': options.maxTokens,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $apiKey',
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
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

      // 解析 SSE 流并提取增量文本与 usage
      await for (final data in SseTransformer.parse(bodyStream)) {
        if (data == '[DONE]') {
          yield const DoneEvent();
          return;
        }
        try {
          final json = jsonDecode(data) as Map<String, dynamic>;

          // 1. 解析 usage（通常出现在最后一个 chunk，choices 为空数组）
          final usage = json['usage'] as Map<String, dynamic>?;
          if (usage != null) {
            final promptTokens = _readInt(usage, 'prompt_tokens');
            final completionTokens = _readInt(usage, 'completion_tokens');
            final totalTokens = _readInt(usage, 'total_tokens');
            if (promptTokens > 0 || completionTokens > 0) {
              yield UsageEvent(
                promptTokens: promptTokens,
                completionTokens: completionTokens,
                totalTokens: totalTokens > 0
                    ? totalTokens
                    : promptTokens + completionTokens,
              );
            }
          }

          // 2. 解析 choices[0].delta 中的 content 与 reasoning_content
          final choices = json['choices'] as List<dynamic>?;
          if (choices == null || choices.isEmpty) continue;
          final delta = choices[0]['delta'] as Map<String, dynamic>?;
          if (delta == null) continue;

          // reasoning_content（DeepSeek-R1 / o1 / o3 等推理模型）
          final reasoning = delta['reasoning_content'] as String?;
          if (reasoning != null && reasoning.isNotEmpty) {
            yield TextDeltaEvent(reasoning);
          }

          // 正常 content
          final content = delta['content'] as String?;
          if (content != null && content.isNotEmpty) {
            yield TextDeltaEvent(content);
          }
        } catch (_) {
          // 忽略无法解析的帧（保持流式不中断）
        }
      }
      // 流自然结束但未收到 [DONE] 也视为完成
      yield const DoneEvent();
    } on DioException catch (e) {
      // 取消请求时静默结束，不抛错
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
        '$baseUrl/chat/completions',
        data: {
          'model': model,
          'messages': [
            {'role': 'user', 'content': 'ping'},
          ],
          'max_tokens': 1,
        },
        options: Options(
          headers: {'Authorization': 'Bearer $apiKey'},
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
}
