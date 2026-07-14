/// AI 服务商类型枚举。
///
/// 每个枚举值包含：
/// - [value]：持久化存储用的字符串标识（如 `openai_compatible`）
/// - [displayName]：UI 展示名称（中文）
enum ProviderType {
  openaiCompatible('openai_compatible', 'OpenAI 兼容'),
  anthropic('anthropic', 'Anthropic Claude'),
  gemini('gemini', 'Google Gemini'),
  ollama('ollama', 'Ollama 本地');

  const ProviderType(this.value, this.displayName);

  /// 持久化存储用的字符串标识。
  final String value;

  /// UI 展示名称。
  final String displayName;

  /// 根据字符串值反查枚举，未匹配时回退到 [openaiCompatible]。
  static ProviderType fromValue(String value) {
    return ProviderType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => ProviderType.openaiCompatible,
    );
  }
}

/// AI 服务商配置。
///
/// 注意：[apiKey] 字段仅在内存中持有，**不会**参与 `toJson`/`fromJson` 序列化。
/// API Key 通过 [SecureStorageService] 单独加密存储，避免明文落盘。
class ProviderConfig {
  /// 创建一份指定服务商类型的默认配置（用于首次初始化）。
  factory ProviderConfig.defaultFor(ProviderType type) {
    return ProviderConfig(
      providerType: type,
      baseUrl: _defaultBaseUrl[type]!,
      apiKey: '',
      model: _defaultModel[type]!,
    );
  }

  const ProviderConfig({
    required this.providerType,
    required this.baseUrl,
    required this.apiKey,
    required this.model,
    this.temperature = 0.7,
    this.maxTokens = 2048,
    this.enabled = true,
  });

  /// 各服务商默认 baseUrl。
  static const Map<ProviderType, String> _defaultBaseUrl = {
    ProviderType.openaiCompatible: 'https://api.openai.com/v1',
    ProviderType.anthropic: 'https://api.anthropic.com',
    ProviderType.gemini: 'https://generativelanguage.googleapis.com',
    ProviderType.ollama: 'http://localhost:11434',
  };

  /// 各服务商默认模型。
  static const Map<ProviderType, String> _defaultModel = {
    ProviderType.openaiCompatible: 'gpt-4o-mini',
    ProviderType.anthropic: 'claude-3-5-sonnet-20241022',
    ProviderType.gemini: 'gemini-1.5-flash',
    ProviderType.ollama: 'llama3.2',
  };

  final ProviderType providerType;
  final String baseUrl;

  /// 仅在内存中持有，序列化时跳过。
  final String apiKey;
  final String model;
  final double temperature;
  final int maxTokens;
  final bool enabled;

  /// 从 JSON 反序列化（不含 apiKey，apiKey 由 SecureStorage 单独读取）。
  factory ProviderConfig.fromJson(Map<String, dynamic> json) {
    return ProviderConfig(
      providerType: ProviderType.fromValue(json['providerType'] as String? ?? ''),
      baseUrl: json['baseUrl'] as String? ?? '',
      apiKey: '',
      model: json['model'] as String? ?? '',
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.7,
      maxTokens: json['maxTokens'] as int? ?? 2048,
      enabled: json['enabled'] as bool? ?? true,
    );
  }

  /// 序列化为 JSON（**不含** apiKey，安全考虑）。
  Map<String, dynamic> toJson() {
    return {
      'providerType': providerType.value,
      'baseUrl': baseUrl,
      'model': model,
      'temperature': temperature,
      'maxTokens': maxTokens,
      'enabled': enabled,
    };
  }

  /// 复制并修改部分字段。
  ProviderConfig copyWith({
    ProviderType? providerType,
    String? baseUrl,
    String? apiKey,
    String? model,
    double? temperature,
    int? maxTokens,
    bool? enabled,
  }) {
    return ProviderConfig(
      providerType: providerType ?? this.providerType,
      baseUrl: baseUrl ?? this.baseUrl,
      apiKey: apiKey ?? this.apiKey,
      model: model ?? this.model,
      temperature: temperature ?? this.temperature,
      maxTokens: maxTokens ?? this.maxTokens,
      enabled: enabled ?? this.enabled,
    );
  }
}
