import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/provider_config.dart';
import '../services/secure_storage_service.dart';

/// AI 服务商配置仓库。
///
/// 采用分层存储策略：
/// - **非密钥配置**（baseUrl、model、temperature、maxTokens、enabled）
///   存入 [SharedPreferences]，键为 `provider_config_<type>`，值为 JSON 字符串。
/// - **API Key** 通过 [SecureStorageService] 加密存储，键为 `api_key_<type>`。
///
/// 这种拆分保证 API Key 永不明文落入 SharedPreferences，同时普通配置可被
/// 同步快速读取。
class ProviderConfigRepository {
  ProviderConfigRepository(this._secureStorage, this._prefs);

  final SecureStorageService _secureStorage;
  final SharedPreferences _prefs;

  /// SharedPreferences 中 Provider 配置的键前缀。
  static const _configPrefix = 'provider_config_';

  /// 获取所有已配置的 Provider（含从 SecureStorage 读取的 API Key）。
  ///
  /// 仅返回 SharedPreferences 中存在配置记录的服务商，未配置的服务商不会出现。
  Future<List<ProviderConfig>> getAllProviders() async {
    final result = <ProviderConfig>[];
    for (final type in ProviderType.values) {
      final config = await getProvider(type);
      if (config != null) {
        result.add(config);
      }
    }
    return result;
  }

  /// 获取单个 Provider 的完整配置（含 apiKey）。
  ///
  /// 若 SharedPreferences 中没有该服务商的配置记录，返回 null。
  Future<ProviderConfig?> getProvider(ProviderType type) async {
    final raw = _prefs.getString('$_configPrefix${type.value}');
    if (raw == null) {
      return null;
    }
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final config = ProviderConfig.fromJson(json);
      // 从 SecureStorage 读取 API Key 注入到内存对象
      final apiKey = await _secureStorage.getApiKey(type.value);
      return config.copyWith(apiKey: apiKey ?? '');
    } catch (e) {
      // JSON 解析失败时视为未配置，避免脏数据导致崩溃
      return null;
    }
  }

  /// 保存 Provider 配置。
  ///
  /// 非密钥部分序列化为 JSON 存入 SharedPreferences；
  /// API Key（若非空）单独写入 SecureStorage。
  Future<void> saveProvider(ProviderConfig config) async {
    // 非密钥配置 → SharedPreferences
    final json = config.toJson();
    await _prefs.setString(
      '$_configPrefix${config.providerType.value}',
      jsonEncode(json),
    );

    // API Key → SecureStorage（仅在非空时写入，避免覆盖已有密钥为空串）
    if (config.apiKey.isNotEmpty) {
      await _secureStorage.setApiKey(
        config.providerType.value,
        config.apiKey,
      );
    }
  }

  /// 删除 Provider 配置（同时清理 SharedPreferences 与 SecureStorage 中的密钥）。
  Future<void> deleteProvider(ProviderType type) async {
    await _prefs.remove('$_configPrefix${type.value}');
    await _secureStorage.deleteApiKey(type.value);
  }

  /// 获取默认启用的 Provider（第一个 enabled 且配置了 API Key 的服务商）。
  ///
  /// 遍历顺序遵循 [ProviderType.values] 的定义顺序。若无满足条件者，返回 null。
  Future<ProviderConfig?> getDefaultProvider() async {
    final providers = await getAllProviders();
    for (final config in providers) {
      if (config.enabled && config.apiKey.isNotEmpty) {
        return config;
      }
    }
    return null;
  }
}
