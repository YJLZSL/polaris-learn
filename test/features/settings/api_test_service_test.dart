// ignore_for_file: lines_longer_than_80_lines

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lingxi_academy/features/settings/api_test_service.dart';

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

void main() {
  // ----------------------------------------------------------------------
  // ApiTestResult 子类结构
  // ----------------------------------------------------------------------
  group('ApiTestResult 子类', () {
    test('ApiTestSuccess.message 应包含延迟毫秒数', () {
      const result = ApiTestSuccess(123);
      expect(result.message, contains('123'));
      expect(result.message, contains('ms'));
      expect(result.message, contains('连接成功'));
    });

    test('ApiTestSuccess.latencyMs 应正确存储', () {
      const result = ApiTestSuccess(456);
      expect(result.latencyMs, 456);
    });

    test('ApiTestAuthError.message 应提示检查 API Key', () {
      const result = ApiTestAuthError();
      expect(result.message, contains('鉴权失败'));
      expect(result.message, contains('API Key'));
    });

    test('ApiTestNetworkError.message 应提示网络问题', () {
      const result = ApiTestNetworkError();
      expect(result.message, contains('网络错误'));
      expect(result.message, contains('Base URL'));
    });

    test('ApiTestTimeoutError.message 应提示超时', () {
      const result = ApiTestTimeoutError();
      expect(result.message, contains('超时'));
    });

    test('ApiTestUnknownError.message 应存储自定义消息', () {
      const result = ApiTestUnknownError('自定义错误');
      expect(result.message, '自定义错误');
    });
  });

  // ----------------------------------------------------------------------
  // ApiTestService 常量与实例化
  // ----------------------------------------------------------------------
  group('ApiTestService 基本属性', () {
    test('timeout 常量应为 10 秒', () {
      expect(ApiTestService.timeout, const Duration(seconds: 10));
    });

    test('可以无参实例化', () {
      expect(() => ApiTestService(), returnsNormally);
    });

    test('apiTestServiceProvider 应返回 ApiTestService 实例', () {
      expect(apiTestServiceProvider, isNotNull);
    });
  });

  // ----------------------------------------------------------------------
  // mapDioException — 鉴权类错误
  // ----------------------------------------------------------------------
  group('ApiTestService.mapDioException 鉴权错误', () {
    test('401 应返回 ApiTestAuthError', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 401,
      );
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestAuthError>());
    });

    test('403 应返回 ApiTestAuthError', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 403,
      );
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestAuthError>());
    });

    test('鉴权错误消息不应包含任何状态码或敏感信息', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 401,
        message: 'Bearer sk-leak-secret-key',
      );
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestAuthError>());
      expect(result.message, isNot(contains('sk-leak')));
      expect(result.message, isNot(contains('Bearer')));
    });
  });

  // ----------------------------------------------------------------------
  // mapDioException — 超时类错误
  // ----------------------------------------------------------------------
  group('ApiTestService.mapDioException 超时错误', () {
    test('connectionTimeout 应返回 ApiTestTimeoutError', () {
      final err = _makeDioException(DioExceptionType.connectionTimeout);
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestTimeoutError>());
    });

    test('receiveTimeout 应返回 ApiTestTimeoutError', () {
      final err = _makeDioException(DioExceptionType.receiveTimeout);
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestTimeoutError>());
    });

    test('sendTimeout 应返回 ApiTestTimeoutError', () {
      final err = _makeDioException(DioExceptionType.sendTimeout);
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestTimeoutError>());
    });

    test('transformTimeout 应返回 ApiTestTimeoutError', () {
      final err = _makeDioException(DioExceptionType.transformTimeout);
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestTimeoutError>());
    });
  });

  // ----------------------------------------------------------------------
  // mapDioException — 网络错误
  // ----------------------------------------------------------------------
  group('ApiTestService.mapDioException 网络错误', () {
    test('connectionError 应返回 ApiTestNetworkError', () {
      final err = _makeDioException(DioExceptionType.connectionError);
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestNetworkError>());
    });
  });

  // ----------------------------------------------------------------------
  // mapDioException — 未知类错误
  // ----------------------------------------------------------------------
  group('ApiTestService.mapDioException 未知错误', () {
    test('badResponse 500 应返回 ApiTestUnknownError', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 500,
      );
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestUnknownError>());
    });

    test('badResponse 404 应返回 ApiTestUnknownError（非鉴权）', () {
      final err = _makeDioException(
        DioExceptionType.badResponse,
        statusCode: 404,
      );
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestUnknownError>());
      expect(result, isNot(isA<ApiTestAuthError>()));
    });

    test('cancel 应返回 ApiTestUnknownError', () {
      final err = _makeDioException(DioExceptionType.cancel);
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestUnknownError>());
    });

    test('badCertificate 应返回 ApiTestUnknownError', () {
      final err = _makeDioException(DioExceptionType.badCertificate);
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestUnknownError>());
    });

    test('unknown 应返回 ApiTestUnknownError', () {
      final err = _makeDioException(DioExceptionType.unknown);
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestUnknownError>());
    });

    test('message 为 null 时应使用默认文本', () {
      final err = _makeDioException(
        DioExceptionType.unknown,
        message: null,
      );
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestUnknownError>());
      expect((result as ApiTestUnknownError).message, '请求失败');
    });

    test('message 为空字符串时应使用默认文本', () {
      final err = _makeDioException(
        DioExceptionType.unknown,
        message: '',
      );
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestUnknownError>());
      expect((result as ApiTestUnknownError).message, '请求失败');
    });
  });

  // ----------------------------------------------------------------------
  // mapDioException — 安全验证
  // ----------------------------------------------------------------------
  group('ApiTestService.mapDioException 安全脱敏', () {
    test('错误消息中的 sk- 密钥应被脱敏', () {
      final err = _makeDioException(
        DioExceptionType.unknown,
        message: 'Auth failed for sk-abcdefghijklmnop1234567890',
      );
      final result = ApiTestService.mapDioException(err);
      expect(result, isA<ApiTestUnknownError>());
      final msg = (result as ApiTestUnknownError).message;
      expect(msg, isNot(contains('sk-abcdefghijklmnop1234567890')));
      expect(msg, contains('[REDACTED]'));
    });

    test('错误消息中的 Bearer Token 应被脱敏', () {
      final err = _makeDioException(
        DioExceptionType.unknown,
        message: 'Header: Bearer sk-test-secret-key-12345',
      );
      final result = ApiTestService.mapDioException(err);
      final msg = (result as ApiTestUnknownError).message;
      expect(msg, isNot(contains('sk-test-secret-key-12345')));
      expect(msg, contains('[REDACTED]'));
    });

    test('错误消息中的 Google API Key (AIza) 应被脱敏', () {
      final err = _makeDioException(
        DioExceptionType.unknown,
        message: 'Key AIzaSyB1234567890abcdefghijklmnopqrstuv',
      );
      final result = ApiTestService.mapDioException(err);
      final msg = (result as ApiTestUnknownError).message;
      expect(msg, isNot(contains('AIzaSyB1234567890abcdefghijklmnopqrstuv')));
      expect(msg, contains('[REDACTED]'));
    });

    test('无密钥的普通错误消息应原样返回', () {
      final err = _makeDioException(
        DioExceptionType.unknown,
        message: '服务器内部错误',
      );
      final result = ApiTestService.mapDioException(err);
      expect((result as ApiTestUnknownError).message, '服务器内部错误');
    });

    test('错误消息中同时出现多种密钥应全部脱敏', () {
      final err = _makeDioException(
        DioExceptionType.unknown,
        message: 'keys: sk-aaaaaaaaaa and AIzaSyB1234567890abcdefghij',
      );
      final result = ApiTestService.mapDioException(err);
      final msg = (result as ApiTestUnknownError).message;
      expect(msg, isNot(contains('sk-aaaaaaaaaa')));
      expect(msg, isNot(contains('AIzaSyB1234567890abcdefghij')));
    });
  });

  // ----------------------------------------------------------------------
  // sanitize
  // ----------------------------------------------------------------------
  group('ApiTestService.sanitize', () {
    test('应脱敏 sk- 开头的密钥', () {
      const text = 'Error with sk-abcdefghijklmnop key';
      final result = ApiTestService.sanitize(text);
      expect(result, isNot(contains('sk-abcdefghijklmnop')));
      expect(result, contains('[REDACTED]'));
    });

    test('应脱敏 Bearer Token', () {
      const text = 'Authorization: Bearer abcdefghij1234567890';
      final result = ApiTestService.sanitize(text);
      expect(result, isNot(contains('abcdefghij1234567890')));
      expect(result, contains('[REDACTED]'));
    });

    test('应脱敏 AIza 开头的 Google API Key', () {
      const text = 'Using AIzaSyA1234567890bcdefghij';
      final result = ApiTestService.sanitize(text);
      expect(result, isNot(contains('AIzaSyA1234567890bcdefghij')));
      expect(result, contains('[REDACTED]'));
    });

    test('脱敏后不应包含原始密钥', () {
      const text = 'failed sk-secretkey1234567890 done';
      final result = ApiTestService.sanitize(text);
      expect(result, isNot(contains('sk-secretkey1234567890')));
    });

    test('无密钥的文本应原样返回', () {
      const text = '这是一个普通错误消息，无密钥';
      expect(ApiTestService.sanitize(text), text);
    });

    test('空字符串应原样返回', () {
      expect(ApiTestService.sanitize(''), '');
    });

    test('过短的疑似密钥不应被脱敏（少于 6 字符后缀）', () {
      // sk- 后跟不足 6 个字符，不匹配正则
      const text = 'short sk-abc key';
      final result = ApiTestService.sanitize(text);
      // sk-abc 只有 3 个字符后缀，不匹配 {6,}，原样返回
      expect(result, contains('sk-abc'));
    });

    test('密钥包含下划线和连字符应被脱敏', () {
      const text = 'key: sk-test_key-123456';
      final result = ApiTestService.sanitize(text);
      expect(result, isNot(contains('sk-test_key-123456')));
      expect(result, contains('[REDACTED]'));
    });

    test('多个相同密钥应全部被脱敏', () {
      const text = 'sk-aaaaaaaaaa and sk-aaaaaaaaaa again';
      final result = ApiTestService.sanitize(text);
      expect(result, isNot(contains('sk-aaaaaaaaaa')));
      // 应出现两次 [REDACTED]
      expect('[REDACTED]'.allMatches(result).length, 2);
    });

    test('不同类型密钥同时出现应全部脱敏', () {
      const text = 'openai: sk-abcdefghij google: AIzaSyB1234567890abcd';
      final result = ApiTestService.sanitize(text);
      expect(result, isNot(contains('sk-abcdefghij')));
      expect(result, isNot(contains('AIzaSyB1234567890abcd')));
    });
  });
}
