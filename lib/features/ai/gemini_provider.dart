import 'dart:convert';

import 'package:dio/dio.dart';

import 'ai_error_mapper.dart';
import 'ai_provider.dart';
import 'retry_interceptor.dart';
import 'secure_log_interceptor.dart';
import 'sse_transformer.dart';

/// Google Gemini API Provider。
///
/// 适配 Gemini 的 `streamGenerateContent` 接口（SSE 模式）：
///
/// ```http
/// POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={apiKey}&alt=sse
/// ```
///
/// 请求体：
/// ```json
/// {
///   "contents": [{"role": "user", "parts": [{"text": "消息"}]}],
///   "systemInstruction": {"parts": [{"text": "系统提示词"}]},
///   "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}
/// }
/// ```
///
/// 角色映射：`user` → `user`，`assistant` → `model`。
/// 流式响应为标准 SSE，每帧 `data:` JSON 中 `candidates[0].content.parts[0].text`
/// 为增量文本。
class GeminiProvider implements AiProvider {
  GeminiProvider({
    required this.apiKey,
    required this.model,
    this.baseUrl = 'https://generativelanguage.googleapis.com',
    Dio? dio,
  }) : _dio = dio ?? Dio(BaseOptions(
         connectTimeout: const Duration(seconds: 30),
         receiveTimeout: const Duration(minutes: 5),
         sendTimeout: const Duration(seconds: 30),
       )) {
    _dio.interceptors.add(const SecureLogInterceptor());
    _dio.interceptors.add(RetryInterceptor(dio: _dio));
  }

  /// 服务商基础地址（默认 Google 官方）。
  final String baseUrl;

  /// API Key，作为 URL 查询参数 `key` 传递。
  final String apiKey;

  /// 模型名（如 `gemini-1.5-flash`）。
  final String model;

  final Dio _dio;

  CancelToken? _cancelToken;

  @override
  Stream<AiStreamEvent> chatStream({
    required List<ChatMessage> messages,
    required ChatOptions options,
  }) async* {
    _cancelToken = CancelToken();

    final url =
        '$baseUrl/v1beta/models/$model:streamGenerateContent?key=$apiKey&alt=sse';

    // 将 ChatMessage 转为 Gemini contents 格式（role: user/model）
    final contents = messages.map((m) {
      final role = m.role == MessageRole.assistant ? 'model' : 'user';
      return {
        'role': role,
        'parts': [
          {'text': m.content},
        ],
      };
    }).toList();

    try {
      final response = await _dio.post<ResponseBody>(
        url,
        data: {
          'contents': contents,
          if (options.systemPrompt != null &&
              options.systemPrompt!.isNotEmpty)
            'systemInstruction': {
              'parts': [
                {'text': options.systemPrompt},
              ],
            },
          'generationConfig': {
            if (options.temperature != null)
              'temperature': options.temperature,
            if (options.maxTokens != null)
              'maxOutputTokens': options.maxTokens,
          },
        },
        options: Options(
          headers: {
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

      // Gemini 使用标准 SSE（alt=sse）
      await for (final data in SseTransformer.parse(bodyStream)) {
        // Gemini 不会发送 [DONE]；每帧都是 JSON
        try {
          final json = jsonDecode(data) as Map<String, dynamic>;

          // 解析 usageMetadata（通常在最后一个 chunk 中）
          final usageMetadata =
              json['usageMetadata'] as Map<String, dynamic>?;
          if (usageMetadata != null) {
            final promptTokens = _readInt(usageMetadata, 'promptTokenCount');
            final completionTokens =
                _readInt(usageMetadata, 'candidatesTokenCount');
            final totalTokens = _readInt(usageMetadata, 'totalTokenCount');
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

          final candidates = json['candidates'] as List<dynamic>?;
          if (candidates == null || candidates.isEmpty) continue;

          final content = candidates[0]['content'] as Map<String, dynamic>?;
          if (content == null) continue;

          final parts = content['parts'] as List<dynamic>?;
          if (parts == null || parts.isEmpty) continue;

          final text = parts[0]['text'] as String?;
          if (text != null && text.isNotEmpty) {
            yield TextDeltaEvent(text);
          }

          // 检查 finishReason，若存在则视为结束
          final finishReason = candidates[0]['finishReason'] as String?;
          if (finishReason != null &&
              finishReason != 'FINISH_REASON_UNSPECIFIED') {
            yield const DoneEvent();
            return;
          }
        } catch (_) {
          // 忽略无法解析的帧
        }
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
      final url =
          '$baseUrl/v1beta/models/$model:generateContent?key=$apiKey';
      final response = await _dio.post<Map<String, dynamic>>(
        url,
        data: {
          'contents': [
            {
              'role': 'user',
              'parts': [
                {'text': 'ping'},
              ],
            },
          ],
          'generationConfig': {'maxOutputTokens': 1},
        },
        options: Options(
          headers: {'Content-Type': 'application/json'},
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
