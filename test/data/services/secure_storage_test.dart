import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lingxi_academy/data/services/secure_storage_service.dart';

void main() {
  // 使用 flutter_secure_storage 官方提供的测试平台（内存实现），
  // 避免在单元测试中触发真实平台插件调用。
  setUp(() {
    FlutterSecureStorage.setMockInitialValues(<String, String>{});
  });

  group('SecureStorageService', () {
    test('setApiKey / getApiKey 应正确写入并读取 API Key', () async {
      final service = SecureStorageService();
      await service.setApiKey('openai_compatible', 'sk-test-12345');

      final retrieved = await service.getApiKey('openai_compatible');
      expect(retrieved, 'sk-test-12345');
    });

    test('getApiKey 未配置时应返回 null', () async {
      final service = SecureStorageService();
      final retrieved = await service.getApiKey('anthropic');
      expect(retrieved, isNull);
    });

    test('不同 providerType 之间应隔离存储', () async {
      final service = SecureStorageService();
      await service.setApiKey('openai_compatible', 'sk-openai');
      await service.setApiKey('anthropic', 'sk-anthropic-key');

      expect(await service.getApiKey('openai_compatible'), 'sk-openai');
      expect(await service.getApiKey('anthropic'), 'sk-anthropic-key');
    });

    test('deleteApiKey 应删除指定 provider 的 Key', () async {
      final service = SecureStorageService();
      await service.setApiKey('gemini', 'AIza-test');
      expect(await service.hasApiKey('gemini'), isTrue);

      await service.deleteApiKey('gemini');
      expect(await service.getApiKey('gemini'), isNull);
      expect(await service.hasApiKey('gemini'), isFalse);
    });

    test('deleteApiKey 删除不存在的 Key 不应抛出异常', () async {
      final service = SecureStorageService();
      await expectLater(
        service.deleteApiKey('ollama'),
        completes,
      );
    });

    test('hasApiKey 已配置且非空时返回 true', () async {
      final service = SecureStorageService();
      await service.setApiKey('ollama', 'ollama-key');

      expect(await service.hasApiKey('ollama'), isTrue);
    });

    test('hasApiKey 未配置时返回 false', () async {
      final service = SecureStorageService();
      expect(await service.hasApiKey('openai_compatible'), isFalse);
    });

    test('hasApiKey 在 Key 为空字符串时返回 false', () async {
      // 通过底层直接写入空串以模拟边界情况
      const storage = FlutterSecureStorage();
      await storage.write(key: 'api_key_empty_provider', value: '');
      final service = SecureStorageService();

      expect(await service.hasApiKey('empty_provider'), isFalse);
    });

    test('deleteAllApiKeys 应仅清理 api_key_ 前缀的键', () async {
      // 预置：写入若干 API Key 及一个无关键
      const storage = FlutterSecureStorage();
      await storage.write(key: 'api_key_openai_compatible', value: 'sk-1');
      await storage.write(key: 'api_key_anthropic', value: 'sk-2');
      await storage.write(key: 'other_setting', value: 'keep-me');

      final service = SecureStorageService();
      await service.deleteAllApiKeys();

      expect(await service.getApiKey('openai_compatible'), isNull);
      expect(await service.getApiKey('anthropic'), isNull);

      // 无关键应保留
      final other = await storage.read(key: 'other_setting');
      expect(other, 'keep-me');
    });

    test('deleteAllApiKeys 在无 API Key 时不应抛出异常', () async {
      final service = SecureStorageService();
      await expectLater(service.deleteAllApiKeys(), completes);
    });

    test('setApiKey 支持覆盖已存在的 Key', () async {
      final service = SecureStorageService();
      await service.setApiKey('openai_compatible', 'sk-old');
      await service.setApiKey('openai_compatible', 'sk-new');

      expect(await service.getApiKey('openai_compatible'), 'sk-new');
    });
  });
}
