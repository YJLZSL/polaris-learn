import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/provider_config.dart';
import '../ai/ai_provider.dart';
import '../ai/anthropic_provider.dart';
import '../ai/gemini_provider.dart';
import '../ai/ollama_provider.dart';
import '../ai/openai_compatible_provider.dart';

/// 连接测试结果（sealed 类型，便于 UI exhaustive 模式匹配）。
///
/// - [ApiTestSuccess]：连接成功，附带往返延迟。
/// - [ApiTestAuthError]：鉴权失败（401/403），提示检查 API Key。
/// - [ApiTestNetworkError]：网络层错误（DNS、连接拒绝、服务器 5xx 等）。
/// - [ApiTestTimeoutError]：请求超时（默认上限 10 秒）。
/// - [ApiTestUnknownError]：其他未知错误，附带不暴露密钥的安全消息。
sealed class ApiTestResult {
  const ApiTestResult();

  /// 用户可见的友好提示（不含任何 API Key 信息）。
  String get message;
}

/// 连接成功。
class ApiTestSuccess extends ApiTestResult {
  const ApiTestSuccess(this.latencyMs);

  /// 往返延迟（毫秒）。
  final int latencyMs;

  @override
  String get message => '连接成功（${latencyMs}ms）';
}

/// 鉴权失败。
class ApiTestAuthError extends ApiTestResult {
  const ApiTestAuthError();

  @override
  String get message => '鉴权失败，请检查 API Key';
}

/// 网络错误。
class ApiTestNetworkError extends ApiTestResult {
  const ApiTestNetworkError();

  @override
  String get message => '网络错误，请检查 Base URL 或网络连接';
}

/// 超时错误。
class ApiTestTimeoutError extends ApiTestResult {
  const ApiTestTimeoutError();

  @override
  String get message => '连接超时，请稍后重试';
}

/// 未知错误。
class ApiTestUnknownError extends ApiTestResult {
  const ApiTestUnknownError(this.message);
  @override
  final String message;
}

/// AI Provider 连接测试服务。
///
/// 根据传入的 [ProviderConfig] **临时**创建对应 [AiProvider] 实例
/// （不写入仓库），发送一条 ping 消息，超时 10 秒，返回 [ApiTestResult]。
///
/// 错误信息严格脱敏：不暴露完整 API Key，鉴权失败统一提示
/// "鉴权失败，请检查 API Key"。
class ApiTestService {
  /// 测试连接的超时上限。
  static const timeout = Duration(seconds: 10);

  /// 用于探测的 ping 消息文本。
  static const _pingMessage = '请回复 PONG';

  /// 根据 [config] 临时创建 [AiProvider] 实例（不持久化）。
  AiProvider _createProvider(ProviderConfig config) {
    switch (config.providerType) {
      case ProviderType.openaiCompatible:
        return OpenAICompatibleProvider(
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
        );
      case ProviderType.anthropic:
        return AnthropicProvider(
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
        );
      case ProviderType.gemini:
        return GeminiProvider(
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
        );
      case ProviderType.ollama:
        return OllamaProvider(
          baseUrl: config.baseUrl,
          model: config.model,
        );
    }
  }

  /// 测试与 [config] 对应服务商的连接。
  ///
  /// 流程：
  /// 1. 临时创建 Provider 实例。
  /// 2. 发送一条 `请回复 PONG` 的 ping 消息（非流式）。
  /// 3. 超时 10 秒。
  /// 4. 根据异常类型映射为 [ApiTestResult] 子类，确保不泄露 API Key。
  Future<ApiTestResult> testConnection(ProviderConfig config) async {
    final provider = _createProvider(config);
    final stopwatch = Stopwatch()..start();

    try {
      await provider.chat(
        messages: [ChatMessage.user(_pingMessage)],
        options: const ChatOptions(
          maxTokens: 16,
          temperature: 0.0,
        ),
      ).timeout(timeout);
      stopwatch.stop();
      return ApiTestSuccess(stopwatch.elapsedMilliseconds);
    } on TimeoutException {
      return const ApiTestTimeoutError();
    } on DioException catch (e) {
      return mapDioException(e);
    } catch (e) {
      // 兜底：将异常文本脱敏后返回，避免原始错误中可能包含的密钥
      return ApiTestUnknownError(sanitize(e.toString()));
    } finally {
      provider.cancel();
    }
  }

  /// 将 [DioException] 映射为安全的 [ApiTestResult]。
  ///
  /// - 401/403 → [ApiTestAuthError]
  /// - connectionTimeout/receiveTimeout → [ApiTestTimeoutError]
  /// - 其他网络类错误 → [ApiTestNetworkError]
  /// - 带有状态码的响应错误（非鉴权）→ [ApiTestUnknownError]（脱敏）
  static ApiTestResult mapDioException(DioException e) {
    final code = e.response?.statusCode;
    if (code == 401 || code == 403) {
      return const ApiTestAuthError();
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.transformTimeout:
        return const ApiTestTimeoutError();
      case DioExceptionType.connectionError:
        return const ApiTestNetworkError();
      case DioExceptionType.badResponse:
      case DioExceptionType.cancel:
      case DioExceptionType.badCertificate:
      case DioExceptionType.unknown:
        return ApiTestUnknownError(sanitize(e.message ?? '请求失败'));
    }
  }

  /// 脱敏处理：移除字符串中可能出现的密钥模式（如 `sk-...`、`Bearer ...`）。
  ///
  /// 使用正则匹配常见密钥前缀，替换为 `[REDACTED]`，避免错误日志泄露。
  static final keyPatterns = <RegExp>[
    RegExp(r'sk-[A-Za-z0-9_\-]{6,}'),
    RegExp(r'Bearer\s+[A-Za-z0-9_\-\.]{6,}'),
    RegExp(r'AIza[A-Za-z0-9_\-]{6,}'),
  ];

  static String sanitize(String text) {
    var result = text;
    for (final pattern in keyPatterns) {
      result = result.replaceAll(pattern, '[REDACTED]');
    }
    return result;
  }
}

/// [ApiTestService] 提供者。
final apiTestServiceProvider = Provider<ApiTestService>((ref) {
  return ApiTestService();
});
