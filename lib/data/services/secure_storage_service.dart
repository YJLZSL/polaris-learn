import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// API Key 安全存储服务。
///
/// 基于 `flutter_secure_storage` 封装，利用平台级安全存储：
/// - Android：Android Keystore
/// - Windows：DPAPI
///
/// 命名规范：所有 API Key 以 `api_key_<providerType>` 作为存储键，
/// 例如 `api_key_openai_compatible`。
class SecureStorageService {
  static const _apiKeyPrefix = 'api_key_';

  final FlutterSecureStorage _storage;

  /// 构造函数，支持注入 [FlutterSecureStorage] 实例以便测试 mock。
  SecureStorageService([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  /// 存储 API Key（按 [providerType] 分组）。
  Future<void> setApiKey(String providerType, String apiKey) async {
    await _storage.write(
      key: '$_apiKeyPrefix$providerType',
      value: apiKey,
    );
  }

  /// 读取 API Key，未配置时返回 null。
  Future<String?> getApiKey(String providerType) async {
    return await _storage.read(key: '$_apiKeyPrefix$providerType');
  }

  /// 删除指定 [providerType] 的 API Key。
  Future<void> deleteApiKey(String providerType) async {
    await _storage.delete(key: '$_apiKeyPrefix$providerType');
  }

  /// 判断是否已配置 API Key（非空）。
  Future<bool> hasApiKey(String providerType) async {
    final key = await getApiKey(providerType);
    return key != null && key.isNotEmpty;
  }

  /// 删除所有 API Key（仅清理以 [_apiKeyPrefix] 开头的键）。
  Future<void> deleteAllApiKeys() async {
    final allKeys = await _storage.readAll();
    // 先收集待删除的键，避免在迭代过程中因底层 Map 变化导致
    // "Concurrent modification during iteration" 错误。
    final keysToDelete = allKeys.keys
        .where((key) => key.startsWith(_apiKeyPrefix))
        .toList();
    for (final key in keysToDelete) {
      await _storage.delete(key: key);
    }
  }
}
