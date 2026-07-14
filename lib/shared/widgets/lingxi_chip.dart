import 'package:flutter/material.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';

/// Chip 变体
enum LingxiChipVariant {
  /// 过滤（可选中）
  filter,

  /// 信息（仅展示）
  info,

  /// 操作（可点击）
  action,
}

/// 灵犀学院 Chip 组件
///
/// 基于 Material [Chip] 系列封装，圆角 12（[ShapeVariants.roundedMedium]）。
/// 支持三种变体：
/// - [LingxiChipVariant.filter]：可选中（[FilterChip]），选中态切换时带弹性缩放动画与轻触觉反馈
/// - [LingxiChipVariant.info]：仅展示（[RawChip]），可选 [onTap] 让其变为可点击（类似 [ActionChip]）、[onDeleted] 显示删除按钮（删除时带收缩淡出动画）
/// - [LingxiChipVariant.action]：可点击（[ActionChip]）
///
/// 组件会自动跟随 [MediaQuery.disableAnimations]（即"减少动画"无障碍设置），
/// 当开启时跳过所有动画。
class LingxiChip extends StatefulWidget {
  const LingxiChip({
    super.key,
    required this.label,
    this.avatar,
    this.variant = LingxiChipVariant.info,
    this.selected = false,
    this.onSelected,
    this.onPressed,
    this.onDeleted,
    this.color,
    this.onTap,
  });

  /// 标签
  final Widget label;

  /// 头像（前缀图标等）
  final Widget? avatar;

  /// 变体
  final LingxiChipVariant variant;

  /// 是否选中（仅 [LingxiChipVariant.filter] 生效）
  final bool selected;

  /// 选中状态变化回调（仅 [LingxiChipVariant.filter] 生效）
  final ValueChanged<bool>? onSelected;

  /// 点击回调（仅 [LingxiChipVariant.action] 生效）
  final VoidCallback? onPressed;

  /// 删除回调（仅 [LingxiChipVariant.info] 生效）。
  /// 触发时组件会先播放收缩淡出动画，动画结束后再调用该回调。
  final VoidCallback? onDeleted;

  /// 自定义 Chip 背景色；为 null 时使用主题默认颜色。
  final Color? color;

  /// 点击回调（仅 [LingxiChipVariant.info] 生效）。
  /// 设置后信息 Chip 可点击，类似 [ActionChip] 行为，支持与 [onDeleted] 共存。
  final VoidCallback? onTap;

  @override
  State<LingxiChip> createState() => _LingxiChipState();
}

class _LingxiChipState extends State<LingxiChip>
    with TickerProviderStateMixin {
  /// 选中态切换时的弹性缩放动画
  late AnimationController _bounceController;
  late Animation<double> _bounceAnimation;

  /// 删除时的收缩 + 淡出动画
  late AnimationController _dismissController;
  late Animation<double> _dismissScaleAnimation;
  late Animation<double> _dismissOpacityAnimation;

  /// 动画时长
  static const Duration _kAnimationDuration = Duration(milliseconds: 200);

  @override
  void initState() {
    super.initState();

    // 弹性缩放动画：0.9 -> 1.0，使用 easeOutBack 曲线自带过冲弹跳效果
    _bounceController = AnimationController(
      vsync: this,
      duration: _kAnimationDuration,
      value: 1.0, // 初始静止状态为 1.0
    );
    _bounceAnimation = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(
        parent: _bounceController,
        curve: Curves.easeOutBack,
      ),
    );

    // 删除动画：缩放 1.0 -> 0.0，不透明度 1.0 -> 0.0
    _dismissController = AnimationController(
      vsync: this,
      duration: _kAnimationDuration,
    );
    _dismissScaleAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _dismissController,
        curve: Curves.easeIn,
      ),
    );
    _dismissOpacityAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _dismissController,
        curve: Curves.easeIn,
      ),
    );
    _dismissController.addStatusListener(_handleDismissStatus);
  }

  @override
  void didUpdateWidget(covariant LingxiChip oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 选中状态变化时触发弹性缩放动画
    if (widget.selected != oldWidget.selected) {
      _playBounceAnimation();
    }
  }

  /// 播放选中态弹性动画
  void _playBounceAnimation() {
    if (AnimationUtils.reduceMotionOf(context)) {
      return;
    }
    // 轻触觉反馈
    AnimationUtils.hapticLight();
    // 重置到 0.0（对应 scale 0.9），再向前播放到 1.0（easeOutBack 产生过冲弹跳）
    _bounceController.value = 0.0;
    _bounceController.forward();
  }

  /// 处理删除按钮点击：先播放动画，结束后再回调
  void _handleDeleteTap() {
    if (widget.onDeleted == null) return;
    if (AnimationUtils.reduceMotionOf(context)) {
      widget.onDeleted!();
      return;
    }
    _dismissController.forward();
  }

  /// 删除动画结束后调用外部回调
  void _handleDismissStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed) {
      widget.onDeleted?.call();
    }
  }

  @override
  void dispose() {
    _dismissController.removeStatusListener(_handleDismissStatus);
    _bounceController.dispose();
    _dismissController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool reduceMotion = AnimationUtils.reduceMotionOf(context);
    final shape = ShapeVariants.roundedMedium.toShapeBorder();

    Widget child;
    switch (widget.variant) {
      case LingxiChipVariant.filter:
        child = FilterChip(
          label: widget.label,
          avatar: widget.avatar,
          selected: widget.selected,
          onSelected: widget.onSelected,
          shape: shape,
          backgroundColor: widget.color,
          selectedColor: widget.color,
        );
      case LingxiChipVariant.action:
        child = ActionChip(
          label: widget.label,
          avatar: widget.avatar,
          onPressed: widget.onPressed,
          shape: shape,
          backgroundColor: widget.color,
        );
      case LingxiChipVariant.info:
        // 使用 RawChip 以同时支持 onPressed（onTap）与 onDeleted
        child = RawChip(
          label: widget.label,
          avatar: widget.avatar,
          onPressed: widget.onTap,
          onDeleted: widget.onDeleted != null ? _handleDeleteTap : null,
          shape: shape,
          backgroundColor: widget.color,
          tapEnabled: widget.onTap != null || widget.onDeleted != null,
        );
    }

    // 减少动画模式下直接返回原始 Chip，不包裹任何动画
    if (reduceMotion) {
      return child;
    }

    return AnimatedBuilder(
      animation: Listenable.merge([_bounceController, _dismissController]),
      builder: (context, animatedChild) {
        // 正在删除（含已完成）时使用删除动画值；否则使用弹跳动画值
        final double scale;
        final double opacity;
        if (_dismissController.isAnimating ||
            _dismissController.status == AnimationStatus.completed) {
          scale = _dismissScaleAnimation.value;
          opacity = _dismissOpacityAnimation.value;
        } else {
          // 未播放弹跳动画时 _bounceController 停在 1.0，scale 为 1.0
          scale = _bounceAnimation.value;
          opacity = 1.0;
        }
        return Transform.scale(
          scale: scale,
          child: Opacity(
            opacity: opacity,
            child: animatedChild,
          ),
        );
      },
      child: child,
    );
  }
}
