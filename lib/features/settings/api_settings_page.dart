import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/provider_config.dart';
import '../../data/providers/storage_providers.dart';
import '../ai/ai_providers.dart';
import '../mascot/mascot_widget.dart';
import '../../shared/widgets/lingxi_app_bar.dart';
import '../../shared/widgets/lingxi_card.dart';
import 'provider_edit_dialog.dart';

/// 当前已配置的 Provider 列表 FutureProvider。
///
/// 在增删改后通过 `ref.invalidate(providerConfigsProvider)` 触发刷新。
final providerConfigsProvider =
    FutureProvider.autoDispose<List<ProviderConfig>>((ref) async {
  final repo = ref.watch(providerConfigRepositoryProvider);
  return repo.getAllProviders();
});

/// API 配置管理页。
///
/// 展示所有已配置的 AI 服务商，支持新增、编辑、删除、设为活跃。
/// 顶部说明卡片解释"用户自备 API，密钥本地加密存储"。
class ApiSettingsPage extends ConsumerWidget {
  const ApiSettingsPage({super.key});

  /// 根据 [ProviderType] 返回对应图标。
  IconData _iconFor(ProviderType type) {
    switch (type) {
      case ProviderType.openaiCompatible:
        return Icons.smart_toy_outlined;
      case ProviderType.anthropic:
        return Icons.psychology_outlined;
      case ProviderType.gemini:
        return Icons.auto_awesome_outlined;
      case ProviderType.ollama:
        return Icons.dns_outlined;
    }
  }

  Future<void> _openEditDialog(
    WidgetRef ref,
    BuildContext context, {
    ProviderConfig? existing,
  }) async {
    final saved = await showProviderEditDialog(context, existing: existing);
    if (saved) {
      ref.invalidate(providerConfigsProvider);
      // 失效 registry 缓存的 Provider 实例，再触发 FutureProvider 重建。
      ref.read(aiProviderRegistryProvider).invalidateCache();
      ref.invalidate(currentAiProviderProvider);
    }
  }

  Future<void> _confirmDelete(
    WidgetRef ref,
    BuildContext context,
    ProviderConfig config,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除配置'),
        content: Text('确认删除 ${config.providerType.displayName} 的配置？'
            '该操作会同时清除本地加密存储的 API Key。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(providerConfigRepositoryProvider).deleteProvider(
          config.providerType,
        );
    ref.invalidate(providerConfigsProvider);
    ref.read(aiProviderRegistryProvider).invalidateCache();
    ref.invalidate(currentAiProviderProvider);
  }

  /// 设为活跃：当前 Provider enabled=true，其余置 false。
  Future<void> _setActive(
    WidgetRef ref,
    BuildContext context,
    ProviderConfig config,
  ) async {
    final repo = ref.read(providerConfigRepositoryProvider);
    await repo.saveProvider(config.copyWith(enabled: true));
    final all = await repo.getAllProviders();
    for (final p in all) {
      if (p.providerType == config.providerType) continue;
      if (p.enabled) {
        await repo.saveProvider(p.copyWith(enabled: false));
      }
    }
    ref.invalidate(providerConfigsProvider);
    ref.read(aiProviderRegistryProvider).invalidateCache();
    ref.invalidate(currentAiProviderProvider);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('已将 ${config.providerType.displayName} 设为活跃'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final asyncConfigs = ref.watch(providerConfigsProvider);

    return Scaffold(
      appBar: const LingxiAppBar(title: Text('API 配置')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openEditDialog(ref, context),
        icon: const Icon(Icons.add),
        label: const Text('添加 Provider'),
      ),
      body: asyncConfigs.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败：$e')),
        data: (configs) {
          if (configs.isEmpty) {
            return _EmptyState(
              onAdd: () => _openEditDialog(ref, context),
            );
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            children: [
              // 说明卡片
              LingxiCard(
                color: theme.colorScheme.secondaryContainer,
                child: Row(
                  children: [
                    Icon(Icons.lock_outline,
                        color: theme.colorScheme.onSecondaryContainer),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '用户自备 API Key，密钥通过平台安全存储'
                        '（Android Keystore / Windows DPAPI）'
                        '本地加密保存，不会上传至任何服务器。',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSecondaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              for (final config in configs) ...[
                _ProviderCard(
                  config: config,
                  icon: _iconFor(config.providerType),
                  onEdit: () =>
                      _openEditDialog(ref, context, existing: config),
                  onDelete: () => _confirmDelete(ref, context, config),
                  onSetActive: () => _setActive(ref, context, config),
                ),
                const SizedBox(height: 12),
              ],
            ],
          );
        },
      ),
    );
  }
}

/// 单个 Provider 配置卡片。
class _ProviderCard extends StatelessWidget {
  const _ProviderCard({
    required this.config,
    required this.icon,
    required this.onEdit,
    required this.onDelete,
    required this.onSetActive,
  });

  final ProviderConfig config;
  final IconData icon;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onSetActive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isActive = config.enabled;
    return LingxiCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor:
                    (isActive ? cs.primaryContainer : cs.surfaceContainerHigh),
                foregroundColor:
                    (isActive ? cs.onPrimaryContainer : cs.onSurfaceVariant),
                child: Icon(icon),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(config.providerType.displayName,
                        style: theme.textTheme.titleMedium),
                    const SizedBox(height: 2),
                    Text(
                      config.baseUrl,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: cs.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              // 状态标签
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isActive
                      ? cs.primaryContainer
                      : cs.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isActive ? '活跃' : '非活跃',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: isActive
                        ? cs.onPrimaryContainer
                        : cs.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '模型：${config.model}',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (!isActive)
                TextButton.icon(
                  onPressed: onSetActive,
                  icon: const Icon(Icons.check_circle_outline, size: 18),
                  label: const Text('设为活跃'),
                ),
              TextButton.icon(
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: const Text('编辑'),
              ),
              TextButton.icon(
                onPressed: onDelete,
                icon: Icon(Icons.delete_outline,
                    size: 18, color: cs.error),
                label: Text('删除', style: TextStyle(color: cs.error)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// 空状态：吉祥物 + CTA。
class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onAdd});

  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            const MascotWidget(size: 140, enableTapInteraction: false),
            const SizedBox(height: 24),
            Text('还没有 API 配置', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              '添加第一个 API 配置，开启 AI 对话与学习功能',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add),
              label: const Text('添加第一个 API 配置'),
            ),
          ],
        ),
      ),
    );
  }
}
