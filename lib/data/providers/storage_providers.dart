import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/app_providers.dart';
import '../repositories/provider_config_repository.dart';
import '../services/secure_storage_service.dart';

/// [SecureStorageService] 提供者。
///
/// 默认使用真实 [FlutterSecureStorage]；测试中可通过 `overrideWithValue`
/// 注入 mock 实例。
final secureStorageServiceProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

/// [ProviderConfigRepository] 提供者。
///
/// 依赖：
/// - [sharedPreferencesProvider]：非密钥配置存储
/// - [secureStorageServiceProvider]：API Key 加密存储
final providerConfigRepositoryProvider = Provider<ProviderConfigRepository>((ref) {
  return ProviderConfigRepository(
    ref.watch(secureStorageServiceProvider),
    ref.watch(sharedPreferencesProvider),
  );
});
