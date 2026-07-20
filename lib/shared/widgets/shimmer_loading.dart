import 'package:flutter/material.dart';

/// 通用骨架屏（Shimmer）加载容器。
///
/// 通过 [ShaderMask] + 横向滑动的 [LinearGradient] 实现高光从左到右扫过的动画，
/// 常用于列表、卡片、聊天气泡等内容加载时的占位展示。
///
/// 当 [enabled] 为 `false` 或系统开启了"减少动态效果"
/// （[MediaQuery.disableAnimations]）时，动画会被禁用，
/// 子组件的不透明区域将以 [baseColor] 静态填充。
///
/// [child] 应当是一个纯色（推荐白色）占位 Widget，其不透明区域定义了骨架形状；
/// 透明区域不会被 shimmer 覆盖。所有预置组件（[ShimmerCard]、[ShimmerListItem]、
/// [ShimmerChatBubble]）已遵循此约定。
class ShimmerLoading extends StatefulWidget {
  /// 创建一个 Shimmer 加载容器。
  const ShimmerLoading({
    super.key,
    required this.child,
    this.baseColor,
    this.highlightColor,
    this.period = const Duration(milliseconds: 2000),
    this.enabled = true,
  });

  /// 需要以 Shimmer 效果遮罩的子组件。
  ///
  /// 子组件的不透明区域（例如白色 [Container]、[DecoratedBox]）定义了骨架形状，
  /// 高光将沿此形状扫过。透明区域不受影响。
  final Widget child;

  /// 骨架底色。
  ///
  /// 未指定时使用主题中 [ColorScheme.surfaceContainerHighest]。
  final Color? baseColor;

  /// 高光扫过的亮色。
  ///
  /// 未指定时基于 [baseColor] 在 HSL 空间提亮约 12% 亮度自动计算。
  final Color? highlightColor;

  /// 动画周期，默认 2 秒一次完整的从左到右扫动。
  final Duration period;

  /// 是否启用动画。为 `false` 时仅以 [baseColor] 静态填充不透明区域。
  final bool enabled;

  @override
  State<ShimmerLoading> createState() => _ShimmerLoadingState();
}

class _ShimmerLoadingState extends State<ShimmerLoading>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this)
      ..addListener(() {
        if (mounted) {
          setState(() {});
        }
      });
    if (widget.enabled) {
      _startRepeat();
    }
  }

  void _startRepeat() {
    _controller.repeat(
      min: 0.0,
      max: 1.0,
      period: widget.period,
    );
  }

  @override
  void didUpdateWidget(covariant ShimmerLoading oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.enabled && !oldWidget.enabled) {
      _startRepeat();
    } else if (!widget.enabled && oldWidget.enabled) {
      _controller.stop();
      _controller.value = 0.0;
    } else if (widget.period != oldWidget.period && widget.enabled) {
      _controller.stop();
      _startRepeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _resolveBaseColor(BuildContext context) {
    if (widget.baseColor != null) {
      return widget.baseColor!;
    }
    return Theme.of(context).colorScheme.surfaceContainerHighest;
  }

  Color _resolveHighlightColor(Color base) {
    if (widget.highlightColor != null) {
      return widget.highlightColor!;
    }
    final hsl = HSLColor.fromColor(base);
    final lightened = (hsl.lightness + 0.12).clamp(0.0, 1.0);
    return hsl.withLightness(lightened).toColor();
  }

  @override
  Widget build(BuildContext context) {
    final disableAnimations =
        MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final animate = widget.enabled && !disableAnimations;

    final baseColor = _resolveBaseColor(context);

    if (!animate) {
      // 静态模式：用 baseColor 替换子组件所有不透明像素的颜色，保留 alpha。
      return ColorFiltered(
        colorFilter: ColorFilter.mode(baseColor, BlendMode.srcIn),
        child: widget.child,
      );
    }

    final highlightColor = _resolveHighlightColor(baseColor);
    // 动画值 0→1 映射到位移比例 -1→1，使高光带从左侧外完全滑入、右侧外完全滑出。
    final slidePercent = -1.0 + _controller.value * 2.0;

    // 包裹 RepaintBoundary 隔离 shimmer 循环动画的重绘，避免父级连带重建。
    return RepaintBoundary(
      child: ShaderMask(
        blendMode: BlendMode.srcATop,
        shaderCallback: (bounds) {
          return LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [
              baseColor,
              baseColor,
              highlightColor,
              baseColor,
              baseColor,
            ],
            // 高光带约占 40% 宽度（0.3~0.7），中央最亮。
            const stops: [0.0, 0.3, 0.5, 0.7, 1.0],
            tileMode: TileMode.clamp,
            transform: _SlidingGradientTransform(slidePercent: slidePercent),
          ).createShader(bounds);
        },
        child: widget.child,
      ),
    );
  }
}

/// 用于让 [LinearGradient] 沿水平方向平移的 [GradientTransform]。
///
/// [slidePercent] 为相对于绘制 bounds 宽度的平移比例；-1 表示将渐变左移一个
/// 完整宽度（高光位于左侧外），1 表示右移一个完整宽度（高光位于右侧外）。
class _SlidingGradientTransform extends GradientTransform {
  const _SlidingGradientTransform({required this.slidePercent});

  final double slidePercent;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(slidePercent * bounds.width, 0.0, 0.0);
  }
}

// ---------------------------------------------------------------------------
// 预置骨架组件
// ---------------------------------------------------------------------------

/// 矩形卡片骨架占位。
///
/// 适用于课程卡片、笔记卡片、成就卡片等矩形内容区域的加载占位。
/// 默认 16px 圆角、160px 高度，可通过 [width]、[height]、[borderRadius] 调整。
class ShimmerCard extends StatelessWidget {
  /// 创建一个矩形卡片骨架占位。
  const ShimmerCard({
    super.key,
    this.width,
    this.height,
    this.borderRadius = const BorderRadius.all(Radius.circular(16)),
    this.baseColor,
    this.highlightColor,
    this.period = const Duration(milliseconds: 2000),
    this.enabled = true,
    this.margin,
  });

  /// 卡片宽度。未指定时占满父级可用宽度。
  final double? width;

  /// 卡片高度，默认 160。
  final double? height;

  /// 卡片圆角，默认 16px。
  final BorderRadiusGeometry borderRadius;

  /// 骨架底色，未指定时使用主题默认色。
  final Color? baseColor;

  /// 高光颜色，未指定时自动计算。
  final Color? highlightColor;

  /// 动画周期，默认 2 秒。
  final Duration period;

  /// 是否启用动画。
  final bool enabled;

  /// 外边距。
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    final card = ShimmerLoading(
      baseColor: baseColor,
      highlightColor: highlightColor,
      period: period,
      enabled: enabled,
      child: Container(
        width: width ?? double.infinity,
        height: height ?? 160,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: borderRadius,
        ),
      ),
    );

    if (margin == null) {
      return card;
    }
    return Padding(
      padding: margin!,
      child: card,
    );
  }
}

/// 列表项骨架占位。
///
/// 左侧圆形头像 + 右侧两行宽度不等的文字条，模拟常见列表项（对话列表、
/// 笔记列表、课程列表等）的加载状态。
class ShimmerListItem extends StatelessWidget {
  /// 创建一个列表项骨架占位。
  const ShimmerListItem({
    super.key,
    this.avatarSize = 48,
    this.titleWidthFactor = 0.6,
    this.subtitleWidthFactor = 0.4,
    this.lineHeight = 12,
    this.lineSpacing = 8,
    this.spacing = 12,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    this.baseColor,
    this.highlightColor,
    this.period = const Duration(milliseconds: 2000),
    this.enabled = true,
  });

  /// 左侧圆形头像直径，默认 48。
  final double avatarSize;

  /// 标题行宽度占父级可用宽度的比例，默认 0.6。
  final double titleWidthFactor;

  /// 副标题行宽度占父级可用宽度的比例，默认 0.4。
  final double subtitleWidthFactor;

  /// 单行文字条高度，默认 12。
  final double lineHeight;

  /// 两行文字之间的垂直间距，默认 8。
  final double lineSpacing;

  /// 头像与文字列之间的水平间距，默认 12。
  final double spacing;

  /// 内边距，默认左右 16、上下 12。
  final EdgeInsetsGeometry padding;

  /// 骨架底色，未指定时使用主题默认色。
  final Color? baseColor;

  /// 高光颜色，未指定时自动计算。
  final Color? highlightColor;

  /// 动画周期，默认 2 秒。
  final Duration period;

  /// 是否启用动画。
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final lineRadius = BorderRadius.circular(lineHeight / 2);

    return ShimmerLoading(
      baseColor: baseColor,
      highlightColor: highlightColor,
      period: period,
      enabled: enabled,
      child: Padding(
        padding: padding,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // 圆形头像
            Container(
              width: avatarSize,
              height: avatarSize,
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
            ),
            SizedBox(width: spacing),
            // 两行宽度不等的文字条
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final maxWidth = constraints.maxWidth;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: maxWidth * titleWidthFactor,
                        height: lineHeight,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: lineRadius,
                        ),
                      ),
                      SizedBox(height: lineSpacing),
                      Container(
                        width: maxWidth * subtitleWidthFactor,
                        height: lineHeight,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: lineRadius,
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 聊天气泡骨架占位。
///
/// 圆角矩形气泡，可通过 [alignment] 控制左/右对齐以区分对方/己方消息，
/// 适用于聊天页加载历史消息或等待 AI 回复时的占位。
class ShimmerChatBubble extends StatelessWidget {
  /// 创建一个聊天气泡骨架占位。
  const ShimmerChatBubble({
    super.key,
    this.widthFactor = 0.6,
    this.height = 48,
    this.borderRadius = const BorderRadius.all(Radius.circular(20)),
    this.alignment = Alignment.centerLeft,
    this.baseColor,
    this.highlightColor,
    this.period = const Duration(milliseconds: 2000),
    this.enabled = true,
    this.margin,
  });

  /// 气泡宽度占父级可用宽度的比例，默认 0.6。
  final double widthFactor;

  /// 气泡高度，默认 48（约两行文字）。
  final double height;

  /// 气泡圆角，默认 20px 全圆角。
  final BorderRadiusGeometry borderRadius;

  /// 气泡在父级中的对齐方式，默认左侧对齐（对方消息）。
  /// 使用 [Alignment.centerRight] 可模拟己方消息。
  final Alignment alignment;

  /// 骨架底色，未指定时使用主题默认色。
  final Color? baseColor;

  /// 高光颜色，未指定时自动计算。
  final Color? highlightColor;

  /// 动画周期，默认 2 秒。
  final Duration period;

  /// 是否启用动画。
  final bool enabled;

  /// 外边距。
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    final bubble = ShimmerLoading(
      baseColor: baseColor,
      highlightColor: highlightColor,
      period: period,
      enabled: enabled,
      child: Align(
        alignment: alignment,
        child: FractionallySizedBox(
          widthFactor: widthFactor,
          child: Container(
            height: height,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: borderRadius,
            ),
          ),
        ),
      ),
    );

    if (margin == null) {
      return bubble;
    }
    return Padding(
      padding: margin!,
      child: bubble,
    );
  }
}
