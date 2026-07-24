import 'package:flutter/material.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';

/// 灵犀学院 AppBar 组件
///
/// 基于 [AppBar]，默认居中标题，可选吉祥物头像作为 leading。
/// 支持滚动联动背景变化、leading/title/actions 交错入场。
class LingxiAppBar extends StatefulWidget implements PreferredSizeWidget {
  const LingxiAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.mascotAvatar,
    this.centerTitle = true,
    this.backgroundColor,
    this.foregroundColor,
    this.elevation = 0,
    this.scrolledUnderElevation = 0,
    this.bottom,
    this.scrollController,
    this.animateEntrance = true,
    this.backgroundGradient,
  });

  /// 标题
  final Widget title;

  /// 右侧操作区
  final List<Widget>? actions;

  /// 左侧前导部件（优先于 [mascotAvatar]）
  final Widget? leading;

  /// 吉祥物头像，作为默认 leading
  final Widget? mascotAvatar;

  /// 是否居中标题
  final bool centerTitle;

  /// 背景色
  final Color? backgroundColor;

  /// 前景色
  final Color? foregroundColor;

  /// 海拔
  final double elevation;

  /// 滚动时的海拔
  final double scrolledUnderElevation;

  /// 底部部件（如 TabBar）
  final PreferredSizeWidget? bottom;

  /// 滚动控制器（用于滚动联动效果）
  final ScrollController? scrollController;

  /// 是否启用 staggered 入场动画
  final bool animateEntrance;

  /// 背景渐变（设置后覆盖 backgroundColor）
  final Gradient? backgroundGradient;

  @override
  State<LingxiAppBar> createState() => _LingxiAppBarState();

  @override
  Size get preferredSize => Size.fromHeight(
        bottom == null
            ? kToolbarHeight
            : kToolbarHeight + bottom!.preferredSize.height,
      );
}

class _LingxiAppBarState extends State<LingxiAppBar> {
  bool _scrolled = false;
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    widget.scrollController?.addListener(_onScroll);
    if (widget.animateEntrance && !AnimationUtils.platformReduceMotion) {
      Future.delayed(const Duration(milliseconds: 50), () {
        if (mounted) setState(() => _visible = true);
      });
    } else {
      _visible = true;
    }
  }

  @override
  void didUpdateWidget(covariant LingxiAppBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.scrollController != widget.scrollController) {
      oldWidget.scrollController?.removeListener(_onScroll);
      widget.scrollController?.addListener(_onScroll);
    }
  }

  @override
  void dispose() {
    widget.scrollController?.removeListener(_onScroll);
    super.dispose();
  }

  void _onScroll() {
    final controller = widget.scrollController;
    if (controller == null || !controller.hasClients) return;
    final offset = controller.offset;
    final isScrolled = offset > 4;
    if (isScrolled != _scrolled && mounted) {
      setState(() => _scrolled = isScrolled);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    final effectiveBg = _scrolled
        ? (widget.backgroundColor ?? colorScheme.surfaceContainerLow)
        : (widget.backgroundColor ?? theme.appBarTheme.backgroundColor ?? colorScheme.surface);

    Widget title = widget.title;
    Widget? leading = widget.leading ?? widget.mascotAvatar;
    List<Widget>? actions = widget.actions;

    // staggered 入场动画
    if (widget.animateEntrance && !reduceMotion) {
      const duration = SpringMotion.fastDuration;
      const curve = SpringMotion.entranceCurve;

      if (leading != null) {
        leading = AnimatedOpacity(
          opacity: _visible ? 1.0 : 0.0,
          duration: duration,
          curve: curve,
          child: AnimatedSlide(
            offset: _visible ? Offset.zero : const Offset(-0.2, 0),
            duration: duration,
            curve: curve,
            child: leading,
          ),
        );
      }

      title = AnimatedOpacity(
        opacity: _visible ? 1.0 : 0.0,
        duration: duration,
        curve: curve,
        child: AnimatedSlide(
          offset: _visible ? Offset.zero : const Offset(0, 0.3),
          duration: duration,
          curve: curve,
          child: title,
        ),
      );

      if (actions != null) {
        actions = [
          for (var i = 0; i < actions.length; i++)
            AnimatedOpacity(
              opacity: _visible ? 1.0 : 0.0,
              duration: duration,
              curve: curve,
              child: AnimatedSlide(
                offset: _visible ? Offset.zero : const Offset(0.2, 0),
                duration: duration,
                curve: curve,
                child: actions[i],
              ),
            ),
        ];
      }
    }

    // 构建 AppBar
    PreferredSizeWidget appBar;
    if (widget.backgroundGradient != null) {
      appBar = AppBar(
        title: title,
        centerTitle: widget.centerTitle,
        actions: actions,
        leading: leading,
        backgroundColor: Colors.transparent,
        foregroundColor: widget.foregroundColor ?? theme.appBarTheme.foregroundColor,
        elevation: widget.elevation,
        scrolledUnderElevation: widget.scrolledUnderElevation,
        bottom: widget.bottom,
        flexibleSpace: Container(
          decoration: BoxDecoration(gradient: widget.backgroundGradient),
        ),
        shape: _scrolled
            ? Border(
                bottom: BorderSide(
                  color: colorScheme.outlineVariant.withValues(alpha: 0.3),
                  width: 0.5,
                ),
              )
            : null,
      );
    } else {
      // 滚动联动底部边框：通过 AppBar.shape 参数实现，避免用 AnimatedContainer
      // 包装 AppBar 导致类型不匹配 PreferredSizeWidget。
      // 注：AppBar 自身的 scrolledUnderElevation 已处理滚动抬升，此处仅补充视觉分隔线。
      final bottomBorder = _scrolled
          ? Border(
              bottom: BorderSide(
                color: colorScheme.outlineVariant.withValues(alpha: 0.3),
                width: 0.5,
              ),
            )
          : null;
      appBar = AppBar(
        title: title,
        centerTitle: widget.centerTitle,
        actions: actions,
        leading: leading,
        backgroundColor: effectiveBg,
        foregroundColor:
            widget.foregroundColor ?? theme.appBarTheme.foregroundColor,
        elevation: widget.elevation,
        scrolledUnderElevation: widget.scrolledUnderElevation,
        bottom: widget.bottom,
        shape: bottomBorder,
      );
    }

    return appBar;
  }
}
