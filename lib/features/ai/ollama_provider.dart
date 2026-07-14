import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import 'ai_error_mapper.dart';
import 'ai_provider.dart';
import 'retry_interceptor.dart';
import 'secure_log_interceptor.dart';

/// 本地 Ollama Provider。
///
/// 适配 Ollama 的 `/api/chat` 接口：
///
/// ```http
/// POST {baseUrl}/api/chat
/// ```
///
/// 请求体：
/// ```json
/// {
///   "model": "llama3.2",
///   "messages": [{"role": "user", "content": "消息"}],
///   "stream": true,
///   "options": {"temperature": 0.7}
/// }
/// ```
///
/// 响应为 **NDJSON**（每行一个 JSON 对象，非 SSE）：
/// ```json
/// {"model":"llama3.2","message":{"role":"assistant","content":"片段"},"done":false}
/// {"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}
/// ```
///
/// - 系统提示词作为 messages 数组首条 `system` 消息注入。
/// - **不需要 API Key**（本地服务）。
/// - 当某行 `done=true` 时流结束。
class OllamaProvider implements AiProvider {
  OllamaProvider({
    required this.baseUrl,
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

  /// 服务商基础地址（默认 `http://localhost:11434`）。
  final String baseUrl;

  /// 模型名（如 `llama3.2`）。
  final String model;

  final Dio _dio;

  CancelToken? _cancelToken;

  @override
  Stream<AiStreamEvent> chatStream({
    required List<ChatMessage> messages,
    required ChatOptions options,
  }) async* {
    _cancelToken = CancelToken();

    final url = '$baseUrl/api/chat';

    // 组装 messages：systemPrompt 作为首条 system 消息
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
          if (options.temperature != null)
            'options': {'temperature': options.temperature},
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/x-ndjson',
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

      // Ollama 使用 NDJSON（每行一个 JSON），用行分割器处理
      // 通过 cast<List<int>> 匹配 utf8.decoder 的输入类型
      // （StreamTransformer 类型不变，Uint8List 流需显式转换）
      final lineStream = bodyStream
          .cast<List<int>>()
          .transform(utf8.decoder)
          .transform(const LineSplitter());

      await for (final line in lineStream) {
        if (line.isEmpty) continue;
        try {
          final json = jsonDecode(line) as Map<String, dynamic>;
          final content = json['message']?['content'] as String?;
          if (content != null && content.isNotEmpty) {
            yield TextDeltaEvent(content);
          }
          final done = json['done'] as bool? ?? false;
          if (done) {
            // done=true 的最后一条 chunk 通常携带完整 usage 信息
            final promptTokens = _readInt(json, 'prompt_eval_count');
            final completionTokens = _readInt(json, 'eval_count');
            if (promptTokens > 0 || completionTokens > 0) {
              yield UsageEvent(
                promptTokens: promptTokens,
                completionTokens: completionTokens,
                totalTokens: promptTokens + completionTokens,
              );
            }
            yield const DoneEvent();
            return;
          }
        } catch (_) {
          // 忽略解析失败的行
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
      // Ollama 健康检查端点
      final response = await _dio.get<dynamic>('$baseUrl/api/tags');
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
