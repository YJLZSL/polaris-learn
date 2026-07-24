import 'package:flutter/material.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';

/// 灵犀学院统一对话框组件。
///
/// 提供一致的圆角、标题、内容和操作按钮布局。
/// 支持自定义图标和确认/取消回调。
class LingxiDialog extends StatelessWidget {
  const LingxiDialog({
    super.key,
    required this.title,
    this.content,
    this.contentWidget,
    this.icon,
    this.iconColor,
    this.confirmLabel = '确认',
    this.cancelLabel = '取消',
    this.onConfirm,
    this.onCancel,
    this.showCancel = true,
    this.isDestructive = false,
  });

  /// 对话框标题。
  final String title;

  /// 文本内容（与 [contentWidget] 二选一）。
  final String? content;

  /// 自定义内容 Widget（与 [content] 二选一）。
  final Widget? contentWidget;

  /// 标题图标。
  final IconData? icon;

  /// 图标颜色。
  final Color? iconColor;

  /// 确认按钮文字。
  final String confirmLabel;

  /// 取消按钮文字。
  final String cancelLabel;

  /// 确认回调。
  final VoidCallback? onConfirm;

  /// 取消回调。
  final VoidCallback? onCancel;

  /// 是否显示取消按钮。
  final bool showCancel;

  /// 是否为破坏性操作（确认按钮变红）。
  final bool isDestructive;

  /// 便捷的弹出方法。
  static Future<bool?> show(
    BuildContext context, {
    required String title,
    String? content,
    Widget? contentWidget,
    IconData? icon,
    Color? iconColor,
    String confirmLabel = '确认',
    String cancelLabel = '取消',
    bool showCancel = true,
    bool isDestructive = false,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => LingxiDialog(
        title: title,
        content: content,
        contentWidget: contentWidget,
        icon: icon,
        iconColor: iconColor,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        showCancel: showCancel,
        isDestructive: isDestructive,
        onConfirm: () => Navigator.of(ctx).pop(true),
        onCancel: () => Navigator.of(ctx).pop(false),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return SpringMotion.springTransition(
      beginScale: 0.9,
      beginOffset: const Offset(0, 0.02),
      child: AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: ShapeVariants.roundedExtraLarge.borderRadius,
        ),
        icon: icon != null
            ? Icon(
                icon,
                size: 32,
                color: iconColor ?? colorScheme.primary,
              )
            : null,
        title: Text(
          title,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
          textAlign: TextAlign.center,
        ),
        content: contentWidget ??
            (content != null
                ? Text(
                    content!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  )
                : null),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          if (showCancel)
            TextButton(
              onPressed: onCancel ?? () => Navigator.of(context).pop(false),
              child: Text(cancelLabel),
            ),
          FilledButton(
            onPressed: onConfirm ?? () => Navigator.of(context).pop(true),
            style: isDestructive
                ? FilledButton.styleFrom(
                    backgroundColor: colorScheme.error,
                    foregroundColor: colorScheme.onError,
                  )
                : null,
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
  }
}
