import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/motion/animation_utils.dart';
import '../../core/motion/spring_motion.dart';
import '../../core/providers/app_providers.dart';
import '../../core/router/route_names.dart';
import '../../data/models/provider_config.dart';
import '../../data/providers/db_providers.dart';
import '../../data/providers/storage_providers.dart';
import '../ai/ai_providers.dart';
import '../../shared/widgets/lingxi_app_bar.dart';
import '../../shared/widgets/lingxi_button.dart';
import '../../shared/widgets/lingxi_card.dart';
import 'api_settings_page.dart' show providerConfigsProvider;
import 'data_export_service.dart';

/// 应用版本号（与 pubspec.yaml 保持一致）。
const kAppVersion = '0.1.0';

/// GitHub 仓库地址。
const kRepoUrl = 'https://github.com/lingxiacademy/lingxi-academy';

/// 设置页。
///
/// 分组展示外观、语言、学习偏好、数据管理、API 配置入口、关于与帮助。
/// 所有用户偏好通过 [SharedPreferences] 持久化，状态通过 Riverpod
/// StateProvider 双向绑定。
class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  bool _contentVisible = false;

  @override
  void initState() {
    super.initState();
    if (AnimationUtils.platformReduceMotion) {
      _contentVisible = true;
    } else {
      Future.delayed(const Duration(milliseconds: 80), () {
        if (mounted) setState(() => _contentVisible = true);
      });
    }
  }

  Future<void> _setThemeMode(WidgetRef ref, ThemeMode mode) async {
    AnimationUtils.hapticLight();
    ref.read(themeModeProvider.notifier).state = mode;
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.setInt('theme_mode', mode.index);
  }

  Future<void> _setLocale(WidgetRef ref, Locale locale) async {
    AnimationUtils.hapticLight();
    ref.read(localeProvider.notifier).state = locale;
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.setString('locale', locale.languageCode == 'en' ? 'en' : 'zh');
  }

  Future<void> _setSocratic(WidgetRef ref, bool value) async {
    AnimationUtils.hapticLight();
    ref.read(socraticModeProvider.notifier).set(value);
  }

  Future<void> _replayOnboarding(WidgetRef ref, BuildContext context) async {
    final confirmed = await _confirm(
      context,
      title: '重看引导',
      content: '将重新进入引导流程，确认继续？',
    );
    if (confirmed != true) return;
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.setBool('onboarding_completed', false);
    ref.read(onboardingCompletedProvider.notifier).state = false;
    if (context.mounted) context.go(RouteNames.onboardingPath);
  }

  Future<void> _exportData(WidgetRef ref, BuildContext context) async {
    try {
      final path = await ref.read(dataExportServiceProvider).exportToFile();
      if (context.mounted) {
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('导出成功'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('数据已导出到：'),
                const SizedBox(height: 8),
                SelectableText(path),
                const SizedBox(height: 8),
                const Text(
                  '注：导出文件不含 API Key，可安全备份或迁移。',
                  style: TextStyle(fontSize: 12),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('关闭'),
              ),
              FilledButton(
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: path));
                  if (context.mounted) Navigator.of(context).pop();
                },
                child: const Text('复制路径'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('导出失败：$e')));
      }
    }
  }

  Future<void> _importData(WidgetRef ref, BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => _ImportDialog(
        importService: ref.read(dataImportServiceProvider),
      ),
    );
    if (result == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('导入完成')),
      );
    }
  }

  Future<void> _clearAllData(WidgetRef ref, BuildContext context) async {
    final confirmed = await _confirm(
      context,
      title: '清空所有数据',
      content: '将永久删除所有对话、消息、笔记、学习进度、成就与 API 配置'
          '（含本地加密存储的 API Key）。此操作不可恢复，确认继续？',
      destructive: true,
    );
    if (confirmed != true) return;

    final db = ref.read(databaseProvider);
    final providerRepo = ref.read(providerConfigRepositoryProvider);
    final secureStorage = ref.read(secureStorageServiceProvider);

    await db.delete(db.conversations).go();
    await db.delete(db.messages).go();
    await db.delete(db.notes).go();
    await db.delete(db.progress).go();
    await db.delete(db.achievements).go();
    await db.delete(db.streaks).go();
    await db.delete(db.settings).go();

    for (final type in ProviderType.values) {
      await providerRepo.deleteProvider(type);
    }
    await secureStorage.deleteAllApiKeys();

    ref.invalidate(providerConfigsProvider);
    ref.invalidate(currentAiProviderProvider);

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('已清空所有数据')),
      );
    }
  }

  Future<bool?> _confirm(
    BuildContext context, {
    required String title,
    required String content,
    bool destructive = false,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            style: destructive
                ? FilledButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.error,
                    foregroundColor: Theme.of(context).colorScheme.onError,
                  )
                : null,
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('确认'),
          ),
        ],
      ),
    );
  }

  Future<void> _copyRepoUrl(BuildContext context) async {
    await Clipboard.setData(const ClipboardData(text: kRepoUrl));
    if (context.mounted) {
      AnimationUtils.hapticLight();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('仓库地址已复制')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeProvider);
    final socratic = ref.watch(socraticModeProvider);
    final asyncProviders = ref.watch(providerConfigsProvider);
    final hasConfiguredProvider = asyncProviders.maybeWhen(
      data: (list) => list.any((p) => p.enabled),
      orElse: () => false,
    );

    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    final sections = <Widget>[
      // 外观
      const _SectionTitle('外观'),
      _AnimatedSettingsCard(
        index: 0,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('主题', style: theme.textTheme.bodyLarge),
            const SizedBox(height: 8),
            SegmentedButton<ThemeMode>(
              segments: const [
                ButtonSegment(
                  value: ThemeMode.system,
                  label: Text('跟随系统'),
                  icon: Icon(Icons.brightness_auto_outlined),
                ),
                ButtonSegment(
                  value: ThemeMode.light,
                  label: Text('浅色'),
                  icon: Icon(Icons.light_mode_outlined),
                ),
                ButtonSegment(
                  value: ThemeMode.dark,
                  label: Text('深色'),
                  icon: Icon(Icons.dark_mode_outlined),
                ),
              ],
              selected: {themeMode},
              onSelectionChanged: (s) => _setThemeMode(ref, s.first),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),

      // 语言
      const _SectionTitle('语言'),
      _AnimatedSettingsCard(
        index: 1,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('界面语言', style: theme.textTheme.bodyLarge),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'zh', label: Text('简体中文')),
                ButtonSegment(value: 'en', label: Text('English')),
              ],
              selected: {
                locale.languageCode == 'en' ? 'en' : 'zh',
              },
              onSelectionChanged: (s) => _setLocale(
                ref,
                s.first == 'en'
                    ? const Locale('en', 'US')
                    : const Locale('zh', 'CN'),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),

      // 学习偏好
      const _SectionTitle('学习偏好'),
      _AnimatedSettingsCard(
        index: 2,
        child: SpringMotion.scalePressFeedback(
          enableHaptic: false,
          child: SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('苏格拉底引导模式'),
            subtitle: const Text('AI 以引导式提问帮助你思考，而非直接给出答案'),
            value: socratic,
            onChanged: (v) => _setSocratic(ref, v),
          ),
        ),
      ),
      const SizedBox(height: 16),

      // 数据
      const _SectionTitle('数据'),
      _AnimatedSettingsCard(
        index: 3,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            LingxiButton(
              label: const Text('导出数据'),
              icon: const Icon(Icons.upload_outlined),
              variant: LingxiButtonVariant.elevated,
              onPressed: () => _exportData(ref, context),
            ),
            const SizedBox(height: 8),
            LingxiButton(
              label: const Text('导入数据'),
              icon: const Icon(Icons.download_outlined),
              variant: LingxiButtonVariant.elevated,
              onPressed: () => _importData(ref, context),
            ),
            const SizedBox(height: 8),
            LingxiButton(
              label: const Text('清空所有数据'),
              icon: const Icon(Icons.delete_forever_outlined),
              variant: LingxiButtonVariant.text,
              onPressed: () => _clearAllData(ref, context),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),

      // API 配置
      const _SectionTitle('AI 服务'),
      _AnimatedSettingsCard(
        index: 4,
        onTap: () => context.go(RouteNames.settingsApiPath),
        child: Row(
          children: [
            const Icon(Icons.key_outlined),
            const SizedBox(width: 12),
            const Expanded(child: Text('API 配置')),
            AnimatedSwitcher(
              duration: SpringMotion.fastDuration,
              switchInCurve: SpringMotion.bouncyCurve,
              switchOutCurve: Curves.easeIn,
              transitionBuilder: (child, animation) =>
                  ScaleTransition(scale: animation, child: child),
              child: hasConfiguredProvider
                  ? SpringMotion.scalePressFeedback(
                      key: const ValueKey('connected'),
                      enableHaptic: false,
                      child: SpringMotion.shimmerGlow(
                        glowColor: Colors.green,
                        period: const Duration(milliseconds: 2500),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.check_circle,
                                color: Colors.green.shade600, size: 18),
                            const SizedBox(width: 4),
                            Text(
                              '已连接',
                              style: TextStyle(
                                color: Colors.green.shade600,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : Icon(
                      Icons.error_outline,
                      key: const ValueKey('disconnected'),
                      color: theme.colorScheme.onSurfaceVariant,
                      size: 18,
                    ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_outlined),
          ],
        ),
      ),
      const SizedBox(height: 16),

      // 关于
      const _SectionTitle('关于'),
      _AnimatedSettingsCard(
        index: 5,
        child: Column(
          children: [
            SpringMotion.scalePressFeedback(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.info_outline),
                title: const Text('版本'),
                trailing: Text(kAppVersion),
              ),
            ),
            SpringMotion.scalePressFeedback(
              onTap: () => _copyRepoUrl(context),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.code_outlined),
                title: const Text('GitHub 仓库'),
                trailing: const Icon(Icons.copy_outlined, size: 18),
              ),
            ),
            SpringMotion.scalePressFeedback(
              onTap: () => showLicensePage(
                context: context,
                applicationName: '灵犀学院',
                applicationVersion: kAppVersion,
              ),
              child: const ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.description_outlined),
                title: Text('开源许可'),
                trailing: Icon(Icons.chevron_right_outlined),
              ),
            ),
            SpringMotion.scalePressFeedback(
              onTap: () => _replayOnboarding(ref, context),
              child: const ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.replay_outlined),
                title: Text('重看引导'),
                trailing: Icon(Icons.chevron_right_outlined),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),

      // 帮助
      const _SectionTitle('帮助'),
      _AnimatedSettingsCard(
        index: 6,
        onTap: () => context.go(RouteNames.helpPath),
        child: const Row(
          children: [
            Icon(Icons.help_outline),
            SizedBox(width: 12),
            Expanded(child: Text('帮助中心')),
            Icon(Icons.chevron_right_outlined),
          ],
        ),
      ),
    ];

    Widget list = ListView(
      padding: const EdgeInsets.all(16),
      children: sections,
    );

    if (reduceMotion) {
      return Scaffold(
        appBar: const LingxiAppBar(title: Text('设置')),
        body: list,
      );
    }

    return Scaffold(
      appBar: const LingxiAppBar(title: Text('设置')),
      body: AnimatedOpacity(
        opacity: _contentVisible ? 1.0 : 0.0,
        duration: SpringMotion.gentleDuration,
        curve: SpringMotion.entranceCurve,
        child: AnimatedSlide(
          offset: _contentVisible ? Offset.zero : const Offset(0, 0.03),
          duration: SpringMotion.gentleDuration,
          curve: SpringMotion.entranceCurve,
          child: list,
        ),
      ),
    );
  }
}

/// 分组标题（带淡入上移动画）。
class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text, {this.index = 0});
  final String text;
  final int index;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final title = Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
    if (reduceMotion) return title;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: SpringMotion.fastDuration,
      curve: SpringMotion.entranceCurve,
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, 6 * (1 - value)),
          child: child,
        ),
      ),
      child: title,
    );
  }
}

/// 带动画入场的设置卡片。
class _AnimatedSettingsCard extends StatelessWidget {
  const _AnimatedSettingsCard({
    required this.index,
    required this.child,
    this.onTap,
  });

  final int index;
  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return LingxiCard(
      animateEntrance: true,
      entranceDelay: Duration(milliseconds: 60 * index),
      onTap: onTap,
      child: child,
    );
  }
}

/// 导入数据对话框。
class _ImportDialog extends ConsumerStatefulWidget {
  const _ImportDialog({required this.importService});

  final DataImportService importService;

  @override
  ConsumerState<_ImportDialog> createState() => _ImportDialogState();
}

class _ImportDialogState extends ConsumerState<_ImportDialog> {
  final _controller = TextEditingController();
  ImportPreview? _preview;
  String? _error;
  bool _importing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _parse() {
    setState(() {
      _error = null;
      _preview = null;
    });
    try {
      final preview = widget.importService.previewImport(_controller.text);
      setState(() => _preview = preview);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  Future<void> _doImport() async {
    setState(() => _importing = true);
    try {
      await widget.importService.importAll(_controller.text);
      if (mounted) {
        ref.invalidate(providerConfigsProvider);
        ref.invalidate(currentAiProviderProvider);
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _importing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AlertDialog(
      title: const Text('导入数据'),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('粘贴之前导出的 JSON 文本：',
                style: TextStyle(fontSize: 13)),
            const SizedBox(height: 8),
            TextField(
              controller: _controller,
              maxLines: 6,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: '在此粘贴 JSON ...',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
            ],
            if (_preview != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_previewText(_preview!)),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _importing ? null : () => Navigator.of(context).pop(false),
          child: const Text('取消'),
        ),
        OutlinedButton(
          onPressed: _importing ? null : _parse,
          child: const Text('解析预览'),
        ),
        FilledButton(
          onPressed: (_preview == null || _importing) ? null : _doImport,
          child: _importing
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('确认导入'),
        ),
      ],
    );
  }

  String _previewText(ImportPreview p) {
    return '即将导入：\n'
        '  对话 ${p.conversations} 条（含消息 ${p.messages} 条）\n'
        '  笔记 ${p.notes} 条\n'
        '  进度 ${p.progress} 条\n'
        '  成就 ${p.achievements} 条\n'
        '  连续学习 ${p.streaks} 条\n'
        '  设置 ${p.settings} 项\n'
        '  Provider 配置 ${p.providerConfigs} 个\n'
        '（已存在的记录将跳过，不覆盖）';
  }
}
