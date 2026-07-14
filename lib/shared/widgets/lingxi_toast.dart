import 'package:flutter/material.dart';

/// Toast 变体类型。
enum LingxiToastVariant {
  /// 成功提示（绿色图标）
  success,

  /// 错误提示（红色图标）
  error,

  /// 警告提示（橙色图标）
  warning,

  /// 信息提示（蓝色图标）
  info,
}

/// 灵犀学院统一 Toast/SnackBar 工具。
///
/// 提供一致的样式和动画效果，支持成功/错误/警告/信息四种变体。
/// 通过静态方法 [LingxiToast.show] 便捷调用。
class LingxiToast {
  LingxiToast._();

  /// 显示 Toast 消息。
  ///
  /// 使用 ScaffoldMessenger 展示 SnackBar，自动适配主题颜色。
  static void show(
    BuildContext context, {
    required String message,
    LingxiToastVariant variant = LingxiToastVariant.info,
    Duration duration = const Duration(seconds: 3),
    SnackBarAction? action,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    final (icon, bgColor, fgColor) = _getVariantStyle(variant, colorScheme);

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(icon, color: fgColor, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: TextStyle(color: fgColor),
                ),
              ),
            ],
          ),
          backgroundColor: bgColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          duration: duration,
          action: action,
        ),
      );
  }

  /// 便捷方法：显示成功 Toast。
  static void success(BuildContext context, String message) {
    show(context, message: message, variant: LingxiToastVariant.success);
  }

  /// 便捷方法：显示错误 Toast。
  static void error(BuildContext context, String message) {
    show(context, message: message, variant: LingxiToastVariant.error);
  }

  /// 便捷方法：显示警告 Toast。
  static void warning(BuildContext context, String message) {
    show(context, message: message, variant: LingxiToastVariant.warning);
  }

  /// 便捷方法：显示信息 Toast。
  static void info(BuildContext context, String message) {
    show(context, message: message, variant: LingxiToastVariant.info);
  }

  static (IconData, Color, Color) _getVariantStyle(
    LingxiToastVariant variant,
    ColorScheme colorScheme,
  ) {
    switch (variant) {
      case LingxiToastVariant.success:
        return (
          Icons.check_circle_rounded,
          const Color(0xFF1B5E20).withValues(alpha: 0.9),
          Colors.white,
        );
      case LingxiToastVariant.error:
        return (
          Icons.error_rounded,
          colorScheme.error.withValues(alpha: 0.9),
          colorScheme.onError,
        );
      case LingxiToastVariant.warning:
        return (
          Icons.warning_rounded,
          const Color(0xFFE65100).withValues(alpha: 0.9),
          Colors.white,
        );
      case LingxiToastVariant.info:
        return (
          Icons.info_rounded,
          colorScheme.inverseSurface,
          colorScheme.onInverseSurface,
        );
    }
  }
}
