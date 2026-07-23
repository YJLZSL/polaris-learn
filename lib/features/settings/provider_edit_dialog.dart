import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/provider_config.dart';
import '../../data/providers/storage_providers.dart';
import '../../data/repositories/provider_config_repository.dart';
import 'api_test_service.dart';

/// Provider 编辑/新增对话框。
///
/// 通过 [showProviderEditDialog] 弹出。传入 [existing] 时为编辑模式
/// （apiKey 留空表示保持原密钥），否则为新增模式。
///
/// 保存逻辑：
/// - 调用 [ProviderConfigRepository.saveProvider] 持久化配置。
/// - 若 "设为活跃" 开启，将该 Provider 的 `enabled` 置 true，其余置 false。
/// - 测试连接调用 [ApiTestService]，使用表单当前值临时构造实例，不写入仓库。
class ProviderEditDialog extends ConsumerStatefulWidget {
  const ProviderEditDialog({super.key, this.existing});

  /// 编辑模式时传入已有配置；新增模式传 null。
  final ProviderConfig? existing;

  @override
  ConsumerState<ProviderEditDialog> createState() =>
      _ProviderEditDialogState();
}

/// 弹出 Provider 编辑对话框，返回 true 表示已保存。
Future<bool> showProviderEditDialog(
  BuildContext context, {
  ProviderConfig? existing,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => ProviderEditDialog(existing: existing),
  );
  return result ?? false;
}

class _ProviderEditDialogState extends ConsumerState<ProviderEditDialog> {
  final _formKey = GlobalKey<FormState>();
  late ProviderType _type;
  late final TextEditingController _baseUrlController;
  late final TextEditingController _apiKeyController;
  late final TextEditingController _modelController;
  late double _temperature;
  late int _maxTokens;
  late bool _isActive;
  bool _obscureApiKey = true;
  bool _isTesting = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _type = e?.providerType ?? ProviderType.openaiCompatible;
    _baseUrlController =
        TextEditingController(text: e?.baseUrl ?? _defaultBaseUrl(_type));
    _apiKeyController = TextEditingController(text: e?.apiKey ?? '');
    _modelController =
        TextEditingController(text: e?.model ?? _defaultModel(_type));
    _temperature = e?.temperature ?? 0.7;
    _maxTokens = e?.maxTokens ?? 2048;
    // 编辑模式下以当前 enabled 状态作为"活跃"初值；新增默认 false
    _isActive = e?.enabled ?? false;
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    _apiKeyController.dispose();
    _modelController.dispose();
    super.dispose();
  }

  String _defaultBaseUrl(ProviderType t) =>
      ProviderConfig.defaultFor(t).baseUrl;

  String _defaultModel(ProviderType t) =>
      ProviderConfig.defaultFor(t).model;

  /// 类型切换时，若 baseUrl/model 仍是该类型的默认值或为空，则刷新为
  /// 新类型的默认值；用户自定义过的值保留。
  void _onTypeChanged(ProviderType? newType) {
    if (newType == null || newType == _type) return;
    setState(() {
      final oldDefaultUrl = _defaultBaseUrl(_type);
      final oldDefaultModel = _defaultModel(_type);
      if (_baseUrlController.text.isEmpty ||
          _baseUrlController.text == oldDefaultUrl) {
        _baseUrlController.text = _defaultBaseUrl(newType);
      }
      if (_modelController.text.isEmpty ||
          _modelController.text == oldDefaultModel) {
        _modelController.text = _defaultModel(newType);
      }
      _type = newType;
    });
  }

  /// 校验 URL 格式：必须包含 http/https scheme 与 host。
  String? _validateUrl(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Base URL 不能为空';
    final uri = Uri.tryParse(v);
    if (uri == null ||
        (uri.scheme != 'http' && uri.scheme != 'https') ||
        uri.host.isEmpty) {
      return 'URL 格式不正确（需以 http(s):// 开头）';
    }
    return null;
  }

  String? _validateModel(String? value) {
    if ((value?.trim() ?? '').isEmpty) return '模型名不能为空';
    return null;
  }

  /// 根据 Ollama 无需 API Key 的特性决定是否需要校验 Key。
  String? _validateApiKey(String? value) {
    if (_type == ProviderType.ollama) return null;
    // 编辑模式下允许留空（保持原密钥）
    if (widget.existing != null) return null;
    if ((value?.trim() ?? '').isEmpty) return 'API Key 不能为空';
    return null;
  }

  /// 用当前表单值构造临时 [ProviderConfig]（用于测试连接或保存）。
  ProviderConfig _buildConfig() {
    return ProviderConfig(
      providerType: _type,
      baseUrl: _baseUrlController.text.trim(),
      apiKey: _apiKeyController.text,
      model: _modelController.text.trim(),
      temperature: _temperature,
      maxTokens: _maxTokens,
      enabled: _isActive,
    );
  }

  Future<void> _testConnection() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _isTesting = true);
    try {
      final config = _buildConfig();
      final result =
          await ref.read(apiTestServiceProvider).testConnection(config);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _isTesting = false);
    }
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _isSaving = true);
    try {
      final repo = ref.read(providerConfigRepositoryProvider);
      final config = _buildConfig();
      await repo.saveProvider(config);

      // 设为活跃：将本 Provider enabled=true，其余置 false
      if (_isActive) {
        final all = await repo.getAllProviders();
        for (final p in all) {
          if (p.providerType == _type) continue;
          if (p.enabled) {
            await repo.saveProvider(p.copyWith(enabled: false));
          }
        }
      }

      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('保存失败：$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEdit = widget.existing != null;
    return AlertDialog(
      title: Text(isEdit ? '编辑 API 配置' : '添加 API 配置'),
      content: SizedBox(
        width: double.maxFinite,
        child: Form(
          key: _formKey,
          child: ListView(
            shrinkWrap: true,
            children: [
              // Provider 类型
              DropdownButtonFormField<ProviderType>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Provider 类型'),
                items: [
                  for (final t in ProviderType.values)
                    DropdownMenuItem(
                      value: t,
                      child: Text(t.displayName),
                    ),
                ],
                onChanged: _onTypeChanged,
              ),
              const SizedBox(height: 12),
              // Base URL
              TextFormField(
                controller: _baseUrlController,
                decoration: const InputDecoration(
                  labelText: 'Base URL',
                  hintText: 'https://api.example.com/v1',
                ),
                validator: _validateUrl,
                autocorrect: false,
              ),
              const SizedBox(height: 12),
              // API Key
              TextFormField(
                controller: _apiKeyController,
                decoration: InputDecoration(
                  labelText: 'API Key',
                  hintText: isEdit
                      ? '留空表示保持原密钥'
                      : (_type == ProviderType.ollama
                          ? '本地服务无需 API Key'
                          : '输入服务商提供的密钥'),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureApiKey
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                    ),
                    tooltip:
                        _obscureApiKey ? '显示 API Key' : '隐藏 API Key',
                    onPressed: () => setState(
                        () => _obscureApiKey = !_obscureApiKey),
                  ),
                ),
                obscureText: _obscureApiKey,
                validator: _validateApiKey,
                autocorrect: false,
                enableSuggestions: false,
              ),
              const SizedBox(height: 12),
              // Model
              TextFormField(
                controller: _modelController,
                decoration: const InputDecoration(labelText: '模型名'),
                validator: _validateModel,
                autocorrect: false,
              ),
              const SizedBox(height: 16),
              // Temperature
              Text('Temperature: ${_temperature.toStringAsFixed(2)}',
                  style: theme.textTheme.bodyMedium),
              Slider(
                value: _temperature,
                min: 0,
                max: 2,
                divisions: 40,
                label: _temperature.toStringAsFixed(2),
                onChanged: (v) => setState(() => _temperature = v),
              ),
              const SizedBox(height: 8),
              // Max Tokens
              Text('Max Tokens: $_maxTokens', style: theme.textTheme.bodyMedium),
              Slider(
                value: _maxTokens.toDouble(),
                min: 256,
                max: 8192,
                divisions: 99,
                label: '$_maxTokens',
                onChanged: (v) => setState(() => _maxTokens = v.round()),
              ),
              const SizedBox(height: 8),
              // 设为活跃
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('设为活跃 Provider'),
                subtitle: const Text('同一时间仅一个 Provider 可为活跃'),
                value: _isActive,
                onChanged: (v) => setState(() => _isActive = v),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isTesting || _isSaving
              ? null
              : () => Navigator.of(context).pop(false),
          child: const Text('取消'),
        ),
        // 测试连接
        OutlinedButton.icon(
          onPressed: _isTesting || _isSaving ? null : _testConnection,
          icon: _isTesting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.wifi_tethering),
          label: const Text('测试连接'),
        ),
        FilledButton(
          onPressed: _isTesting || _isSaving ? null : _save,
          child: _isSaving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('保存'),
        ),
      ],
    );
  }
}
