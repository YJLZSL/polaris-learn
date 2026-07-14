import 'dart:math' as math;
import 'package:flutter/material.dart';

import 'particles/particle_painter.dart';

// ---------------------------------------------------------------------------
// 庆祝类型
// ---------------------------------------------------------------------------

/// 庆祝动画类型。
enum CelebrationType {
  /// 五彩纸屑（适合完成任务、通关等）
  confetti,

  /// 星光闪烁（适合轻量正向反馈）
  sparkles,

  /// 烟花绽放（适合重要成就）
  firework,
}

/// 将 [CelebrationType] 映射到粒子系统的 [ParticleEffect]。
ParticleEffect _effectFor(CelebrationType type) {
  switch (type) {
    case CelebrationType.confetti:
      return ParticleEffect.confetti;
    case CelebrationType.sparkles:
      return ParticleEffect.sparkles;
    case CelebrationType.firework:
      return ParticleEffect.firework;
  }
}

// ---------------------------------------------------------------------------
// CelebrationOverlay
// ---------------------------------------------------------------------------

/// 庆祝覆盖层组件。
///
/// 将 [child] 包裹在一个 [Stack] 中，当 [active] 变为 `true` 时
/// 在 [origin]（若为 null 则取子组件中心）处触发一次粒子爆发。
/// 同一时间可叠加多次爆发（每次独立生命周期，约 2.2s 后自动移除）。
///
/// 对于命令式调用场景，提供 [CelebrationOverlay.show] 静态方法，
/// 通过 [OverlayEntry] 在当前 [Overlay] 上短暂展示粒子爆发。
///
/// 无障碍：当 [MediaQueryData.disableAnimations] 为 true 时不会触发粒子。
class CelebrationOverlay extends StatefulWidget {
  const CelebrationOverlay({
    super.key,
    required this.child,
    this.active = false,
    this.type = CelebrationType.confetti,
    this.origin,
    this.colors,
    this.particleCount = 24,
  });

  /// 被包裹的子组件。
  final Widget child;

  /// 是否触发一次庆祝动画。每当该值由 `false` 变为 `true`，
  /// 会在 [origin] 处生成一次新的粒子爆发。
  final bool active;

  /// 庆祝类型。
  final CelebrationType type;

  /// 粒子发射原点；为 null 时默认取子组件中心。
  final Offset? origin;

  /// 自定义粒子颜色。
  final List<Color>? colors;

  /// 粒子数量，默认 24，最大 30。
  final int particleCount;

  /// 通过 [OverlayEntry] 命令式展示一次粒子爆发。
  ///
  /// [context] 用于查找 [Overlay]；[origin] 为爆发位置（全局坐标）。
  /// 粒子动画结束后自动移除 OverlayEntry。
  static void show(
    BuildContext context, {
    required Offset origin,
    CelebrationType type = CelebrationType.confetti,
    List<Color>? colors,
    int particleCount = 24,
  }) {
    final overlay = Overlay.of(context, rootOverlay: true);
    late final OverlayEntry entry;
    final mq = MediaQuery.of(context);

    // 尊重系统"减少动态效果"设置：直接返回不展示。
    if (mq.disableAnimations) {
      return;
    }

    entry = OverlayEntry(
      builder: (ctx) {
        return _OverlayParticleBurst(
          origin: origin,
          type: type,
          colors: colors,
          particleCount: particleCount,
          onComplete: () {
            entry.remove();
          },
        );
      },
    );
    overlay.insert(entry);
  }

  @override
  State<CelebrationOverlay> createState() => _CelebrationOverlayState();
}

class _CelebrationOverlayState extends State<CelebrationOverlay> {
  final List<_BurstEntry> _bursts = <_BurstEntry>[];
  int _idCounter = 0;
  bool? _lastActive;
  final GlobalKey _childKey = GlobalKey();

  @override
  void didUpdateWidget(covariant CelebrationOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && (_lastActive == null || _lastActive == false)) {
      _triggerBurst();
    }
    _lastActive = widget.active;
  }

  void _triggerBurst() {
    final reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (reduceMotion) {
      return;
    }

    final id = ++_idCounter;
    final customOrigin = widget.origin;

    if (customOrigin != null) {
      setState(() {
        _bursts.add(_BurstEntry(id: id, origin: customOrigin));
      });
      return;
    }

    // 未指定原点时，在布局完成后取 Stack 中心作为爆发位置
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      final box = _childKey.currentContext?.findRenderObject() as RenderBox?;
      final Offset origin;
      if (box != null && box.hasSize) {
        origin = Offset(box.size.width / 2, box.size.height / 2);
      } else {
        origin = Offset.zero;
      }
      setState(() {
        _bursts.add(_BurstEntry(id: id, origin: origin));
      });
    });
  }

  void _onBurstComplete(int id) {
    if (!mounted) {
      return;
    }
    setState(() {
      _bursts.removeWhere((b) => b.id == id);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      key: _childKey,
      children: [
        widget.child,
        ..._bursts.map(
          (b) => Positioned.fill(
            child: ParticleSystem(
              origin: b.origin,
              particleCount: widget.particleCount,
              type: _effectFor(widget.type),
              colors: widget.colors,
              onComplete: () => _onBurstComplete(b.id),
            ),
          ),
        ),
      ],
    );
  }
}

class _BurstEntry {
  _BurstEntry({required this.id, required this.origin});
  final int id;
  final Offset origin;
}

/// OverlayEntry 中使用的一次性粒子爆发组件。
class _OverlayParticleBurst extends StatelessWidget {
  const _OverlayParticleBurst({
    required this.origin,
    required this.type,
    required this.colors,
    required this.particleCount,
    required this.onComplete,
  });

  final Offset origin;
  final CelebrationType type;
  final List<Color>? colors;
  final int particleCount;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Material(
        type: MaterialType.transparency,
        child: ParticleSystem(
          origin: origin,
          particleCount: particleCount,
          type: _effectFor(type),
          colors: colors,
          onComplete: onComplete,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// SuccessCheckmark
// ---------------------------------------------------------------------------

/// 成功勾选动画组件。
///
/// 绿色圆形从中心弹性放大（0 → 1），随后勾号路径按进度绘制（起点到终点），
/// 动画总时长 500ms，使用 [Curves.easeOutCubic]。
/// 当系统开启"减少动态效果"时直接显示最终状态。
class SuccessCheckmark extends StatefulWidget {
  const SuccessCheckmark({
    super.key,
    this.size = 64.0,
    this.color,
    this.strokeWidth,
    this.onComplete,
  });

  /// 勾选图标整体尺寸（宽高相等）。
  final double size;

  /// 勾号与圆圈颜色；为 null 时使用 [ColorScheme.primary]。
  final Color? color;

  /// 线条宽度；为 null 时根据 [size] 自动计算。
  final double? strokeWidth;

  /// 动画播放完毕回调。
  final VoidCallback? onComplete;

  @override
  State<SuccessCheckmark> createState() => _SuccessCheckmarkState();
}

class _SuccessCheckmarkState extends State<SuccessCheckmark>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _circleScale;
  late final Animation<double> _checkProgress;
  bool _reduceMotion = false;
  bool _started = false;

  static const Duration _duration = Duration(milliseconds: 500);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion = MediaQuery.of(context).disableAnimations;
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: _duration);

    _circleScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.55, curve: Curves.easeOutCubic),
      ),
    );
    _checkProgress = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.55, 1.0, curve: Curves.easeOutCubic),
      ),
    );

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        widget.onComplete?.call();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _start() {
    if (_started) {
      return;
    }
    _started = true;
    if (_reduceMotion) {
      _controller.value = 1.0;
      widget.onComplete?.call();
    } else {
      _controller.forward(from: 0.0);
    }
  }

  @override
  Widget build(BuildContext context) {
    // 首帧启动动画（在 build 中读取 _reduceMotion 之后）
    if (!_started) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _start();
        }
      });
    }

    final color = widget.color ?? Theme.of(context).colorScheme.primary;
    final strokeWidth = widget.strokeWidth ?? widget.size * 0.08;

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return CustomPaint(
            painter: _CheckmarkPainter(
              color: color,
              strokeWidth: strokeWidth,
              circleScale: _circleScale.value,
              checkProgress: _checkProgress.value,
            ),
          );
        },
      ),
    );
  }
}

/// 勾号与圆圈绘制器。
class _CheckmarkPainter extends CustomPainter {
  _CheckmarkPainter({
    required this.color,
    required this.strokeWidth,
    required this.circleScale,
    required this.checkProgress,
  });

  final Color color;
  final double strokeWidth;
  final double circleScale;
  final double checkProgress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (math.min(size.width, size.height) - strokeWidth) / 2;

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..isAntiAlias = true;

    // 圆圈
    if (circleScale > 0) {
      canvas.drawCircle(center, radius * circleScale, paint);
    }

    // 勾号路径
    if (checkProgress <= 0) {
      return;
    }

    final checkPath = Path();
    // 勾号三个关键点：左下拐点 -> 中间最低点 -> 右上顶点
    final p1 = Offset(size.width * 0.28, size.height * 0.52);
    final p2 = Offset(size.width * 0.44, size.height * 0.68);
    final p3 = Offset(size.width * 0.74, size.height * 0.36);
    checkPath.moveTo(p1.dx, p1.dy);
    checkPath.lineTo(p2.dx, p2.dy);
    checkPath.lineTo(p3.dx, p3.dy);

    final metrics = checkPath.computeMetrics().toList();
    if (metrics.isEmpty) {
      return;
    }
    final totalLength = metrics.fold<double>(0, (sum, m) => sum + m.length);
    final drawLength = totalLength * checkProgress.clamp(0.0, 1.0);

    final drawn = Path();
    var remaining = drawLength;
    for (final m in metrics) {
      if (remaining <= 0) {
        break;
      }
      final segLen = math.min(remaining, m.length);
      drawn.addPath(m.extractPath(0, segLen), Offset.zero);
      remaining -= segLen;
    }
    canvas.drawPath(drawn, paint);
  }

  @override
  bool shouldRepaint(covariant _CheckmarkPainter oldDelegate) {
    return oldDelegate.circleScale != circleScale ||
        oldDelegate.checkProgress != checkProgress ||
        oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}

// ---------------------------------------------------------------------------
// ErrorCross
// ---------------------------------------------------------------------------

/// 错误叉号动画组件。
///
/// 红色 X 符号出现后伴随水平左右抖动（[TweenSequence]），动画总时长 400ms。
/// 当系统开启"减少动态效果"时直接显示静态 X，不播放抖动。
class ErrorCross extends StatefulWidget {
  const ErrorCross({
    super.key,
    this.size = 64.0,
    this.color,
    this.strokeWidth,
    this.onComplete,
  });

  /// 叉号整体尺寸。
  final double size;

  /// 叉号颜色；为 null 时使用 [ColorScheme.error]。
  final Color? color;

  /// 线条宽度；为 null 时根据 [size] 自动计算。
  final double? strokeWidth;

  /// 动画播放完毕回调。
  final VoidCallback? onComplete;

  @override
  State<ErrorCross> createState() => _ErrorCrossState();
}

class _ErrorCrossState extends State<ErrorCross>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _shake;
  bool _reduceMotion = false;
  bool _started = false;

  static const Duration _duration = Duration(milliseconds: 400);

  /// 水平抖动序列（左右来回衰减）。
  static final Animatable<double> _shakeTween = TweenSequence<double>([
    TweenSequenceItem(
      tween: Tween<double>(begin: 0, end: -8).chain(CurveTween(curve: Curves.easeOut)),
      weight: 1,
    ),
    TweenSequenceItem(
      tween: Tween<double>(begin: -8, end: 9).chain(CurveTween(curve: Curves.easeInOut)),
      weight: 1,
    ),
    TweenSequenceItem(
      tween: Tween<double>(begin: 9, end: -6).chain(CurveTween(curve: Curves.easeInOut)),
      weight: 1,
    ),
    TweenSequenceItem(
      tween: Tween<double>(begin: -6, end: 6).chain(CurveTween(curve: Curves.easeInOut)),
      weight: 1,
    ),
    TweenSequenceItem(
      tween: Tween<double>(begin: 6, end: -3).chain(CurveTween(curve: Curves.easeInOut)),
      weight: 1,
    ),
    TweenSequenceItem(
      tween: Tween<double>(begin: -3, end: 0).chain(CurveTween(curve: Curves.easeOut)),
      weight: 1,
    ),
  ]);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion = MediaQuery.of(context).disableAnimations;
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: _duration);
    _shake = _controller.drive(_shakeTween);

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        widget.onComplete?.call();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _start() {
    if (_started) {
      return;
    }
    _started = true;
    if (_reduceMotion) {
      _controller.value = 1.0;
      widget.onComplete?.call();
    } else {
      _controller.forward(from: 0.0);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_started) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _start();
        }
      });
    }

    final color = widget.color ?? Theme.of(context).colorScheme.error;
    final strokeWidth = widget.strokeWidth ?? widget.size * 0.09;

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.translate(
            offset: Offset(_shake.value, 0),
            child: child,
          );
        },
        child: CustomPaint(
          painter: _CrossPainter(
            color: color,
            strokeWidth: strokeWidth,
          ),
        ),
      ),
    );
  }
}

/// 叉号绘制器。
class _CrossPainter extends CustomPainter {
  _CrossPainter({
    required this.color,
    required this.strokeWidth,
  });

  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..isAntiAlias = true;

    final inset = size.width * 0.22;
    final p1 = Offset(inset, inset);
    final p2 = Offset(size.width - inset, size.height - inset);
    final p3 = Offset(size.width - inset, inset);
    final p4 = Offset(inset, size.height - inset);

    canvas.drawLine(p1, p2, paint);
    canvas.drawLine(p3, p4, paint);
  }

  @override
  bool shouldRepaint(covariant _CrossPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.strokeWidth != strokeWidth;
  }
}
