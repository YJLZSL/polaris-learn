// ignore_for_file: lines_longer_than_80_lines

import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/features/ai/secure_log_interceptor.dart';

void main() {
  // ----------------------------------------------------------------------
  // redactHeaders
  // ----------------------------------------------------------------------
  group('SecureLogInterceptor.redactHeaders', () {
    test('authorization 头应被脱敏', () {
      final result = SecureLogInterceptor.redactHeaders(<String, dynamic>{
        'authorization': 'Bearer sk-secret-123',
        'content-type': 'application/json',
      });
      expect(result['authorization'], kRedactedPlaceholder);
      expect(result['content-type'], 'application/json');
    });

    test('x-api-key 与 x-goog-api-key 应被脱敏', () {
      final result = SecureLogInterceptor.redactHeaders(<String, dynamic>{
        'x-api-key': 'anthropic-key',
        'x-goog-api-key': 'google-key',
      });
      expect(result['x-api-key'], kRedactedPlaceholder);
      expect(result['x-goog-api-key'], kRedactedPlaceholder);
    });

    test('头名称大小写不敏感', () {
      final result = SecureLogInterceptor.redactHeaders(<String, dynamic>{
        'Authorization': 'Bearer sk-x',
        'X-API-KEY': 'claude-key',
        'X-Goog-API-Key': 'gemini-key',
      });
      expect(result['Authorization'], kRedactedPlaceholder);
      expect(result['X-API-KEY'], kRedactedPlaceholder);
      expect(result['X-Goog-API-Key'], kRedactedPlaceholder);
    });

    test('非敏感头保持原值', () {
      final result = SecureLogInterceptor.redactHeaders(<String, dynamic>{
        'accept': 'application/json',
        'user-agent': 'lingxi/0.1',
        'anthropic-version': '2023-06-01',
      });
      expect(result['accept'], 'application/json');
      expect(result['user-agent'], 'lingxi/0.1');
      expect(result['anthropic-version'], '2023-06-01');
    });

    test('空 map 返回空 map', () {
      expect(SecureLogInterceptor.redactHeaders(<String, dynamic>{}), isEmpty);
    });

    test('不修改原始 map', () {
      final original = <String, dynamic>{'authorization': 'Bearer sk-x'};
      SecureLogInterceptor.redactHeaders(original);
      expect(original['authorization'], 'Bearer sk-x');
    });

    test('非字符串值应转为字符串', () {
      final result = SecureLogInterceptor.redactHeaders(<String, dynamic>{
        'content-length': 123,
      });
      expect(result['content-length'], '123');
    });
  });

  // ----------------------------------------------------------------------
  // redactQueryParameters
  // ----------------------------------------------------------------------
  group('SecureLogInterceptor.redactQueryParameters', () {
    test('key 与 api_key 应被脱敏', () {
      final result = SecureLogInterceptor.redactQueryParameters(
        <String, dynamic>{
          'key': 'gemini-secret',
          'api_key': 'openai-secret',
        },
      );
      expect(result['key'], kRedactedPlaceholder);
      expect(result['api_key'], kRedactedPlaceholder);
    });

    test('大小写不敏感', () {
      final result = SecureLogInterceptor.redactQueryParameters(
        <String, dynamic>{
          'KEY': 'gemini-secret',
          'API_KEY': 'openai-secret',
        },
      );
      expect(result['KEY'], kRedactedPlaceholder);
      expect(result['API_KEY'], kRedactedPlaceholder);
    });

    test('非敏感参数保持原值', () {
      final result = SecureLogInterceptor.redactQueryParameters(
        <String, dynamic>{
          'page': '1',
          'limit': '50',
        },
      );
      expect(result['page'], '1');
      expect(result['limit'], '50');
    });

    test('不修改原始 map', () {
      final original = <String, dynamic>{'key': 'secret'};
      SecureLogInterceptor.redactQueryParameters(original);
      expect(original['key'], 'secret');
    });
  });

  // ----------------------------------------------------------------------
  // redactUrl
  // ----------------------------------------------------------------------
  group('SecureLogInterceptor.redactUrl', () {
    test('查询参数中的 key 应被脱敏（Gemini 风格）', () {
      const url =
          'https://generativelanguage.googleapis.com/v1/models?key=AIza-secret123';
      final redacted = SecureLogInterceptor.redactUrl(url);
      expect(redacted, contains(kRedactedPlaceholder));
      expect(redacted, isNot(contains('AIza-secret123')));
    });

    test('查询参数中的 api_key 应被脱敏', () {
      const url =
          'https://api.example.com/chat?api_key=sk-secret&model=gpt';
      final redacted = SecureLogInterceptor.redactUrl(url);
      expect(redacted, contains(kRedactedPlaceholder));
      expect(redacted, isNot(contains('sk-secret')));
      expect(redacted, contains('model=gpt'));
    });

    test('多个参数仅脱敏敏感参数', () {
      const url = 'https://api.example.com/v1?key=secret&page=2&limit=10';
      final redacted = SecureLogInterceptor.redactUrl(url);
      expect(redacted, contains('page=2'));
      expect(redacted, contains('limit=10'));
      expect(redacted, contains(kRedactedPlaceholder));
      expect(redacted, isNot(contains('secret')));
    });

    test('无查询参数的 URL 保持不变', () {
      const url = 'https://api.openai.com/v1/chat/completions';
      expect(SecureLogInterceptor.redactUrl(url), url);
    });

    test('非法 URL 原样返回（保守策略）', () {
      const url = 'not a valid url at all';
      expect(SecureLogInterceptor.redactUrl(url), url);
    });
  });

  // ----------------------------------------------------------------------
  // redactBody
  // ----------------------------------------------------------------------
  group('SecureLogInterceptor.redactBody', () {
    test('Map 中 api_key 字段应被脱敏', () {
      final result = SecureLogInterceptor.redactBody(<String, dynamic>{
        'model': 'gpt-4o-mini',
        'api_key': 'sk-secret',
        'messages': <Map<String, dynamic>>[],
      }) as Map<String, dynamic>;
      expect(result['api_key'], kRedactedPlaceholder);
      expect(result['model'], 'gpt-4o-mini');
    });

    test('Map 中 apiKey、apikey、key 字段均应被脱敏', () {
      final result = SecureLogInterceptor.redactBody(<String, dynamic>{
        'apiKey': 'sk-1',
        'apikey': 'sk-2',
        'key': 'sk-3',
      }) as Map<String, dynamic>;
      expect(result['apiKey'], kRedactedPlaceholder);
      expect(result['apikey'], kRedactedPlaceholder);
      expect(result['key'], kRedactedPlaceholder);
    });

    test('嵌套 Map 中的敏感字段应递归脱敏', () {
      final result = SecureLogInterceptor.redactBody(<String, dynamic>{
        'config': <String, dynamic>{
          'api_key': 'nested-secret',
          'model': 'gpt',
        },
      }) as Map<String, dynamic>;
      final config = result['config'] as Map<String, dynamic>;
      expect(config['api_key'], kRedactedPlaceholder);
      expect(config['model'], 'gpt');
    });

    test('List 中的 Map 敏感字段应被脱敏', () {
      final result = SecureLogInterceptor.redactBody(<dynamic>[
        <String, dynamic>{'api_key': 'secret-1'},
        <String, dynamic>{'model': 'gpt'},
      ]) as List<dynamic>;
      expect(
        (result[0] as Map<String, dynamic>)['api_key'],
        kRedactedPlaceholder,
      );
      expect((result[1] as Map<String, dynamic>)['model'], 'gpt');
    });

    test('JSON 字符串应解析后脱敏再编码', () {
      const body = '{"api_key":"sk-secret","model":"gpt-4o"}';
      final result = SecureLogInterceptor.redactBody(body) as String;
      final decoded = jsonDecode(result) as Map<String, dynamic>;
      expect(decoded['api_key'], kRedactedPlaceholder);
      expect(decoded['model'], 'gpt-4o');
    });

    test('非 JSON 字符串原样返回', () {
      const body = 'plain text body without json';
      final result = SecureLogInterceptor.redactBody(body);
      expect(result, body);
    });

    test('null 返回 null', () {
      expect(SecureLogInterceptor.redactBody(null), isNull);
    });

    test('基本类型（int/bool）原样返回', () {
      expect(SecureLogInterceptor.redactBody(42), 42);
      expect(SecureLogInterceptor.redactBody(true), true);
    });

    test('不修改原始 Map', () {
      final original = <String, dynamic>{
        'api_key': 'secret',
        'model': 'gpt',
      };
      SecureLogInterceptor.redactBody(original);
      expect(original['api_key'], 'secret');
      expect(original['model'], 'gpt');
    });
  });

  // ----------------------------------------------------------------------
  // 拦截器实例集成测试
  // ----------------------------------------------------------------------
  group('SecureLogInterceptor 拦截器实例', () {
    test('onRequest 日志中不应包含明文密钥', () {
      final logs = <String>[];
      final interceptor = SecureLogInterceptor(logger: logs.add);

      final options = RequestOptions(
        path: '/v1/chat/completions',
        baseUrl: 'https://api.openai.com',
        method: 'POST',
        headers: <String, dynamic>{
          'authorization': 'Bearer sk-leak-me',
          'content-type': 'application/json',
        },
        queryParameters: <String, dynamic>{
          'key': 'should-not-leak',
        },
        data: <String, dynamic>{
          'api_key': 'sk-body-secret',
          'model': 'gpt-4o-mini',
        },
      );

      interceptor.onRequest(options, RequestInterceptorHandler());

      expect(logs, isNotEmpty);
      final joined = logs.join('\n');
      expect(joined, isNot(contains('sk-leak-me')));
      expect(joined, isNot(contains('should-not-leak')));
      expect(joined, isNot(contains('sk-body-secret')));
      expect(joined, contains(kRedactedPlaceholder));
      expect(joined, contains('gpt-4o-mini'));
    });

    test('onRequest 不修改原始 RequestOptions 数据', () {
      final logs = <String>[];
      final interceptor = SecureLogInterceptor(logger: logs.add);

      final options = RequestOptions(
        path: '/v1/chat',
        baseUrl: 'https://api.openai.com',
        method: 'POST',
        headers: <String, dynamic>{'authorization': 'Bearer sk-keep'},
        data: <String, dynamic>{'api_key': 'sk-keep-body'},
      );

      interceptor.onRequest(options, RequestInterceptorHandler());

      expect(options.headers['authorization'], 'Bearer sk-keep');
      expect((options.data as Map<String, dynamic>)['api_key'],
          'sk-keep-body');
    });

    test('默认 logger 不为 null', () {
      const interceptor = SecureLogInterceptor();
      expect(interceptor.logger, isNotNull);
    });
  });

  // ----------------------------------------------------------------------
  // 边界场景：密钥包含特殊字符
  // ----------------------------------------------------------------------
  group('边界场景 - 密钥含特殊字符', () {
    test('密钥包含空格应被完全脱敏（authorization 头）', () {
      final result = SecureLogInterceptor.redactHeaders(<String, dynamic>{
        'authorization': 'Bearer sk-xxx yyy zzz',
      });
      expect(result['authorization'], kRedactedPlaceholder);
      expect(result['authorization'], isNot(contains('sk-xxx')));
      expect(result['authorization'], isNot(contains('yyy')));
      expect(result['authorization'], isNot(contains('zzz')));
    });

    test('密钥包含 Unicode 应被脱敏（authorization 头）', () {
      final result = SecureLogInterceptor.redactHeaders(<String, dynamic>{
        'authorization': 'Bearer sk-中文密钥测试',
      });
      expect(result['authorization'], kRedactedPlaceholder);
      expect(result['authorization'], isNot(contains('中文密钥')));
    });

    test('密钥包含空格应被完全脱敏（x-api-key 头）', () {
      final result = SecureLogInterceptor.redactHeaders(<String, dynamic>{
        'x-api-key': 'key with spaces and special !@#',
      });
      expect(result['x-api-key'], kRedactedPlaceholder);
      expect(result['x-api-key'], isNot(contains('spaces')));
    });

    test('密钥包含 Unicode 应被脱敏（查询参数 key）', () {
      final result = SecureLogInterceptor.redactQueryParameters(
        <String, dynamic>{
          'key': 'AIza-中文密钥',
        },
      );
      expect(result['key'], kRedactedPlaceholder);
      expect(result['key'], isNot(contains('中文')));
    });

    test('密钥包含空格应被完全脱敏（body api_key 字段）', () {
      final result = SecureLogInterceptor.redactBody(<String, dynamic>{
        'api_key': 'sk-secret with spaces',
      }) as Map<String, dynamic>;
      expect(result['api_key'], kRedactedPlaceholder);
      expect(result['api_key'], isNot(contains('spaces')));
    });
  });

  // ----------------------------------------------------------------------
  // 边界场景：嵌套 JSON body
  // ----------------------------------------------------------------------
  group('边界场景 - 嵌套 JSON body', () {
    test('深层嵌套 Map 中的 api_key 应被递归脱敏', () {
      final result = SecureLogInterceptor.redactBody(<String, dynamic>{
        'messages': <dynamic>[
          <String, dynamic>{
            'role': 'user',
            'content': 'hi',
          },
        ],
        'config': <String, dynamic>{
          'auth': <String, dynamic>{
            'api_key': 'deeply-nested-secret',
          },
        },
      }) as Map<String, dynamic>;
      final config = result['config'] as Map<String, dynamic>;
      final auth = config['auth'] as Map<String, dynamic>;
      expect(auth['api_key'], kRedactedPlaceholder);
      expect(auth['api_key'], isNot(contains('deeply-nested-secret')));
    });

    test('List 内嵌套 Map 中的多个敏感字段应全部脱敏', () {
      final result = SecureLogInterceptor.redactBody(<String, dynamic>{
        'providers': <dynamic>[
          <String, dynamic>{'api_key': 'secret-1', 'name': 'openai'},
          <String, dynamic>{'apiKey': 'secret-2', 'name': 'anthropic'},
          <String, dynamic>{'key': 'secret-3', 'name': 'gemini'},
        ],
      }) as Map<String, dynamic>;
      final providers = result['providers'] as List<dynamic>;
      expect(
        (providers[0] as Map<String, dynamic>)['api_key'],
        kRedactedPlaceholder,
      );
      expect(
        (providers[1] as Map<String, dynamic>)['apiKey'],
        kRedactedPlaceholder,
      );
      expect(
        (providers[2] as Map<String, dynamic>)['key'],
        kRedactedPlaceholder,
      );
      expect(
        (providers[0] as Map<String, dynamic>)['name'],
        'openai',
      );
    });

    test('混合嵌套结构（Map + List）中敏感字段应被脱敏', () {
      final result = SecureLogInterceptor.redactBody(<String, dynamic>{
        'data': <String, dynamic>{
          'items': <dynamic>[
            <String, dynamic>{
              'metadata': <String, dynamic>{
                'apikey': 'nested-in-list-map',
              },
            },
          ],
        },
      }) as Map<String, dynamic>;
      final data = result['data'] as Map<String, dynamic>;
      final items = data['items'] as List<dynamic>;
      final metadata =
          (items[0] as Map<String, dynamic>)['metadata'] as Map<String, dynamic>;
      expect(metadata['apikey'], kRedactedPlaceholder);
      expect(metadata['apikey'], isNot(contains('nested-in-list-map')));
    });

    test('JSON 字符串中深层嵌套的敏感字段应被脱敏', () {
      const body =
          '{"config":{"auth":{"api_key":"string-nested-secret"}},"model":"gpt"}';
      final result = SecureLogInterceptor.redactBody(body) as String;
      final decoded = jsonDecode(result) as Map<String, dynamic>;
      final config = decoded['config'] as Map<String, dynamic>;
      final auth = config['auth'] as Map<String, dynamic>;
      expect(auth['api_key'], kRedactedPlaceholder);
      expect(result, isNot(contains('string-nested-secret')));
    });
  });

  // ----------------------------------------------------------------------
  // 边界场景：查询参数含密钥
  // ----------------------------------------------------------------------
  group('边界场景 - 查询参数', () {
    test('查询参数 key 与 model 混合时仅脱敏 key', () {
      const url =
          'https://api.example.com/v1?key=sk-secret-key&model=gpt-4&temp=0.7';
      final redacted = SecureLogInterceptor.redactUrl(url);
      expect(redacted, contains(kRedactedPlaceholder));
      expect(redacted, isNot(contains('sk-secret-key')));
      expect(redacted, contains('model=gpt-4'));
      expect(redacted, contains('temp=0.7'));
    });

    test('多个敏感查询参数应全部脱敏', () {
      const url =
          'https://api.example.com/v1?key=secret1&api_key=secret2&page=1';
      final redacted = SecureLogInterceptor.redactUrl(url);
      expect(redacted, isNot(contains('secret1')));
      expect(redacted, isNot(contains('secret2')));
      expect(redacted, contains('page=1'));
      // 应出现两次 [REDACTED]
      expect(kRedactedPlaceholder.allMatches(redacted).length, 2);
    });

    test('URL 中查询参数值为空时仍应脱敏键名', () {
      const url = 'https://api.example.com/v1?key=&model=gpt';
      final redacted = SecureLogInterceptor.redactUrl(url);
      expect(redacted, contains(kRedactedPlaceholder));
      expect(redacted, contains('model=gpt'));
    });
  });

  // ----------------------------------------------------------------------
  // 边界场景：大量字段请求体（性能验证）
  // ----------------------------------------------------------------------
  group('边界场景 - 大量字段请求体', () {
    test('大量字段的请求体应正确脱敏且不遗漏', () {
      final largeBody = <String, dynamic>{};
      for (var i = 0; i < 100; i++) {
        largeBody['field_$i'] = 'value_$i';
      }
      largeBody['api_key'] = 'bulk-secret-key';
      largeBody['nested'] = <String, dynamic>{
        'apiKey': 'nested-bulk-secret',
      };

      final result =
          SecureLogInterceptor.redactBody(largeBody) as Map<String, dynamic>;

      // 普通字段保持原值
      expect(result['field_0'], 'value_0');
      expect(result['field_99'], 'value_99');
      // 敏感字段脱敏
      expect(result['api_key'], kRedactedPlaceholder);
      final nested = result['nested'] as Map<String, dynamic>;
      expect(nested['apiKey'], kRedactedPlaceholder);
    });

    test('大量嵌套 List 中每个元素的敏感字段应全部脱敏', () {
      final largeList = <dynamic>[];
      for (var i = 0; i < 50; i++) {
        largeList.add(<String, dynamic>{
          'id': i,
          'api_key': 'secret-$i',
        });
      }

      final result = SecureLogInterceptor.redactBody(<String, dynamic>{
        'items': largeList,
      }) as Map<String, dynamic>;
      final items = result['items'] as List<dynamic>;

      for (var i = 0; i < 50; i++) {
        final item = items[i] as Map<String, dynamic>;
        expect(item['api_key'], kRedactedPlaceholder);
        expect(item['api_key'], isNot(contains('secret-$i')));
        expect(item['id'], i);
      }
    });

    test('深层递归不导致栈溢出（10 层嵌套）', () {
      var body = <String, dynamic>{'api_key': 'deep-secret'};
      for (var i = 0; i < 10; i++) {
        body = <String, dynamic>{'level_$i': body};
      }

      final result = SecureLogInterceptor.redactBody(body);
      // 验证不抛出异常即可
      expect(result, isNotNull);
    });
  });

  // ----------------------------------------------------------------------
  // 边界场景：响应体含敏感字段
  // ----------------------------------------------------------------------
  group('边界场景 - 响应体含敏感字段', () {
    test('redactBody 应处理响应体结构的深层脱敏', () {
      final responseBody = <String, dynamic>{
        'data': <String, dynamic>{
          'key': 'sk-response-secret',
          'user': <String, dynamic>{
            'api_key': 'nested-response-secret',
          },
        },
      };
      final result =
          SecureLogInterceptor.redactBody(responseBody) as Map<String, dynamic>;
      final data = result['data'] as Map<String, dynamic>;
      expect(data['key'], kRedactedPlaceholder);
      final user = data['user'] as Map<String, dynamic>;
      expect(user['api_key'], kRedactedPlaceholder);
    });

    test('onResponse 不应输出响应体内容（安全设计）', () {
      final logs = <String>[];
      final interceptor = SecureLogInterceptor(logger: logs.add);

      final response = Response<dynamic>(
        requestOptions: RequestOptions(
          path: '/v1/chat/completions',
          baseUrl: 'https://api.openai.com',
        ),
        statusCode: 200,
        data: <String, dynamic>{
          'api_key': 'should-not-appear-in-log',
          'choices': <dynamic>[],
        },
      );

      interceptor.onResponse(response, ResponseInterceptorHandler());

      final joined = logs.join('\n');
      expect(joined, contains('HTTP RESPONSE'));
      expect(joined, contains('200'));
      // 响应体不应出现在日志中
      expect(joined, isNot(contains('should-not-appear-in-log')));
      expect(joined, isNot(contains('api_key')));
      expect(joined, isNot(contains('choices')));
    });

    test('onError 不应输出响应体内容', () {
      final logs = <String>[];
      final interceptor = SecureLogInterceptor(logger: logs.add);

      final err = DioException(
        type: DioExceptionType.badResponse,
        requestOptions: RequestOptions(
          path: '/v1/chat/completions',
          baseUrl: 'https://api.openai.com',
        ),
        response: Response<dynamic>(
          requestOptions: RequestOptions(
            path: '/v1/chat/completions',
          ),
          statusCode: 401,
          data: <String, dynamic>{
            'api_key': 'leaked-key-in-error-response',
          },
        ),
        message: 'Unauthorized',
      );

      interceptor.onError(err, ErrorInterceptorHandler());

      final joined = logs.join('\n');
      expect(joined, contains('HTTP ERROR'));
      expect(joined, contains('401'));
      expect(joined, contains('Unauthorized'));
      // 响应体不应出现在日志中
      expect(joined, isNot(contains('leaked-key-in-error-response')));
      expect(joined, isNot(contains('api_key')));
    });

    test('onError 中 err.message 为 null 时应使用 [REDACTED] 占位', () {
      final logs = <String>[];
      final interceptor = SecureLogInterceptor(logger: logs.add);

      final err = DioException(
        type: DioExceptionType.connectionError,
        requestOptions: RequestOptions(
          path: '/v1/test',
          baseUrl: 'https://api.example.com',
        ),
        message: null,
      );

      interceptor.onError(err, ErrorInterceptorHandler());

      final joined = logs.join('\n');
      expect(joined, contains('HTTP ERROR'));
      expect(joined, contains(kRedactedPlaceholder));
    });

    test('onError 应脱敏 URL 中的查询参数密钥', () {
      final logs = <String>[];
      final interceptor = SecureLogInterceptor(logger: logs.add);

      final err = DioException(
        type: DioExceptionType.connectionTimeout,
        requestOptions: RequestOptions(
          path: '/v1/models',
          baseUrl: 'https://generativelanguage.googleapis.com',
          queryParameters: <String, dynamic>{
            'key': 'AIza-leaked-in-error',
          },
        ),
        message: 'Timeout',
      );

      interceptor.onError(err, ErrorInterceptorHandler());

      final joined = logs.join('\n');
      expect(joined, isNot(contains('AIza-leaked-in-error')));
      expect(joined, contains(kRedactedPlaceholder));
    });
  });

  // ----------------------------------------------------------------------
  // 边界场景：综合安全验证
  // ----------------------------------------------------------------------
  group('边界场景 - 综合安全验证', () {
    test('完整请求中所有密钥位置均应脱敏', () {
      final logs = <String>[];
      final interceptor = SecureLogInterceptor(logger: logs.add);

      final options = RequestOptions(
        path: '/v1/chat/completions',
        baseUrl: 'https://api.openai.com',
        method: 'POST',
        headers: <String, dynamic>{
          'authorization': 'Bearer sk-comprehensive-test',
          'x-api-key': 'anthropic-comprehensive',
          'x-goog-api-key': 'AIzaSyC-comprehensive',
        },
        queryParameters: <String, dynamic>{
          'key': 'query-secret',
          'api_key': 'another-query-secret',
          'model': 'gpt-4o',
        },
        data: <String, dynamic>{
          'api_key': 'body-secret-1',
          'apiKey': 'body-secret-2',
          'apikey': 'body-secret-3',
          'key': 'body-secret-4',
          'model': 'gpt-4o-mini',
          'messages': <dynamic>[
            <String, dynamic>{
              'role': 'user',
              'content': 'hi',
              'metadata': <String, dynamic>{
                'api_key': 'deeply-hidden-secret',
              },
            },
          ],
        },
      );

      interceptor.onRequest(options, RequestInterceptorHandler());

      final joined = logs.join('\n');

      // 所有密钥值都不应出现在日志中
      expect(joined, isNot(contains('sk-comprehensive-test')));
      expect(joined, isNot(contains('anthropic-comprehensive')));
      expect(joined, isNot(contains('AIzaSyC-comprehensive')));
      expect(joined, isNot(contains('query-secret')));
      expect(joined, isNot(contains('another-query-secret')));
      expect(joined, isNot(contains('body-secret-1')));
      expect(joined, isNot(contains('body-secret-2')));
      expect(joined, isNot(contains('body-secret-3')));
      expect(joined, isNot(contains('body-secret-4')));
      expect(joined, isNot(contains('deeply-hidden-secret')));

      // 非敏感字段应保留
      expect(joined, contains('gpt-4o'));
      expect(joined, contains('gpt-4o-mini'));

      // 应包含 [REDACTED] 占位符
      expect(joined, contains(kRedactedPlaceholder));
    });

    test('原始 RequestOptions 不被修改（不可变性验证）', () {
      final logs = <String>[];
      final interceptor = SecureLogInterceptor(logger: logs.add);

      final originalHeaders = <String, dynamic>{
        'authorization': 'Bearer sk-immutability-test',
      };
      final originalData = <String, dynamic>{
        'api_key': 'immutability-secret',
        'nested': <String, dynamic>{
          'key': 'nested-immutability',
        },
      };
      final originalQuery = <String, dynamic>{
        'key': 'query-immutability',
      };

      final options = RequestOptions(
        path: '/v1/test',
        baseUrl: 'https://api.example.com',
        method: 'POST',
        headers: originalHeaders,
        queryParameters: originalQuery,
        data: originalData,
      );

      interceptor.onRequest(options, RequestInterceptorHandler());

      // 原始数据不应被修改
      expect(options.headers['authorization'], 'Bearer sk-immutability-test');
      expect(
        (options.data as Map<String, dynamic>)['api_key'],
        'immutability-secret',
      );
      expect(
        ((options.data as Map<String, dynamic>)['nested']
            as Map<String, dynamic>)['key'],
        'nested-immutability',
      );
      expect(options.queryParameters['key'], 'query-immutability');
    });
  });
}
