import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lingxi_academy/data/models/provider_config.dart';
import 'package:lingxi_academy/data/repositories/provider_config_repository.dart';
import 'package:lingxi_academy/data/services/secure_storage_service.dart';

void main() {
  // SharedPreferences 测试初始化（内存实现）
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    FlutterSecureStorage.setMockInitialValues(<String, String>{});
  });

  group('ProviderType', () {
    test('fromValue 应返回对应枚举', () {
      expect(
        ProviderType.fromValue('openai_compatible'),
        ProviderType.openaiCompatible,
      );
      expect(
        ProviderType.fromValue('anthropic'),
        ProviderType.anthropic,
      );
      expect(ProviderType.fromValue('gemini'), ProviderType.gemini);
      expect(ProviderType.fromValue('ollama'), ProviderType.ollama);
    });

    test('fromValue 未知值应回退到 openaiCompatible', () {
      expect(
        ProviderType.fromValue('unknown_provider'),
        ProviderType.openaiCompatible,
      );
      expect(
        ProviderType.fromValue(''),
        ProviderType.openaiCompatible,
      );
    });

    test('每个枚举应包含 value 与 displayName', () {
      for (final type in ProviderType.values) {
        expect(type.value, isNotEmpty);
        expect(type.displayName, isNotEmpty);
      }
    });
  });

  group('ProviderConfig 序列化', () {
    test('toJson 不应包含 apiKey 字段', () {
      const config = ProviderConfig(
        providerType: ProviderType.openaiCompatible,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-secret-must-not-leak',
        model: 'gpt-4o-mini',
      );
      final json = config.toJson();

      expect(json.containsKey('apiKey'), isFalse,
          reason: 'apiKey 不应序列化到 JSON');
      expect(json['providerType'], 'openai_compatible');
      expect(json['baseUrl'], 'https://api.openai.com/v1');
      expect(json['model'], 'gpt-4o-mini');
    });

    test('fromJson 应将 apiKey 置空（密钥单独从 SecureStorage 读取）', () {
      final json = {
        'providerType': 'anthropic',
        'baseUrl': 'https://api.anthropic.com',
        'model': 'claude-3-5-sonnet-20241022',
        'temperature': 0.5,
        'maxTokens': 1024,
        'enabled': false,
      };
      final config = ProviderConfig.fromJson(json);

      expect(config.providerType, ProviderType.anthropic);
      expect(config.baseUrl, 'https://api.anthropic.com');
      expect(config.model, 'claude-3-5-sonnet-20241022');
      expect(config.temperature, 0.5);
      expect(config.maxTokens, 1024);
      expect(config.enabled, isFalse);
      expect(config.apiKey, '',
          reason: 'fromJson 不得设置 apiKey，密钥从 SecureStorage 单独读取');
    });

    test('toJson → fromJson 往返应保持字段一致（除 apiKey）', () {
      const original = ProviderConfig(
        providerType: ProviderType.gemini,
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: 'should-be-stripped',
        model: 'gemini-1.5-flash',
        temperature: 0.3,
        maxTokens: 512,
        enabled: false,
      );
      final restored = ProviderConfig.fromJson(original.toJson());

      expect(restored.providerType, original.providerType);
      expect(restored.baseUrl, original.baseUrl);
      expect(restored.model, original.model);
      expect(restored.temperature, original.temperature);
      expect(restored.maxTokens, original.maxTokens);
      expect(restored.enabled, original.enabled);
      expect(restored.apiKey, '');
    });

    test('fromJson 缺失字段应使用默认值', () {
      final config = ProviderConfig.fromJson(<String, dynamic>{});

      expect(config.providerType, ProviderType.openaiCompatible);
      expect(config.baseUrl, '');
      expect(config.model, '');
      expect(config.temperature, 0.7);
      expect(config.maxTokens, 2048);
      expect(config.enabled, isTrue);
    });

    test('toJson 输出应为合法 JSON 可再次解码', () {
      const config = ProviderConfig(
        providerType: ProviderType.ollama,
        baseUrl: 'http://localhost:11434',
        apiKey: '',
        model: 'llama3.2',
      );
      final encoded = jsonEncode(config.toJson());
      final decoded = jsonDecode(encoded) as Map<String, dynamic>;

      expect(decoded['providerType'], 'ollama');
      expect(decoded['baseUrl'], 'http://localhost:11434');
    });
  });

  group('ProviderConfig.copyWith', () {
    test('应保留未修改字段', () {
      const original = ProviderConfig(
        providerType: ProviderType.openaiCompatible,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-1',
        model: 'gpt-4o-mini',
      );
      final copy = original.copyWith(model: 'gpt-4o');

      expect(copy.providerType, original.providerType);
      expect(copy.baseUrl, original.baseUrl);
      expect(copy.apiKey, original.apiKey);
      expect(copy.model, 'gpt-4o');
      expect(copy.temperature, original.temperature);
      expect(copy.maxTokens, original.maxTokens);
      expect(copy.enabled, original.enabled);
    });

    test('应支持修改 apiKey', () {
      const original = ProviderConfig(
        providerType: ProviderType.anthropic,
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'sk-old',
        model: 'claude-3-5-sonnet-20241022',
      );
      final copy = original.copyWith(apiKey: 'sk-new');

      expect(copy.apiKey, 'sk-new');
      expect(original.apiKey, 'sk-old', reason: '原对象应保持不可变');
    });

    test('应支持修改 enabled 与 temperature', () {
      const original = ProviderConfig(
        providerType: ProviderType.gemini,
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: '',
        model: 'gemini-1.5-flash',
      );
      final copy = original.copyWith(enabled: false, temperature: 0.1);

      expect(copy.enabled, isFalse);
      expect(copy.temperature, 0.1);
    });
  });

  group('ProviderConfig.defaultFor', () {
    test('openaiCompatible 默认配置', () {
      final config = ProviderConfig.defaultFor(ProviderType.openaiCompatible);
      expect(config.baseUrl, 'https://api.openai.com/v1');
      expect(config.model, 'gpt-4o-mini');
    });

    test('anthropic 默认配置', () {
      final config = ProviderConfig.defaultFor(ProviderType.anthropic);
      expect(config.baseUrl, 'https://api.anthropic.com');
      expect(config.model, 'claude-3-5-sonnet-20241022');
    });

    test('gemini 默认配置', () {
      final config = ProviderConfig.defaultFor(ProviderType.gemini);
      expect(config.baseUrl, 'https://generativelanguage.googleapis.com');
      expect(config.model, 'gemini-1.5-flash');
    });

    test('ollama 默认配置', () {
      final config = ProviderConfig.defaultFor(ProviderType.ollama);
      expect(config.baseUrl, 'http://localhost:11434');
      expect(config.model, 'llama3.2');
    });
  });

  group('ProviderConfigRepository', () {
    late SecureStorageService secureStorage;
    late SharedPreferences prefs;
    late ProviderConfigRepository repository;

    setUp(() async {
      secureStorage = SecureStorageService();
      prefs = await SharedPreferences.getInstance();
      repository = ProviderConfigRepository(secureStorage, prefs);
    });

    test('saveProvider 应将非密钥配置写入 SharedPreferences，密钥写入 SecureStorage',
        () async {
      const config = ProviderConfig(
        providerType: ProviderType.openaiCompatible,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-secret-123',
        model: 'gpt-4o-mini',
        temperature: 0.8,
        maxTokens: 4096,
        enabled: true,
      );
      await repository.saveProvider(config);

      // 验证 SharedPreferences 中存有非密钥配置 JSON（不含 apiKey）
      final raw = prefs.getString('provider_config_openai_compatible');
      expect(raw, isNotNull);
      final json = jsonDecode(raw!) as Map<String, dynamic>;
      expect(json.containsKey('apiKey'), isFalse);
      expect(json['baseUrl'], 'https://api.openai.com/v1');
      expect(json['model'], 'gpt-4o-mini');

      // 验证 API Key 写入 SecureStorage
      final apiKey = await secureStorage.getApiKey('openai_compatible');
      expect(apiKey, 'sk-secret-123');
    });

    test('getProvider 应返回完整配置（含 apiKey）', () async {
      const config = ProviderConfig(
        providerType: ProviderType.anthropic,
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'sk-anthropic-real',
        model: 'claude-3-5-sonnet-20241022',
        enabled: true,
      );
      await repository.saveProvider(config);

      final retrieved = await repository.getProvider(ProviderType.anthropic);
      expect(retrieved, isNotNull);
      expect(retrieved!.providerType, ProviderType.anthropic);
      expect(retrieved.baseUrl, 'https://api.anthropic.com');
      expect(retrieved.model, 'claude-3-5-sonnet-20241022');
      expect(retrieved.apiKey, 'sk-anthropic-real');
      expect(retrieved.enabled, isTrue);
    });

    test('getProvider 未配置时应返回 null', () async {
      final retrieved = await repository.getProvider(ProviderType.gemini);
      expect(retrieved, isNull);
    });

    test('getProvider 在 SharedPreferences 数据损坏时应返回 null', () async {
      // 写入非法 JSON
      await prefs.setString('provider_config_gemini', '{invalid json');
      final retrieved = await repository.getProvider(ProviderType.gemini);
      expect(retrieved, isNull);
    });

    test('getAllProviders 应返回所有已配置的服务商', () async {
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(apiKey: 'sk-openai'),
      );
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.ollama)
            .copyWith(apiKey: 'ollama-key'),
      );

      final all = await repository.getAllProviders();
      expect(all.length, 2);
      final types = all.map((c) => c.providerType).toSet();
      expect(types, contains(ProviderType.openaiCompatible));
      expect(types, contains(ProviderType.ollama));
    });

    test('getAllProviders 在无配置时应返回空列表', () async {
      final all = await repository.getAllProviders();
      expect(all, isEmpty);
    });

    test('deleteProvider 应同时清理 SharedPreferences 与 SecureStorage', () async {
      const config = ProviderConfig(
        providerType: ProviderType.gemini,
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: 'gemini-key',
        model: 'gemini-1.5-flash',
      );
      await repository.saveProvider(config);

      await repository.deleteProvider(ProviderType.gemini);

      expect(prefs.getString('provider_config_gemini'), isNull);
      expect(await secureStorage.getApiKey('gemini'), isNull);
      expect(await repository.getProvider(ProviderType.gemini), isNull);
    });

    test('getDefaultProvider 应返回第一个 enabled 且有 apiKey 的服务商', () async {
      // gemini（enabled 但无 apiKey）
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.gemini).copyWith(enabled: true),
      );
      // anthropic（enabled 且有 apiKey）
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.anthropic)
            .copyWith(apiKey: 'sk-anthropic', enabled: true),
      );

      final defaultProvider = await repository.getDefaultProvider();
      expect(defaultProvider, isNotNull);
      expect(defaultProvider!.providerType, ProviderType.anthropic);
      expect(defaultProvider.apiKey, 'sk-anthropic');
    });

    test('getDefaultProvider 无满足条件者时返回 null', () async {
      // 全部 disabled
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(apiKey: 'sk-x', enabled: false),
      );
      final defaultProvider = await repository.getDefaultProvider();
      expect(defaultProvider, isNull);
    });

    test('getDefaultProvider 无 apiKey 者时返回 null', () async {
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(enabled: true), // apiKey 为空
      );
      final defaultProvider = await repository.getDefaultProvider();
      expect(defaultProvider, isNull);
    });

    test('saveProvider 当 apiKey 为空时不应覆盖已有 SecureStorage 中的密钥',
        () async {
      // 先保存一个带密钥的配置
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(apiKey: 'sk-original'),
      );
      // 再保存一个空 apiKey 的配置（例如仅修改 baseUrl）
      await repository.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(baseUrl: 'https://custom.openai.com/v1', apiKey: ''),
      );

      final retrieved = await repository.getProvider(ProviderType.openaiCompatible);
      expect(retrieved, isNotNull);
      expect(retrieved!.baseUrl, 'https://custom.openai.com/v1');
      // 旧密钥应被保留
      expect(retrieved.apiKey, 'sk-original');
    });
  });
}
