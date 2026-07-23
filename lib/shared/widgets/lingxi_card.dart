import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/theme/lingxi_elevations.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';

/// 卡片变体
enum LingxiCardVariant {
  /// 默认卡片（surfaceContainerLow 背景）
  defaultColor,

  /// 主色卡片（primaryContainer 背景）
  primary,

  /// 次要卡片（surfaceContainerHighest 背景）
  secondary,

  /// 毛玻璃卡片
  glass,
}

/// 灵犀学院卡片组件
///
/// 支持 hover 悬浮、按压缩放、入场动画、毛玻璃、渐变背景等效果。
class LingxiCard extends StatefulWidget {
  const LingxiCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.color,
    this.margin,
    this.variant = LingxiCardVariant.defaultColor,
    this.animateEntrance = false,
    this.entranceDelay = Duration.zero,
    this.backgroundGradient,
    this.borderColor,
    this.elevation = 1,
  });

  /// 子内容
  final Widget child;

  /// 点击回调，为 null 时不可点击
  final VoidCallback? onTap;

  /// 内边距，默认 16
  final EdgeInsetsGeometry? padding;

  /// 自定义背景色
  final Color? color;

  /// 外边距
  final EdgeInsetsGeometry? margin;

  /// 卡片变体
  final LingxiCardVariant variant;

  /// 是否启用入场动画（淡入 + 上移 + 缩放）
  final bool animateEntrance;

  /// 入场动画延迟（用于 staggered 效果）
  final Duration entranceDelay;

  /// 背景渐变（设置后覆盖 color/variant 的背景色）
  final Gradient? backgroundGradient;

  /// 边框颜色
  final Color? borderColor;

  /// 卡片阴影档位
  ///
  /// 映射到 [LingxiElevations] 的 3 档语义阴影：
  /// - 0 → [LingxiElevations.subtle]：平铺卡片
  /// - 1 → [LingxiElevations.elevated]：悬浮卡片（默认）
  /// - 2 → [LingxiElevations.highlighted]：强调卡片/对话框
  ///
  /// 可交互卡片在 hover 时会自动升级到 [LingxiElevations.highlighted]，
  /// press 时降级到 [LingxiElevations.subtle]，以提供视觉反馈。
  final int elevation;

  @override
  State<LingxiCard> createState() => _LingxiCardState();
}

class _LingxiCardState extends State<LingxiCard> {
  bool _hovering = false;
  bool _pressed = false;
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    if (widget.animateEntrance && !AnimationUtils.platformReduceMotion) {
      if (widget.entranceDelay == Duration.zero) {
        _visible = true;
      } else {
        Future.delayed(widget.entranceDelay, () {
          if (mounted) setState(() => _visible = true);
        });
      }
    } else {
      _visible = true;
    }
  }

  Color _resolveColor(BuildContext context) {
    if (widget.color != null) return widget.color!;
    final colorScheme = Theme.of(context).colorScheme;
    return switch (widget.variant) {
      LingxiCardVariant.defaultColor => colorScheme.surfaceContainerLow,
      LingxiCardVariant.primary => colorScheme.primaryContainer,
      LingxiCardVariant.secondary => colorScheme.surfaceContainerHighest,
      LingxiCardVariant.glass => Colors.white.withValues(alpha: 0.15),
    };
  }

  /// 解析当前应使用的阴影列表
  ///
  /// 基础阴影来自 [widget.elevation] 映射到 [LingxiElevations] 的 3 档语义阴影
  /// （0→subtle, 1→elevated, 2→highlighted）。
  /// 当卡片可交互且未启用 reduceMotion 时：
  /// - hover 状态升级到 [LingxiElevations.highlighted]
  /// - press 状态降级到 [LingxiElevations.subtle]
  /// 以提供视觉反馈。
  List<BoxShadow> _resolveShadows(
    BuildContext context,
    bool clickable,
    bool reduceMotion,
  ) {
    final elevations = Theme.of(context).extension<LingxiElevations>() ??
        LingxiElevations.light;

    // 基础阴影：根据 widget.elevation 选择档位
    final List<BoxShadow> base = switch (widget.elevation) {
      0 => elevations.subtle,
      2 => elevations.highlighted,
      _ => elevations.elevated,
    };

    if (!clickable || reduceMotion) {
      return base;
    }

    // 交互态：hover → highlighted，press → subtle
    if (_pressed) {
      return elevations.subtle;
    }
    if (_hovering) {
      return elevations.highlighted;
    }
    return base;
  }

  void _handleTap() {
    AnimationUtils.hapticLight();
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final borderRadius = ShapeVariants.roundedLarge.borderRadius;
    final cardColor = _resolveColor(context);
    final clickable = widget.onTap != null;

    // 动画值
    double scale = 1.0;
    if (clickable && !reduceMotion) {
      if (_pressed) {
        scale = 0.99;
      } else if (_hovering) {
        scale = 1.015;
      }
    }

    // 解析当前阴影（基础档位 + 交互态切换）
    final shadows = _resolveShadows(context, clickable, reduceMotion);

    Widget content = Padding(
      padding: widget.padding ?? const EdgeInsets.all(16),
      child: widget.child,
    );

    // 构建核心卡片（Material + InkWell 水波纹）
    Widget card = _buildCardSurface(
      color: cardColor,
      borderRadius: borderRadius,
      clickable: clickable,
      content: content,
      shadows: shadows,
    );

    // 毛玻璃
    if (widget.variant == LingxiCardVariant.glass) {
      card = ClipRRect(
        borderRadius: borderRadius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: card,
        ),
      );
    }

    // hover + press 动画（使用 Listener 避免与 InkWell 手势冲突）
    if (clickable && !reduceMotion) {
      card = MouseRegion(
        onEnter: (_) => setState(() => _hovering = true),
        onExit: (_) => setState(() {
          _hovering = false;
          _pressed = false;
        }),
        cursor: SystemMouseCursors.click,
        child: Listener(
          onPointerDown: (_) => setState(() => _pressed = true),
          onPointerUp: (_) => setState(() => _pressed = false),
          onPointerCancel: (_) => setState(() => _pressed = false),
          child: AnimatedScale(
            scale: scale,
            duration: SpringMotion.fastDuration,
            curve: SpringMotion.fastCurve,
            child: card,
          ),
        ),
      );
    }

    // 入场动画
    if (widget.animateEntrance && !reduceMotion) {
      card = AnimatedOpacity(
        opacity: _visible ? 1.0 : 0.0,
        duration: SpringMotion.gentleDuration,
        curve: SpringMotion.entranceCurve,
        child: AnimatedSlide(
          offset: _visible ? Offset.zero : const Offset(0, 0.05),
          duration: SpringMotion.gentleDuration,
          curve: SpringMotion.entranceCurve,
          child: AnimatedScale(
            scale: _visible ? 1.0 : 0.95,
            duration: SpringMotion.gentleDuration,
            curve: SpringMotion.entranceCurve,
            child: card,
          ),
        ),
      );
    }

    if (widget.margin != null) {
      card = Padding(padding: widget.margin!, child: card);
    }

    return card;
  }

  Widget _buildCardSurface({
    required Color color,
    required BorderRadius borderRadius,
    required bool clickable,
    required Widget content,
    required List<BoxShadow> shadows,
  }) {
    final hasBorder = widget.borderColor != null;
    final hasGradient = widget.backgroundGradient != null;

    return Material(
      color: hasGradient ? Colors.transparent : color,
      borderRadius: borderRadius,
      child: Ink(
        decoration: BoxDecoration(
          gradient: widget.backgroundGradient,
          borderRadius: borderRadius,
          border: hasBorder ? Border.all(color: widget.borderColor!) : null,
          boxShadow: shadows,
        ),
        child: clickable
            ? InkWell(
                onTap: _handleTap,
                borderRadius: borderRadius,
                child: content,
              )
            : content,
      ),
    );
  }
}
