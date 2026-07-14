import '../../data/models/provider_config.dart';
import '../../data/repositories/provider_config_repository.dart';
import 'ai_provider.dart';
import 'anthropic_provider.dart';
import 'gemini_provider.dart';
import 'ollama_provider.dart';
import 'openai_compatible_provider.dart';

/// AI Provider 注册中心。
///
/// 根据用户在 [ProviderConfigRepository] 中的配置创建对应的 [AiProvider]
/// 实例并缓存，避免每次请求都重新构造。支持：
///
/// - [getProvider]：获取当前默认 Provider（基于 `getDefaultProvider()`）。
/// - [switchProvider]：切换到指定类型的 Provider。
/// - [cancel]：取消当前 Provider 进行中的请求。
///
/// 该类是有状态的：内部缓存 [_currentProvider] 与 [_currentConfig]，
/// 同一实例应在应用生命周期内复用（通过 Riverpod 的 `Provider` 单例化）。
class AiProviderRegistry {
  AiProviderRegistry(this._configRepo);

  final ProviderConfigRepository _configRepo;

  /// 当前缓存的 Provider 实例（可能为空，表示尚未初始化或无可用配置）。
  AiProvider? _currentProvider;

  /// 获取当前 Provider。
  ///
  /// 流程：
  /// 1. 若已缓存 Provider（通过 [getProvider] 或 [switchProvider] 设置），
  ///    直接返回缓存实例。
  /// 2. 否则从仓库读取默认启用的 Provider 配置并创建实例。
  /// 3. 若无可用配置，返回 null。
  ///
  /// 注意：若用户在设置页修改了 Provider 配置，应通过 Riverpod `invalidate`
  /// 重建 registry 或调用 [switchProvider] 显式切换，而非依赖 [getProvider]
  /// 自动重读。
  Future<AiProvider?> getProvider() async {
    // 已有缓存实例（包括通过 switchProvider 设置的），直接返回
    if (_currentProvider != null) {
      return _currentProvider;
    }

    final config = await _configRepo.getDefaultProvider();
    if (config == null) {
      return null;
    }
    _currentProvider = _createProvider(config);
    return _currentProvider;
  }

  /// 根据 [ProviderConfig] 创建对应的 [AiProvider] 实例。
  AiProvider _createProvider(ProviderConfig config) {
    switch (config.providerType) {
      case ProviderType.openaiCompatible:
        return OpenAICompatibleProvider(
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
        );
      case ProviderType.anthropic:
        return AnthropicProvider(
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
        );
      case ProviderType.gemini:
        return GeminiProvider(
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
        );
      case ProviderType.ollama:
        return OllamaProvider(
          baseUrl: config.baseUrl,
          model: config.model,
        );
    }
  }

  /// 切换到指定类型的 Provider。
  ///
  /// 从仓库读取该类型的配置；若存在则更新缓存并创建新实例，
  /// 若不存在对应配置则不做任何改变。
  Future<void> switchProvider(ProviderType type) async {
    final config = await _configRepo.getProvider(type);
    if (config != null) {
      _currentProvider = _createProvider(config);
    }
  }

  /// 失效缓存的 Provider 实例。
  ///
  /// 用户在设置页修改/删除 Provider 配置后应调用此方法，使下次 [getProvider]
  /// 重新从仓库读取最新配置并创建新实例。仅清除缓存，不影响正在进行的请求
  /// （正在进行的请求由 [cancel] 终止）。
  void invalidateCache() {
    _currentProvider = null;
  }

  /// 取消当前 Provider 进行中的请求。
  void cancel() {
    _currentProvider?.cancel();
  }
}
