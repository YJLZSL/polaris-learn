import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';

/// 毛玻璃容器组件
///
/// 使用 [BackdropFilter] 实现磨砂玻璃效果，适用于滚动 AppBar、
/// 弹层背景、吉祥物对话气泡等需要透出下层内容的场景。
class GlassContainer extends StatelessWidget {
  const GlassContainer({
    super.key,
    required this.child,
    this.sigmaX = 12,
    this.sigmaY = 12,
    this.color,
    this.borderRadius,
    this.padding,
    this.margin,
    this.border,
  });

  /// 子内容
  final Widget child;

  /// 水平模糊程度
  final double sigmaX;

  /// 垂直模糊程度
  final double sigmaY;

  /// 背景色（默认白色 15% 透明度）
  final Color? color;

  /// 圆角（默认 roundedLarge = 16px）
  final BorderRadius? borderRadius;

  /// 内边距
  final EdgeInsetsGeometry? padding;

  /// 外边距
  final EdgeInsetsGeometry? margin;

  /// 可选边框
  final Border? border;

  @override
  Widget build(BuildContext context) {
    final effectiveBorderRadius =
        borderRadius ?? ShapeVariants.roundedLarge.borderRadius;
    final effectiveColor = color ?? Colors.white.withValues(alpha: 0.15);

    Widget result = ClipRRect(
      borderRadius: effectiveBorderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: sigmaX, sigmaY: sigmaY),
        child: Container(
          decoration: BoxDecoration(
            color: effectiveColor,
            borderRadius: effectiveBorderRadius,
            border: border,
          ),
          padding: padding,
          child: child,
        ),
      ),
    );

    if (margin != null) {
      result = Padding(padding: margin!, child: result);
    }

    return result;
  }
}
