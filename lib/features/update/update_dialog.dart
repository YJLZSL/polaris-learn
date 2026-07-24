// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/theme/lingxi_colors.dart';
import 'package:lingxi_academy/core/theme/lingxi_elevations.dart';
import 'package:lingxi_academy/core/theme/lingxi_gradients.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:lingxi_academy/features/mascot/mascot_widget.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';

import 'update_controller.dart';
import 'update_state.dart';

/// 自动更新弹窗。
///
/// 设计语言：编辑式版本公告 + 星空紫氛围。
/// - 顶部：庆祝渐变条带 + 吉祥物小犀（celebrate 情绪）作为视觉焦点
/// - 中部：大号版本号 + Release Notes（Markdown 渲染）
/// - 底部：根据状态切换的主操作 + 次要操作
///
/// 状态适配：
/// - [UpdateStatus.available]：立即更新 / 跳过此版本 / 稍后
/// - [UpdateStatus.downloading]：环形进度 + 百分比 / 取消
/// - [UpdateStatus.downloaded]：立即安装
/// - [UpdateStatus.installing]：等待安装完成
/// - [UpdateStatus.error]：错误信息 + 重试 / 关闭
class UpdateDialog extends ConsumerStatefulWidget {
  const UpdateDialog({super.key, this.force = false});

  /// 是否为手动触发（用于决定关闭后是否重置状态）。
  final bool force;

  /// 显示更新弹窗。
  ///
  /// 若当前状态为 [UpdateStatus.idle] 或 [UpdateStatus.upToDate]，
  /// 会先触发一次强制检查。
  static Future<void> show(
    BuildContext context, {
    bool force = false,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: !force,
      builder: (context) => UpdateDialog(force: force),
    );
  }

  @override
  ConsumerState<UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends ConsumerState<UpdateDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _entranceController;

  @override
  void initState() {
    super.initState();
    _entranceController = AnimationController(
      vsync: this,
      duration: SpringMotion.slowDuration,
    );
    if (AnimationUtils.platformReduceMotion) {
      _entranceController.value = 1.0;
    } else {
      Future.delayed(const Duration(milliseconds: 30), () {
        if (mounted) _entranceController.forward();
      });
    }

    // 首次打开时若状态为 idle，触发一次检查
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(updateControllerProvider);
      if (state.status == UpdateStatus.idle ||
          state.status == UpdateStatus.upToDate) {
        ref
            .read(updateControllerProvider.notifier)
            .checkForUpdates(force: widget.force, silent: false);
      }
    });
  }

  @override
  void dispose() {
    _entranceController.dispose();
    super.dispose();
  }

  void _close() {
    Navigator.of(context).maybePop();
    // 关闭后稍延迟重置，避免动画过程中状态突变
    Future.delayed(const Duration(milliseconds: 200), () {
      ref.read(updateControllerProvider.notifier).reset();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(updateControllerProvider);
    final theme = Theme.of(context);
    final gradients = context.lingxiGradients;
    final elevations = context.lingxiElevations;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: AnimatedBuilder(
        animation: _entranceController,
        builder: (context, child) {
          final t = _entranceController.value;
          final scale = reduceMotion ? 1.0 : (0.92 + 0.08 * t);
          final opacity = reduceMotion ? 1.0 : t;
          return Transform.scale(
            scale: scale,
            child: Opacity(opacity: opacity, child: child),
          );
        },
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460, maxHeight: 640),
          child: Container(
            clipBehavior: Clip.antiAlias,
            decoration: ShapeDecoration(
              color: theme.colorScheme.surface,
              shape: ShapeVariants.roundedExtraLarge.toShapeBorder(),
              shadows: elevations.highlighted,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _HeaderBanner(state: state, gradients: gradients),
                Flexible(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                    child: _Body(
                      state: state,
                      ref: ref,
                      onClose: _close,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 顶部渐变横幅 + 吉祥物 + 大号版本号。
class _HeaderBanner extends StatelessWidget {
  const _HeaderBanner({required this.state, required this.gradients});

  final UpdateState state;
  final LingxiGradients gradients;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final info = state.releaseInfo;
    final isNew = state.status == UpdateStatus.available ||
        state.status == UpdateStatus.downloading ||
        state.status == UpdateStatus.downloaded;

    // 头部渐变：发现新版本用 celebration 渐变，否则用 primarySurface
    final headerGradient = isNew
        ? gradients.celebration
        : LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.colorScheme.primary.withValues(alpha: 0.85),
              theme.colorScheme.primaryContainer.withValues(alpha: 0.95),
            ],
          );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      decoration: BoxDecoration(gradient: headerGradient),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 吉祥物（小尺寸，作为视觉焦点，但不抢戏）
              RepaintBoundary(
                child: MascotWidget(
                  size: 64,
                  showAura: false,
                  enableTapInteraction: false,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _eyebrowText(state.status),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.5,
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.85)
                            : Colors.white.withValues(alpha: 0.92),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _versionHeadline(state.status, info?.version),
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                        color: isDark ? Colors.white : Colors.white,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (info != null) ...[
            const SizedBox(height: 10),
            Text(
              info.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                color: isDark
                    ? Colors.white.withValues(alpha: 0.75)
                    : Colors.white.withValues(alpha: 0.92),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _eyebrowText(UpdateStatus status) {
    switch (status) {
      case UpdateStatus.checking:
        return 'CHECKING';
      case UpdateStatus.upToDate:
        return 'CURRENT';
      case UpdateStatus.available:
        return 'NEW RELEASE';
      case UpdateStatus.downloading:
        return 'DOWNLOADING';
      case UpdateStatus.downloaded:
        return 'READY TO INSTALL';
      case UpdateStatus.installing:
        return 'INSTALLING';
      case UpdateStatus.error:
        return 'ERROR';
      case UpdateStatus.skipped:
        return 'SKIPPED';
      case UpdateStatus.idle:
        return 'UPDATE';
    }
  }

  String _versionHeadline(UpdateStatus status, String? version) {
    if (version == null) {
      return switch (status) {
        UpdateStatus.checking => '检查中…',
        UpdateStatus.upToDate => '已是最新',
        UpdateStatus.idle => '检查更新',
        _ => '检查更新',
      };
    }
    return 'v$version';
  }
}

/// 弹窗主体：根据状态切换内容。
class _Body extends StatelessWidget {
  const _Body({
    required this.state,
    required this.ref,
    required this.onClose,
  });

  final UpdateState state;
  final WidgetRef ref;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    switch (state.status) {
      case UpdateStatus.idle:
        return _IdleBody(onClose: onClose);
      case UpdateStatus.checking:
        return const _CheckingBody();
      case UpdateStatus.upToDate:
        return _UpToDateBody(
          release: state.releaseInfo,
          onClose: onClose,
        );
      case UpdateStatus.available:
        return _AvailableBody(
          state: state,
          ref: ref,
          onClose: onClose,
        );
      case UpdateStatus.downloading:
        return _DownloadingBody(
          progress: state.downloadProgress,
          ref: ref,
        );
      case UpdateStatus.downloaded:
        return _DownloadedBody(state: state, ref: ref);
      case UpdateStatus.installing:
        return const _InstallingBody();
      case UpdateStatus.error:
        return _ErrorBody(
          message: state.errorMessage ?? '未知错误',
          ref: ref,
          onClose: onClose,
        );
      case UpdateStatus.skipped:
        return _SkippedBody(onClose: onClose);
    }
  }
}

class _IdleBody extends StatelessWidget {
  const _IdleBody({required this.onClose});
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 12),
        Text(
          '点击下方按钮检查 GitHub Release。',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton(onPressed: onClose, child: const Text('关闭')),
          ],
        ),
      ],
    );
  }
}

class _CheckingBody extends StatelessWidget {
  const _CheckingBody();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
            SizedBox(height: 12),
            Text('正在查询最新版本…'),
          ],
        ),
      ),
    );
  }
}

class _UpToDateBody extends StatelessWidget {
  const _UpToDateBody({required this.release, required this.onClose});

  final ReleaseInfo? release;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green.shade600, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '当前已是最新版本',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        if (release != null) ...[
          const SizedBox(height: 12),
          Text(
            '最新版本：v${release!.version}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            FilledButton(onPressed: onClose, child: const Text('好的')),
          ],
        ),
      ],
    );
  }
}

class _AvailableBody extends StatelessWidget {
  const _AvailableBody({
    required this.state,
    required this.ref,
    required this.onClose,
  });

  final UpdateState state;
  final WidgetRef ref;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final info = state.releaseInfo!;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ReleaseNotesCard(notes: info.body),
        const SizedBox(height: 16),
        _ActionRow(
          primaryLabel: '立即更新',
          primaryIcon: Icons.download_rounded,
          onPrimary: () => ref
              .read(updateControllerProvider.notifier)
              .downloadUpdate(),
          secondaryLabel: '稍后',
          onSecondary: onClose,
          tertiaryLabel: '跳过此版本',
          onTertiary: () async {
            await ref.read(updateControllerProvider.notifier).skipCurrentVersion();
            onClose();
          },
          pulse: true,
        ),
      ],
    );
  }
}

class _DownloadingBody extends StatelessWidget {
  const _DownloadingBody({
    required this.progress,
    required this.ref,
  });

  final double progress;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradients = context.lingxiGradients;
    final percent = (progress * 100).clamp(0, 100).toInt();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 进度条：使用 success 渐变填充
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Stack(
              children: [
                Container(
                  height: 12,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: progress.clamp(0.0, 1.0),
                  child: Container(
                    height: 12,
                    decoration: BoxDecoration(
                      gradient: gradients.success,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '正在下载更新…',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              Text(
                '$percent%',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () =>
                    ref.read(updateControllerProvider.notifier).cancelDownload(),
                child: const Text('取消'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DownloadedBody extends StatelessWidget {
  const _DownloadedBody({required this.state, required this.ref});

  final UpdateState state;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: [
            Icon(Icons.download_done, color: Colors.green.shade600, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '下载完成，点击立即安装',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          '安装过程将交由系统接管，应用可能会重启。',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            FilledButton.icon(
              onPressed: () =>
                  ref.read(updateControllerProvider.notifier).installUpdate(),
              icon: const Icon(Icons.install_mobile),
              label: const Text('立即安装'),
            ),
          ],
        ),
      ],
    );
  }
}

class _InstallingBody extends StatelessWidget {
  const _InstallingBody();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
            SizedBox(height: 12),
            Text('正在安装…'),
          ],
        ),
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({
    required this.message,
    required this.ref,
    required this.onClose,
  });

  final String message;
  final WidgetRef ref;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.lingxiColors;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.error_outline, color: colors.misconceptionRed, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: theme.textTheme.bodyMedium,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton(onPressed: onClose, child: const Text('关闭')),
            const SizedBox(width: 8),
            FilledButton.icon(
              onPressed: () => ref
                  .read(updateControllerProvider.notifier)
                  .checkForUpdates(force: true),
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('重试'),
            ),
          ],
        ),
      ],
    );
  }
}

class _SkippedBody extends StatelessWidget {
  const _SkippedBody({required this.onClose});
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 12),
        const Text('已跳过此版本'),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            FilledButton(onPressed: onClose, child: const Text('关闭')),
          ],
        ),
      ],
    );
  }
}

/// Release Notes 卡片（Markdown 渲染）。
class _ReleaseNotesCard extends StatelessWidget {
  const _ReleaseNotesCard({required this.notes});
  final String notes;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (notes.trim().isEmpty) {
      return const SizedBox.shrink();
    }
    return Container(
      constraints: const BoxConstraints(maxHeight: 240),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: MarkdownBody(
          data: notes,
          selectable: false,
          styleSheet: MarkdownStyleSheet.fromTheme(theme).copyWith(
            p: theme.textTheme.bodySmall,
            h1: theme.textTheme.titleSmall,
            h2: theme.textTheme.titleSmall,
            h3: theme.textTheme.titleSmall,
            code: theme.textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
              backgroundColor: theme.colorScheme.surfaceContainerHigh,
            ),
            codeblockDecoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ),
      ),
    );
  }
}

/// 操作按钮行（主操作 + 次要 + 第三操作）。
class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.primaryLabel,
    required this.primaryIcon,
    required this.onPrimary,
    required this.secondaryLabel,
    required this.onSecondary,
    required this.tertiaryLabel,
    required this.onTertiary,
    this.pulse = false,
  });

  final String primaryLabel;
  final IconData primaryIcon;
  final VoidCallback onPrimary;
  final String secondaryLabel;
  final VoidCallback onSecondary;
  final String tertiaryLabel;
  final VoidCallback onTertiary;
  final bool pulse;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LingxiButton(
          label: Text(primaryLabel),
          icon: Icon(primaryIcon),
          variant: LingxiButtonVariant.filled,
          size: LingxiButtonSize.large,
          onPressed: onPrimary,
          pulse: pulse,
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: onTertiary,
              child: Text(tertiaryLabel),
            ),
            TextButton(
              onPressed: onSecondary,
              child: Text(secondaryLabel),
            ),
          ],
        ),
      ],
    );
  }
}

/// 便捷函数：从外部页面唤起更新检查。
///
/// 推荐用法：
/// ```dart
/// await UpdateDialog.show(context, force: true);
/// ```
Future<void> showUpdateDialog(BuildContext context, {bool force = false}) {
  return UpdateDialog.show(context, force: force);
}
