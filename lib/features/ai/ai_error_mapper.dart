import 'package:dio/dio.dart';

import 'ai_provider.dart';

/// AI 错误映射工具。
///
/// 将 [DioException]（以及普通 [Object] 异常）映射为面向用户的中文友好提示。
/// 该类为纯函数集合，不依赖任何 Riverpod Provider，可在任意位置调用。
///
/// 设计目标：
/// - 屏蔽 dio 异常细节，向用户展示可读的中文错误描述。
/// - 鉴权类错误明确提示检查 API Key，但不暴露 Key 本身。
/// - 非 [DioException] 异常兜底处理，截断过长文本避免 UI 溢出。
class AiErrorMapper {
  const AiErrorMapper._();

  /// 非 DioException 错误消息的最大长度（截断后）。
  static const int maxGenericMessageLength = 200;

  /// 将 [error] 映射为中文用户可读消息。
  ///
  /// - [DioException]：根据 [DioExceptionType] 与 HTTP 状态码返回对应提示。
  /// - 其他异常：返回 `error.toString()`，截断到 [maxGenericMessageLength] 字符。
  static String mapException(Object error) {
    if (error is! DioException) {
      return _truncate(error.toString(), maxGenericMessageLength);
    }

    final e = error;
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        return '连接超时，请检查网络或 Base URL';
      case DioExceptionType.sendTimeout:
        return '发送超时，请检查网络';
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return '接收超时，AI 响应时间过长';
      case DioExceptionType.connectionError:
        return '网络连接失败，请检查网络或 Base URL';
      case DioExceptionType.badResponse:
        return _mapBadResponse(e);
      case DioExceptionType.cancel:
        return '请求已取消';
      case DioExceptionType.badCertificate:
        return '证书验证失败';
      case DioExceptionType.unknown:
        final msg = e.message;
        if (msg != null && msg.isNotEmpty) return msg;
        return '未知错误';
    }
  }

  /// 根据 [DioException.response] 的状态码映射 badResponse 错误。
  ///
  /// - 401 → 鉴权失败
  /// - 403 → 访问被拒绝
  /// - 404 → 接口不存在
  /// - 429 → 请求频繁
  /// - 500-599 → 服务器错误
  /// - 其他 → 带状态码的通用提示
  static String _mapBadResponse(DioException e) {
    final code = e.response?.statusCode;
    if (code == null) return '请求失败';

    switch (code) {
      case 401:
        return '鉴权失败，请检查 API Key';
      case 403:
        return '访问被拒绝，请检查 API Key 权限';
      case 404:
        return '接口不存在，请检查 Base URL';
      case 429:
        return '请求过于频繁，请稍后重试';
      default:
        if (code >= 500 && code <= 599) {
          return '服务器错误，请稍后重试';
        }
        return '请求失败（状态码：$code）';
    }
  }

  /// 将 [error] 映射为 [ErrorEvent]（[AiStreamEvent] 的错误子类）。
  ///
  /// 等价于 `ErrorEvent(mapException(error))`，便于在 `chatStream` 的
  /// catch 块中一行调用。
  static AiStreamEvent errorEvent(Object error) {
    return ErrorEvent(mapException(error));
  }

  /// 将字符串截断到 [maxLength] 字符。
  static String _truncate(String s, int maxLength) {
    if (s.length <= maxLength) return s;
    return s.substring(0, maxLength);
  }
}
