import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/motion/animation_utils.dart';

/// 线性动画进度条组件
///
/// 提供平滑的弹簧式（easeOutCubic）进度动画，支持渐变填充、
/// 末端脉冲光点、不确定状态（光带扫过），并通过
/// [MediaQuery.disableAnimations] 响应系统"减少动画"设置。
class AnimatedProgressBar extends StatefulWidget {
  /// 当前进度值，范围 [0.0, 1.0]
  final double progress;

  /// 进度条高度，默认 8
  final double height;

  /// 轨道背景色，为空时使用主题色表面容器色
  final Color? backgroundColor;

  /// 进度填充色，当 [gradient] 为 null 时生效；
  /// 为空时使用主题色 primary
  final Color? foregroundColor;

  /// 渐变填充，若提供则覆盖 [foregroundColor]
  final Gradient? gradient;

  /// 圆角半径，默认 4
  final double borderRadius;

  /// 是否在进度末端显示脉冲呼吸光点
  final bool enablePulse;

  /// 是否为不确定状态：进度值被忽略，显示左右循环扫过的光带
  final bool indeterminate;

  const AnimatedProgressBar({
    super.key,
    this.progress = 0.0,
    this.height = 8,
    this.backgroundColor,
    this.foregroundColor,
    this.gradient,
    this.borderRadius = 4,
    this.enablePulse = false,
    this.indeterminate = false,
  }) : assert(progress >= 0.0 && progress <= 1.0);

  @override
  State<AnimatedProgressBar> createState() => _AnimatedProgressBarState();
}

class _AnimatedProgressBarState extends State<AnimatedProgressBar>
    with TickerProviderStateMixin {
  /// 驱动进度值变化的弹簧动画
  late AnimationController _progressController;
  late Animation<double> _progressAnimation;

  /// 驱动不确定光带扫动与脉冲光点呼吸的循环动画
  late AnimationController _effectController;

  /// 当前动画目标进度值，用于避免父组件重建时重复触发动画
  double _targetProgress = 0.0;

  @override
  void initState() {
    super.initState();
    final initial = widget.progress.clamp(0.0, 1.0).toDouble();
    _targetProgress = initial;

    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
      value: 1.0,
    );
    _progressAnimation = Tween<double>(begin: initial, end: initial).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.easeOutCubic),
    );

    _effectController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncEffectController();
  }

  @override
  void didUpdateWidget(covariant AnimatedProgressBar oldWidget) {
    super.didUpdateWidget(oldWidget);

    final bool disableAnimations =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    // 同步效果控制器（脉冲 / 不确定状态）
    if (widget.indeterminate != oldWidget.indeterminate ||
        widget.enablePulse != oldWidget.enablePulse) {
      _syncEffectController();
    }

    // 进度变化时触发弹簧动画
    final newProgress = widget.progress.clamp(0.0, 1.0).toDouble();
    if (!widget.indeterminate && newProgress != _targetProgress) {
      final currentDisplay = _progressAnimation.value;
      _progressAnimation = Tween<double>(
        begin: currentDisplay,
        end: newProgress,
      ).animate(CurvedAnimation(
        parent: _progressController,
        curve: Curves.easeOutCubic,
      ));
      _targetProgress = newProgress;
      if (disableAnimations) {
        _progressController.value = 1.0;
      } else {
        _progressController.forward(from: 0.0);
      }
    }
  }

  void _syncEffectController() {
    final needEffect = widget.indeterminate || widget.enablePulse;
    if (needEffect &&
        !_effectController.isAnimating &&
        !AnimationUtils.platformReduceMotion) {
      _effectController.repeat(
        reverse: widget.enablePulse && !widget.indeterminate,
      );
    } else if (!needEffect && _effectController.isAnimating) {
      _effectController.stop();
      _effectController.value = 0.0;
    }
  }

  @override
  void dispose() {
    _progressController.dispose();
    _effectController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bool disableAnimations =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    final bgColor = widget.backgroundColor ??
        theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5);
    final fgColor = widget.foregroundColor ?? theme.colorScheme.primary;
    final radius = BorderRadius.circular(widget.borderRadius);

    return SizedBox(
      height: widget.height,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final totalWidth = constraints.maxWidth;

          return Stack(
            clipBehavior: Clip.none,
            children: [
              // ---- 背景轨道 ----
              Container(
                width: totalWidth,
                height: widget.height,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: radius,
                ),
              ),

              // ---- 前景进度 ----
              if (disableAnimations)
                _buildDeterminateBar(
                  totalWidth,
                  fgColor,
                  radius,
                  widget.progress.clamp(0.0, 1.0).toDouble(),
                )
              else if (widget.indeterminate)
                _buildIndeterminateBar(totalWidth, fgColor, radius)
              else
                AnimatedBuilder(
                  animation: _progressController,
                  builder: (context, _) => _buildDeterminateBar(
                    totalWidth,
                    fgColor,
                    radius,
                    _progressAnimation.value.clamp(0.0, 1.0).toDouble(),
                  ),
                ),

              // ---- 末端脉冲光点 ----
              if (widget.enablePulse && !widget.indeterminate)
                disableAnimations
                    ? _buildStaticPulseDot(
                        totalWidth,
                        fgColor,
                        widget.progress.clamp(0.0, 1.0).toDouble(),
                      )
                    : RepaintBoundary(
                        child: AnimatedBuilder(
                          animation: Listenable.merge(
                              [_progressController, _effectController]),
                          builder: (context, _) => _buildPulseDot(
                            totalWidth,
                            fgColor,
                            _progressAnimation.value
                                .clamp(0.0, 1.0)
                                .toDouble(),
                            _effectController.value,
                          ),
                        ),
                      ),
            ],
          );
        },
      ),
    );
  }

  /// 构建确定状态的进度填充
  Widget _buildDeterminateBar(
    double totalWidth,
    Color fgColor,
    BorderRadius radius,
    double progress,
  ) {
    final width = totalWidth * progress;
    if (width <= 0) return const SizedBox.shrink();

    return Container(
      width: width,
      height: widget.height,
      decoration: widget.gradient != null
          ? BoxDecoration(borderRadius: radius, gradient: widget.gradient)
          : BoxDecoration(color: fgColor, borderRadius: radius),
    );
  }

  /// 构建不确定状态的扫动光带
  Widget _buildIndeterminateBar(
    double totalWidth,
    Color fgColor,
    BorderRadius radius,
  ) {
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _effectController,
        builder: (context, _) {
        // 光带宽度约为进度条的 30%，位置从 -30% 到 100% 循环
        final bandWidth = totalWidth * 0.3;
        final t = _effectController.value; // 0~1
        final left = (totalWidth + bandWidth) * t - bandWidth;

        // 裁剪在圆角轨道内
        return ClipRRect(
          borderRadius: radius,
          child: SizedBox(
            width: totalWidth,
            height: widget.height,
            child: Stack(
              children: [
                Positioned(
                  left: left,
                  top: 0,
                  child: Container(
                    width: bandWidth,
                    height: widget.height,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          fgColor.withValues(alpha: 0.0),
                          fgColor.withValues(alpha: 0.4),
                          fgColor,
                          fgColor.withValues(alpha: 0.4),
                          fgColor.withValues(alpha: 0.0),
                        ],
                        stops: const [0.0, 0.25, 0.5, 0.75, 1.0],
                      ),
                      borderRadius:
                          BorderRadius.circular(widget.borderRadius),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
      ),
    );
  }

  /// 构建动画脉冲光点
  Widget _buildPulseDot(
    double totalWidth,
    Color fgColor,
    double progress,
    double pulse,
  ) {
    if (progress <= 0) return const SizedBox.shrink();
    // pulse: repeat(reverse:true) 下在 0~1~0 之间变化
    final breath = math.sin(pulse * math.pi); // 0~1~0
    final scale = 1.0 + 0.35 * breath;
    final opacity = 0.4 + 0.6 * breath;
    final left = totalWidth * progress - widget.height / 2;

    final dotColor = fgColor;

    return Positioned(
      left: left,
      top: 0,
      child: IgnorePointer(
        child: Transform.scale(
          scale: scale,
          child: Opacity(
            opacity: opacity.clamp(0.2, 1.0).toDouble(),
            child: Container(
              width: widget.height,
              height: widget.height,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: dotColor,
                boxShadow: [
                  BoxShadow(
                    color: dotColor.withValues(alpha: 0.55),
                    blurRadius: widget.height * 0.75,
                    spreadRadius: 0.5,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// 构建静态光点（减少动画模式）
  Widget _buildStaticPulseDot(
    double totalWidth,
    Color fgColor,
    double progress,
  ) {
    if (progress <= 0) return const SizedBox.shrink();
    final left = totalWidth * progress - widget.height / 2;
    return Positioned(
      left: left,
      top: 0,
      child: IgnorePointer(
        child: Container(
          width: widget.height,
          height: widget.height,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: fgColor,
          ),
        ),
      ),
    );
  }
}

/// 环形动画进度组件
///
/// 使用 [CustomPainter] 绘制圆弧进度环，支持弹簧式进度动画、
/// 渐变描边、末端脉冲光点、不确定状态（旋转弧线），并响应
/// [MediaQuery.disableAnimations]。
class AnimatedCircularProgress extends StatefulWidget {
  /// 当前进度值，范围 [0.0, 1.0]
  final double progress;

  /// 圆环整体尺寸（宽高），默认 48
  final double size;

  /// 圆环描边宽度，默认 6
  final double strokeWidth;

  /// 轨道背景色
  final Color? backgroundColor;

  /// 进度弧颜色，当 [gradient] 为 null 时生效
  final Color? foregroundColor;

  /// 渐变描边，若提供则覆盖 [foregroundColor]
  final Gradient? gradient;

  /// 进度弧端点是否使用圆角
  final bool strokeCapRound;

  /// 是否在弧末端显示脉冲光点
  final bool enablePulse;

  /// 是否为不确定状态（显示持续旋转的短弧）
  final bool indeterminate;

  /// 环中心可选内容（如百分比文字、图标）
  final Widget? child;

  const AnimatedCircularProgress({
    super.key,
    this.progress = 0.0,
    this.size = 48,
    this.strokeWidth = 6,
    this.backgroundColor,
    this.foregroundColor,
    this.gradient,
    this.strokeCapRound = true,
    this.enablePulse = false,
    this.indeterminate = false,
    this.child,
  }) : assert(progress >= 0.0 && progress <= 1.0);

  @override
  State<AnimatedCircularProgress> createState() =>
      _AnimatedCircularProgressState();
}

class _AnimatedCircularProgressState extends State<AnimatedCircularProgress>
    with TickerProviderStateMixin {
  late AnimationController _progressController;
  late Animation<double> _progressAnimation;
  late AnimationController _effectController;
  double _targetProgress = 0.0;

  @override
  void initState() {
    super.initState();
    final initial = widget.progress.clamp(0.0, 1.0).toDouble();
    _targetProgress = initial;

    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
      value: 1.0,
    );
    _progressAnimation = Tween<double>(begin: initial, end: initial).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.easeOutCubic),
    );

    _effectController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncEffectController();
  }

  @override
  void didUpdateWidget(covariant AnimatedCircularProgress oldWidget) {
    super.didUpdateWidget(oldWidget);

    final bool disableAnimations =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    if (widget.indeterminate != oldWidget.indeterminate ||
        widget.enablePulse != oldWidget.enablePulse) {
      _syncEffectController();
    }

    final newProgress = widget.progress.clamp(0.0, 1.0).toDouble();
    if (!widget.indeterminate && newProgress != _targetProgress) {
      final currentDisplay = _progressAnimation.value;
      _progressAnimation = Tween<double>(
        begin: currentDisplay,
        end: newProgress,
      ).animate(CurvedAnimation(
        parent: _progressController,
        curve: Curves.easeOutCubic,
      ));
      _targetProgress = newProgress;
      if (disableAnimations) {
        _progressController.value = 1.0;
      } else {
        _progressController.forward(from: 0.0);
      }
    }
  }

  void _syncEffectController() {
    final needEffect = widget.indeterminate || widget.enablePulse;
    if (needEffect &&
        !_effectController.isAnimating &&
        !AnimationUtils.platformReduceMotion) {
      _effectController.repeat();
      // 注：环形不确定状态持续旋转不 reverse，脉冲呼吸用 sin 插值实现
    } else if (!needEffect && _effectController.isAnimating) {
      _effectController.stop();
      _effectController.value = 0.0;
    }
  }

  @override
  void dispose() {
    _progressController.dispose();
    _effectController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bool disableAnimations =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    final bgColor = widget.backgroundColor ??
        theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4);
    final fgColor = widget.foregroundColor ?? theme.colorScheme.primary;

    Widget painter;
    if (disableAnimations) {
      painter = CustomPaint(
        size: Size.square(widget.size),
        painter: _CircularProgressPainter(
          progress: widget.indeterminate
              ? 0.25
              : widget.progress.clamp(0.0, 1.0).toDouble(),
          backgroundColor: bgColor,
          foregroundColor: fgColor,
          gradient: widget.gradient,
          strokeWidth: widget.strokeWidth,
          strokeCapRound: widget.strokeCapRound,
          rotationOffset: -math.pi / 2,
          pulseValue:
              (widget.enablePulse && !widget.indeterminate) ? 0.5 : null,
        ),
      );
    } else if (widget.indeterminate) {
      painter = RepaintBoundary(
        child: AnimatedBuilder(
          animation: _effectController,
          builder: (context, _) {
            final t = _effectController.value;
            return CustomPaint(
              size: Size.square(widget.size),
              painter: _CircularProgressPainter(
                progress: 0.25,
                backgroundColor: bgColor,
                foregroundColor: fgColor,
                gradient: widget.gradient,
                strokeWidth: widget.strokeWidth,
                strokeCapRound: widget.strokeCapRound,
                rotationOffset: -math.pi / 2 + t * 2 * math.pi,
              ),
            );
          },
        ),
      );
    } else {
      painter = RepaintBoundary(
        child: AnimatedBuilder(
          animation: Listenable.merge([_progressController, _effectController]),
          builder: (context, _) {
            return CustomPaint(
              size: Size.square(widget.size),
              painter: _CircularProgressPainter(
                progress:
                    _progressAnimation.value.clamp(0.0, 1.0).toDouble(),
                backgroundColor: bgColor,
                foregroundColor: fgColor,
                gradient: widget.gradient,
                strokeWidth: widget.strokeWidth,
                strokeCapRound: widget.strokeCapRound,
                rotationOffset: -math.pi / 2,
                pulseValue:
                    widget.enablePulse ? _effectController.value : null,
              ),
            );
          },
        ),
      );
    }

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          painter,
          if (widget.child != null) widget.child!,
        ],
      ),
    );
  }
}

/// 环形进度绘制器
class _CircularProgressPainter extends CustomPainter {
  final double progress;
  final Color backgroundColor;
  final Color foregroundColor;
  final Gradient? gradient;
  final double strokeWidth;
  final bool strokeCapRound;
  final double rotationOffset;

  /// 若不为 null，则在进度弧末端绘制脉冲光点，值范围 [0,1]
  final double? pulseValue;

  _CircularProgressPainter({
    required this.progress,
    required this.backgroundColor,
    required this.foregroundColor,
    required this.gradient,
    required this.strokeWidth,
    required this.strokeCapRound,
    required this.rotationOffset,
    this.pulseValue,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius =
        (math.min(size.width, size.height) - strokeWidth) / 2;

    // ---- 背景轨道 ----
    final trackPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = strokeCapRound ? StrokeCap.round : StrokeCap.butt;
    canvas.drawCircle(center, radius, trackPaint);

    // ---- 进度弧 ----
    final arcPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = strokeCapRound ? StrokeCap.round : StrokeCap.butt;

    final rect = Rect.fromCircle(center: center, radius: radius);
    final sweepAngle = 2 * math.pi * progress;

    if (gradient != null) {
      arcPaint.shader = gradient!.createShader(rect);
    } else {
      arcPaint.color = foregroundColor;
    }

    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotationOffset);
    canvas.translate(-center.dx, -center.dy);

    canvas.drawArc(
      rect,
      0,
      sweepAngle,
      false,
      arcPaint,
    );
    canvas.restore();

    // ---- 末端脉冲光点 ----
    if (pulseValue != null && progress > 0) {
      final endAngle = rotationOffset + sweepAngle;
      final dotCenter = Offset(
        center.dx + radius * math.cos(endAngle),
        center.dy + radius * math.sin(endAngle),
      );

      final pulse = pulseValue!;
      // 呼吸效果：0~1 循环，breath 越大表示点越大越亮
      final breath = 0.5 + 0.5 * math.sin(pulse * 2 * math.pi);
      final dotRadius = strokeWidth * (0.4 + 0.45 * breath);
      final dotPaint = Paint()
        ..color = foregroundColor.withValues(alpha: 0.3 + 0.7 * breath);
      // 外发光
      final glowPaint = Paint()
        ..color = foregroundColor.withValues(alpha: 0.15 + 0.2 * breath)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, strokeWidth);
      canvas.drawCircle(dotCenter, dotRadius * 1.8, glowPaint);
      canvas.drawCircle(dotCenter, dotRadius, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _CircularProgressPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.backgroundColor != backgroundColor ||
        oldDelegate.foregroundColor != foregroundColor ||
        oldDelegate.gradient != gradient ||
        oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.strokeCapRound != strokeCapRound ||
        oldDelegate.rotationOffset != rotationOffset ||
        oldDelegate.pulseValue != pulseValue;
  }
}
