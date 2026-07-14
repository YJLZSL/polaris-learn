import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart' as physics;
import 'package:flutter/scheduler.dart';

/// 弹簧物理动效工具类
///
/// Material 3 Expressive 强调富有弹性的物理动效。本类提供多种速度的
/// 弹簧描述、曲线与时长，以及开箱即用的过渡动画封装。
///
/// 所有过渡组件均自动检测系统 "减少动画" 设置并降级为简单淡入。
class SpringMotion {
  const SpringMotion._();

  // ── 弹簧规格 ──────────────────────────────────────────────

  /// 微动弹簧：按钮按压、图标切换（100ms）
  static const physics.SpringDescription microSpeed =
      physics.SpringDescription(mass: 1, stiffness: 300, damping: 22);

  /// 快速弹簧：小元素、Chip 选中（150ms）
  static const physics.SpringDescription fastSpeed =
      physics.SpringDescription(mass: 1, stiffness: 200, damping: 20);

  /// 默认（中等）弹簧：常规过渡（300ms）
  static const physics.SpringDescription defaultSpeed =
      physics.SpringDescription(mass: 1, stiffness: 100, damping: 15);

  /// 柔和弹簧：卡片悬浮、页面元素入场（350ms）
  static const physics.SpringDescription gentleSpeed =
      physics.SpringDescription(mass: 1, stiffness: 80, damping: 14);

  /// 慢速弹簧：大元素 / 页面切换（500ms）
  static const physics.SpringDescription slowSpeed =
      physics.SpringDescription(mass: 1, stiffness: 50, damping: 12);

  /// 弹性弹簧：庆祝、成就解锁的回弹效果（600ms，低阻尼）
  static const physics.SpringDescription bouncySpeed =
      physics.SpringDescription(mass: 1, stiffness: 150, damping: 10);

  // ── 曲线集 ────────────────────────────────────────────────

  /// 默认曲线（easeOutCubic）
  static const Curve defaultCurve = Curves.easeOutCubic;

  /// 快速曲线
  static const Curve fastCurve = Curves.easeOut;

  /// 慢速曲线（M3 强调减速）
  static const Curve slowCurve = Curves.easeInOutCubicEmphasized;

  /// 入场曲线：快速起步，缓慢到达
  static const Curve entranceCurve = Curves.easeOutCubic;

  /// 退场曲线：缓慢起步，快速离开
  static const Curve exitCurve = Curves.easeInCubic;

  /// 大元素强调减速曲线
  static const Curve emphasizedDecelerate = Curves.easeOutCubicEmphasized;

  /// 弹性曲线（用于 bouncy 回弹效果）
  static const Curve bouncyCurve = _BouncyCurve();

  // ── 时长常量 ──────────────────────────────────────────────

  /// 微动时长
  static const Duration microDuration = Duration(milliseconds: 100);

  /// 快速时长
  static const Duration fastDuration = Duration(milliseconds: 150);

  /// 默认时长
  static const Duration defaultDuration = Duration(milliseconds: 300);

  /// 柔和时长
  static const Duration gentleDuration = Duration(milliseconds: 350);

  /// 慢速时长
  static const Duration slowDuration = Duration(milliseconds: 500);

  /// 弹性时长
  static const Duration bouncyDuration = Duration(milliseconds: 600);

  // ── 工具方法 ──────────────────────────────────────────────

  /// 检测当前是否启用了 "减少动画" 无障碍设置
  static bool reduceMotionOf(BuildContext context) {
    return MediaQuery.of(context).disableAnimations;
  }

  // ── 过渡组件 ──────────────────────────────────────────────

  /// 弹簧过渡动画：淡入 + 缩放 + 位移
  ///
  /// 子部件挂载时弹性出现，适用于卡片、徽章等入场过渡。
  /// 自动检测 reduceMotion 并降级为简单淡入。
  static Widget springTransition(
    Widget child, {
    Curve curve = defaultCurve,
    Duration duration = defaultDuration,
    double beginScale = 0.92,
    Offset beginOffset = Offset.zero,
    bool? forceReduceMotion,
  }) {
    return _SpringTransition(
      curve: curve,
      duration: duration,
      beginScale: beginScale,
      beginOffset: beginOffset,
      forceReduceMotion: forceReduceMotion,
      child: child,
    );
  }

  /// 方向滑入 + 淡入过渡
  static Widget slideFadeTransition(
    Widget child, {
    AxisDirection direction = AxisDirection.up,
    Curve curve = entranceCurve,
    Duration duration = defaultDuration,
    double distance = 24,
    bool? forceReduceMotion,
  }) {
    final offset = switch (direction) {
      AxisDirection.up => Offset(0, distance),
      AxisDirection.down => Offset(0, -distance),
      AxisDirection.left => Offset(distance, 0),
      AxisDirection.right => Offset(-distance, 0),
    };
    return _SpringTransition(
      curve: curve,
      duration: duration,
      beginScale: 1.0,
      beginOffset: offset,
      forceReduceMotion: forceReduceMotion,
      child: child,
    );
  }

  /// 呼吸脉动动画（scale 在 0.97~1.03 间循环）
  ///
  /// 用于 CTA 按钮、进行中指示器等需要轻柔引导注意力的元素。
  /// reduceMotion 下直接返回 child（不循环）。
  static Widget pulseBreathing(
    Widget child, {
    double minScale = 0.97,
    double maxScale = 1.03,
    Duration period = const Duration(seconds: 3),
    bool? forceReduceMotion,
  }) {
    return _PulseBreathing(
      minScale: minScale,
      maxScale: maxScale,
      period: period,
      forceReduceMotion: forceReduceMotion,
      child: child,
    );
  }

  /// 按下缩放反馈：按下时 scale 缩小，松开弹性回弹
  ///
  /// 包裹任意可点击组件，提供物理按压反馈。
  static Widget scalePressFeedback(
    Widget child, {
    VoidCallback? onTap,
    double pressedScale = 0.96,
    Duration duration = fastDuration,
    Curve curve = fastCurve,
    bool enableHaptic = true,
  }) {
    return _ScalePressFeedback(
      onTap: onTap,
      pressedScale: pressedScale,
      duration: duration,
      curve: curve,
      enableHaptic: enableHaptic,
      child: child,
    );
  }

  /// 桌面端 hover 悬浮效果：鼠标悬停时轻微放大 + 阴影提升
  ///
  /// 仅在桌面端（有鼠标）生效，移动端无效果。
  static Widget hoverLift(
    Widget child, {
    double hoverScale = 1.015,
    Duration duration = fastDuration,
    Curve curve = fastCurve,
  }) {
    return _HoverLift(
      hoverScale: hoverScale,
      duration: duration,
      curve: curve,
      child: child,
    );
  }

  /// 流光扫过效果（shimmer glow）
  ///
  /// 为子组件添加周期性的高光扫过动画，用于 streak 火焰徽章、
  /// 活跃状态指示等需要持续微光提示的元素。
  static Widget shimmerGlow(
    Widget child, {
    Color? glowColor,
    Duration period = const Duration(seconds: 2),
    bool? forceReduceMotion,
  }) {
    return _ShimmerGlow(
      glowColor: glowColor,
      period: period,
      forceReduceMotion: forceReduceMotion,
      child: child,
    );
  }

  /// 光环扩散效果（sparkle ring）
  ///
  /// 显示一个从中心向外扩散并淡出的光环，用于成就解锁、
  /// 正确答案反馈等瞬时庆祝场景。
  static Widget sparkleRing({
    Color color = const Color(0xFFFFD700),
    double size = 48,
    Duration duration = const Duration(milliseconds: 800),
    bool autoStart = true,
  }) {
    return _SparkleRing(
      color: color,
      size: size,
      duration: duration,
      autoStart: autoStart,
    );
  }
}

// ── 内部曲线实现 ────────────────────────────────────────────

/// 自定义弹性曲线，模拟弹簧过冲回弹
class _BouncyCurve extends Curve {
  const _BouncyCurve();

  @override
  double transformInternal(double t) {
    // 快速到达 1.1 后回弹到 1.0
    if (t < 0.5) {
      final ct = t * 2;
      return Curves.easeOutBack.transform(ct) * 0.5 + 0.5;
    } else {
      final ct = (t - 0.5) * 2;
      return 1.0 + math.sin(ct * math.pi) * 0.05 * (1 - ct);
    }
  }
}

// ── 过渡组件实现 ────────────────────────────────────────────

/// 弹簧过渡动画的内部实现
class _SpringTransition extends StatefulWidget {
  const _SpringTransition({
    required this.child,
    required this.curve,
    required this.duration,
    required this.beginScale,
    required this.beginOffset,
    this.forceReduceMotion,
  });

  final Widget child;
  final Curve curve;
  final Duration duration;
  final double beginScale;
  final Offset beginOffset;
  final bool? forceReduceMotion;

  @override
  State<_SpringTransition> createState() => _SpringTransitionState();
}

class _SpringTransitionState extends State<_SpringTransition>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<Offset> _offset;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    final curved = CurvedAnimation(parent: _controller, curve: widget.curve);
    _scale = Tween<double>(begin: widget.beginScale, end: 1.0).animate(curved);
    _offset =
        Tween<Offset>(begin: widget.beginOffset, end: Offset.zero).animate(curved);
    _opacity = Tween<double>(begin: 0.0, end: 1.0).animate(curved);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _reduceMotion =>
      widget.forceReduceMotion ??
      (SchedulerBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations);

  @override
  Widget build(BuildContext context) {
    if (_reduceMotion) {
      return widget.child;
    }
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _opacity.value,
          child: Transform.translate(
            offset: _offset.value,
            child: Transform.scale(
              scale: _scale.value,
              child: child,
            ),
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// 呼吸脉动动画
class _PulseBreathing extends StatefulWidget {
  const _PulseBreathing({
    required this.child,
    required this.minScale,
    required this.maxScale,
    required this.period,
    this.forceReduceMotion,
  });

  final Widget child;
  final double minScale;
  final double maxScale;
  final Duration period;
  final bool? forceReduceMotion;

  @override
  State<_PulseBreathing> createState() => _PulseBreathingState();
}

class _PulseBreathingState extends State<_PulseBreathing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.period,
    );
    _scale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 1.0, end: widget.maxScale)
            .chain(CurveTween(curve: Curves.easeInOutSine)),
        weight: 25,
      ),
      TweenSequenceItem(
        tween: Tween(begin: widget.maxScale, end: widget.minScale)
            .chain(CurveTween(curve: Curves.easeInOutSine)),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: Tween(begin: widget.minScale, end: 1.0)
            .chain(CurveTween(curve: Curves.easeInOutSine)),
        weight: 25,
      ),
    ]).animate(_controller);
    _controller.repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _reduceMotion =>
      widget.forceReduceMotion ??
      SchedulerBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations;

  @override
  Widget build(BuildContext context) {
    if (_reduceMotion) {
      return widget.child;
    }
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Transform.scale(
        scale: _scale.value,
        child: child,
      ),
      child: widget.child,
    );
  }
}

/// 按下缩放反馈
class _ScalePressFeedback extends StatefulWidget {
  const _ScalePressFeedback({
    required this.child,
    required this.onTap,
    required this.pressedScale,
    required this.duration,
    required this.curve,
    required this.enableHaptic,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double pressedScale;
  final Duration duration;
  final Curve curve;
  final bool enableHaptic;

  @override
  State<_ScalePressFeedback> createState() => _ScalePressFeedbackState();
}

class _ScalePressFeedbackState extends State<_ScalePressFeedback> {
  bool _pressed = false;

  void _handleTapDown(TapDownDetails _) {
    setState(() => _pressed = true);
  }

  void _handleTapUp(TapUpDetails _) {
    setState(() => _pressed = false);
  }

  void _handleTapCancel() {
    setState(() => _pressed = false);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      onTap: () {
        if (widget.enableHaptic) {
          HapticFeedback.selectionClick();
        }
        widget.onTap?.call();
      },
      behavior: HitTestBehavior.opaque,
      child: AnimatedScale(
        scale: _pressed ? widget.pressedScale : 1.0,
        duration: widget.duration,
        curve: widget.curve,
        child: widget.child,
      ),
    );
  }
}

/// 桌面端 Hover 悬浮效果
class _HoverLift extends StatefulWidget {
  const _HoverLift({
    required this.child,
    required this.hoverScale,
    required this.duration,
    required this.curve,
  });

  final Widget child;
  final double hoverScale;
  final Duration duration;
  final Curve curve;

  @override
  State<_HoverLift> createState() => _HoverLiftState();
}

class _HoverLiftState extends State<_HoverLift> {
  bool _hovering = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovering = true),
      onExit: (_) => setState(() => _hovering = false),
      cursor: SystemMouseCursors.click,
      child: AnimatedScale(
        scale: _hovering ? widget.hoverScale : 1.0,
        duration: widget.duration,
        curve: widget.curve,
        child: widget.child,
      ),
    );
  }
}

/// 流光扫过效果
class _ShimmerGlow extends StatefulWidget {
  const _ShimmerGlow({
    required this.child,
    required this.period,
    this.glowColor,
    this.forceReduceMotion,
  });

  final Widget child;
  final Color? glowColor;
  final Duration period;
  final bool? forceReduceMotion;

  @override
  State<_ShimmerGlow> createState() => _ShimmerGlowState();
}

class _ShimmerGlowState extends State<_ShimmerGlow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _position;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.period);
    _position = Tween<double>(begin: -1.0, end: 2.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.linear),
    );
    _controller.repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _reduceMotion =>
      widget.forceReduceMotion ??
      SchedulerBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations;

  @override
  Widget build(BuildContext context) {
    if (_reduceMotion) {
      return widget.child;
    }
    final theme = Theme.of(context);
    final glowColor = widget.glowColor ?? theme.colorScheme.primary;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.transparent,
                glowColor.withValues(alpha: 0.0),
                glowColor.withValues(alpha: 0.3),
                glowColor.withValues(alpha: 0.0),
                Colors.transparent,
              ],
              stops: const [0.0, 0.35, 0.5, 0.65, 1.0],
              transform: _SlidingGradientTransform(_position.value),
            ).createShader(bounds);
          },
          blendMode: BlendMode.srcATop,
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// 流光 GradientTransform
class _SlidingGradientTransform extends GradientTransform {
  const _SlidingGradientTransform(this.slidePercent);

  final double slidePercent;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * slidePercent, 0, 0);
  }
}

/// 光环扩散效果
class _SparkleRing extends StatefulWidget {
  const _SparkleRing({
    required this.color,
    required this.size,
    required this.duration,
    required this.autoStart,
  });

  final Color color;
  final double size;
  final Duration duration;
  final bool autoStart;

  @override
  State<_SparkleRing> createState() => _SparkleRingState();
}

class _SparkleRingState extends State<_SparkleRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _scale = Tween<double>(begin: 0.5, end: 2.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
    _opacity = Tween<double>(begin: 0.8, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
    if (widget.autoStart) {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion =
        SchedulerBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations;
    if (reduceMotion) {
      return const SizedBox.shrink();
    }
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return SizedBox(
          width: widget.size,
          height: widget.size,
          child: CustomPaint(
            painter: _RingPainter(
              color: widget.color,
              scale: _scale.value,
              opacity: _opacity.value,
            ),
          ),
        );
      },
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.color,
    required this.scale,
    required this.opacity,
  });

  final Color color;
  final double scale;
  final double opacity;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) * scale;
    final paint = Paint()
      ..color = color.withValues(alpha: opacity)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0
      ..isAntiAlias = true;
    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      scale != oldDelegate.scale || opacity != oldDelegate.opacity;
}
