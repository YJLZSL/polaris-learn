import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 需要从日志中脱敏的请求头名称（小写比较）。
///
/// - `authorization`：OpenAI 兼容与部分服务商使用 Bearer Token。
/// - `x-api-key`：Anthropic Claude 使用。
/// - `x-goog-api-key`：Google Gemini 使用。
const _sensitiveHeaders = <String>{
  'authorization',
  'x-api-key',
  'x-goog-api-key',
};

/// 需要从日志中脱敏的查询参数名（小写比较）。
///
/// Gemini 风格将 API Key 放在 URL 查询参数 `key` 中。
const _sensitiveQueryParams = <String>{
  'key',
  'api_key',
};

/// 需要从请求体中脱敏的字段名。
const _sensitiveBodyFields = <String>{
  'api_key',
  'apikey',
  'apiKey',
  'key',
};

/// 日志脱敏后的占位文本。
const kRedactedPlaceholder = '[REDACTED]';

/// 安全日志拦截器。
///
/// 继承自 dio 的 [Interceptor]，在 [onRequest]/[onResponse]/[onError]
/// 中输出请求/响应日志，但会自动过滤敏感信息（API Key、Authorization
/// 头、查询参数中的 key、请求体中的 api_key 字段），将其替换为
/// `[REDACTED]`，避免密钥泄露到日志。
///
/// 所有脱敏逻辑以静态方法暴露（[redactHeaders]、[redactQueryParameters]、
/// [redactBody]、[redactUrl]），便于单元测试覆盖。
class SecureLogInterceptor extends Interceptor {
  const SecureLogInterceptor({this.logger = _defaultLogger});

  /// 实际输出日志的回调，默认使用 [debugPrint]。
  ///
  /// 测试时可注入自定义回调以捕获输出。
  final void Function(String message) logger;

  /// 默认日志输出：开发期使用 [debugPrint]，避免被 [avoid_print] 规则拦截。
  static void _defaultLogger(String message) => debugPrint(message);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final method = options.method;
    final safeUrl = redactUrl(options.uri.toString());
    final safeHeaders = redactHeaders(options.headers);
    final safeQuery = redactQueryParameters(
      Map<String, dynamic>.from(options.queryParameters),
    );
    final safeBody = redactBody(options.data);

    final buffer = StringBuffer()
      ..writeln('┌── HTTP REQUEST ─────────────────────────')
      ..writeln('│ $method $safeUrl')
      ..writeln('│ query: ${jsonEncode(safeQuery)}')
      ..writeln('│ headers: ${jsonEncode(safeHeaders)}')
      ..writeln('│ body: ${_encodeBody(safeBody)}')
      ..writeln('└─────────────────────────────────────────');
    logger(buffer.toString());

    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response,
      ResponseInterceptorHandler handler) {
    final code = response.statusCode ?? 0;
    final safeUrl = redactUrl(response.requestOptions.uri.toString());

    final buffer = StringBuffer()
      ..writeln('┌── HTTP RESPONSE ────────────────────────')
      ..writeln('│ $code $safeUrl')
      ..writeln('└─────────────────────────────────────────');
    logger(buffer.toString());

    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final code = err.response?.statusCode ?? 0;
    final safeUrl = redactUrl(err.requestOptions.uri.toString());
    final type = err.type.name;

    final buffer = StringBuffer()
      ..writeln('┌── HTTP ERROR ───────────────────────────')
      ..writeln('│ type=$type status=$code url=$safeUrl')
      ..writeln('│ message=${err.message ?? kRedactedPlaceholder}')
      ..writeln('└─────────────────────────────────────────');
    logger(buffer.toString());

    handler.next(err);
  }

  /// 脱敏请求头映射：敏感键的值替换为 `[REDACTED]`。
  ///
  /// 返回新 Map，不修改入参。键名按小写比较。
  static Map<String, String> redactHeaders(Map<String, dynamic> headers) {
    final result = <String, String>{};
    headers.forEach((key, value) {
      final strValue = value?.toString() ?? '';
      if (_sensitiveHeaders.contains(key.toLowerCase())) {
        result[key] = kRedactedPlaceholder;
      } else {
        result[key] = strValue;
      }
    });
    return result;
  }

  /// 脱敏查询参数映射：敏感键的值替换为 `[REDACTED]`。
  static Map<String, dynamic> redactQueryParameters(
      Map<String, dynamic> params) {
    final result = <String, dynamic>{};
    params.forEach((key, value) {
      if (_sensitiveQueryParams.contains(key.toLowerCase())) {
        result[key] = kRedactedPlaceholder;
      } else {
        result[key] = value;
      }
    });
    return result;
  }

  /// 脱敏 URL：移除/替换查询串中敏感参数的值。
  ///
  /// 解析 URL 查询参数，将 `key`、`api_key` 的值替换为 `[REDACTED]`，
  /// 其余保持不变。解析失败时返回原 URL（保守策略，避免误改）。
  static String redactUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null || uri.queryParameters.isEmpty) return url;

    final safeParams = <String, String>{};
    uri.queryParameters.forEach((key, value) {
      if (_sensitiveQueryParams.contains(key.toLowerCase())) {
        safeParams[key] = kRedactedPlaceholder;
      } else {
        safeParams[key] = value;
      }
    });
    return uri.replace(queryParameters: safeParams).toString();
  }

  /// 脱敏请求体：深拷贝并将敏感字段（如 `api_key`）值替换为 `[REDACTED]`。
  ///
  /// 支持的输入类型：
  /// - `Map<String, dynamic>`：递归处理，敏感字段值替换。
  /// - `List`：逐项递归处理。
  /// - `String`：尝试解析为 JSON 后递归处理，解析失败原样返回。
  /// - 其他类型：原样返回。
  static Object? redactBody(Object? body) {
    if (body is Map<String, dynamic>) {
      return _redactMap(body);
    }
    if (body is Map) {
      return _redactMap(Map<String, dynamic>.from(body));
    }
    if (body is List) {
      return body.map(_redactDynamic).toList();
    }
    if (body is String) {
      // 字符串可能是 JSON 文本，尝试解析后脱敏再编码回字符串
      try {
        final decoded = jsonDecode(body);
        if (decoded is Map<String, dynamic>) {
          return jsonEncode(_redactMap(decoded));
        }
        if (decoded is List) {
          return jsonEncode(decoded.map(_redactDynamic).toList());
        }
      } catch (_) {
        // 非 JSON 字符串，原样返回
      }
      return body;
    }
    return body;
  }

  static Map<String, dynamic> _redactMap(Map<String, dynamic> map) {
    final result = <String, dynamic>{};
    map.forEach((key, value) {
      if (_sensitiveBodyFields.contains(key)) {
        result[key] = kRedactedPlaceholder;
      } else {
        result[key] = _redactDynamic(value);
      }
    });
    return result;
  }

  static Object? _redactDynamic(Object? value) {
    if (value is Map<String, dynamic>) return _redactMap(value);
    if (value is Map) return _redactMap(Map<String, dynamic>.from(value));
    if (value is List) return value.map(_redactDynamic).toList();
    return value;
  }

  /// 将脱敏后的 body 编码为字符串用于日志输出。
  static String _encodeBody(Object? body) {
    if (body == null) return 'null';
    if (body is String) return body;
    try {
      return jsonEncode(body);
    } catch (_) {
      return body.toString();
    }
  }
}

/// [SecureLogInterceptor] 提供者。
///
/// 单例：可在 AI Provider 创建 Dio 时通过
/// `dio.interceptors.add(ref.read(secureLogInterceptorProvider))` 注入，
/// 保证日志中不泄露 API Key。
final secureLogInterceptorProvider = Provider<SecureLogInterceptor>((ref) {
  return const SecureLogInterceptor();
});
