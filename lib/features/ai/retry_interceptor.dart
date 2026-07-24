import 'dart:async';

import 'package:dio/dio.dart';

/// 重试拦截器。
///
/// 在连接阶段失败时自动重试，提升 AI 请求的可靠性。仅对以下错误重试：
///
/// - [DioExceptionType.connectionError]
/// - [DioExceptionType.connectionTimeout]
/// - [DioExceptionType.sendTimeout]
/// - [DioExceptionType.receiveTimeout]
/// - [DioExceptionType.badResponse] 且 statusCode >= 500
///
/// 不重试的情况：
/// - [DioExceptionType.cancel]（用户主动取消）
/// - [DioExceptionType.badCertificate] / [DioExceptionType.unknown] / [DioExceptionType.transformTimeout]
///
/// 重试次数通过 [RequestOptions.extra] 中的 [retryCountKey] 跟踪，
/// 每次重试前等待 [backoffDelays] 中对应的延迟。
///
/// 注意：由于 chatStream 使用流式响应（responseType: stream），本拦截器
/// 主要保护"连接建立"阶段的失败。一旦流开始接收数据，后续错误不会被
/// Dio Interceptor 捕获。
class RetryInterceptor extends Interceptor {
  RetryInterceptor({
    required Dio dio,
    this.maxRetries = 3,
    this.backoffDelays = const [
      Duration(milliseconds: 500),
      Duration(seconds: 1),
      Duration(seconds: 2),
    ],
  }) : _dio = dio;

  /// 重试所依附的 Dio 实例，用于调用 `fetch` 重发请求。
  final Dio _dio;

  /// 最大重试次数。
  final int maxRetries;

  /// 每次重试前的退避延迟列表。
  ///
  /// 索引 0 对应第一次重试前的延迟，索引 1 对应第二次，以此类推。
  /// 若重试次数超过列表长度，使用最后一个延迟值。
  final List<Duration> backoffDelays;

  /// RequestOptions.extra 中记录重试次数的键名。
  static const String retryCountKey = 'retryCount';

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (!_shouldRetry(err)) {
      handler.next(err);
      return;
    }

    final retryCount = err.requestOptions.extra[retryCountKey] as int? ?? 0;
    if (retryCount >= maxRetries) {
      handler.next(err);
      return;
    }

    final delay = _backoffFor(retryCount);

    // 复制 RequestOptions 并递增 retryCount，使重试请求经过完整拦截器链。
    final newOptions = err.requestOptions.copyWith(
      extra: {
        ...err.requestOptions.extra,
        retryCountKey: retryCount + 1,
      },
    );

    Future.delayed(delay, () async {
      try {
        final response = await _dio.fetch<dynamic>(newOptions);
        handler.resolve(response);
      } on DioException catch (e) {
        // 重试失败（可能已触发内部递归重试），将最终错误放行。
        handler.next(e);
      } catch (e) {
        // 非 DioException 异常，放行原始错误以保证用户可见一致性。
        handler.next(err);
      }
    });
  }

  /// 判断错误是否应重试。
  bool _shouldRetry(DioException err) {
    switch (err.type) {
      case DioExceptionType.connectionError:
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return true;
      case DioExceptionType.badResponse:
        final code = err.response?.statusCode;
        return code != null && code >= 500;
      case DioExceptionType.cancel:
      case DioExceptionType.badCertificate:
      case DioExceptionType.unknown:
      case DioExceptionType.transformTimeout:
        return false;
    }
  }

  /// 获取第 [retryCount] 次重试的退避延迟。
  Duration _backoffFor(int retryCount) {
    if (backoffDelays.isEmpty) return Duration.zero;
    if (retryCount < backoffDelays.length) return backoffDelays[retryCount];
    return backoffDelays.last;
  }
}
