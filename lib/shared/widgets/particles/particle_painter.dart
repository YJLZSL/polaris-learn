import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

// ---------------------------------------------------------------------------
// 枚举
// ---------------------------------------------------------------------------

/// 单个粒子的形状类型。
enum ParticleShape {
  /// 矩形彩带（五彩纸屑）
  rect,

  /// 五角星（星光）
  star,

  /// 圆点（烟花火花）
  dot,
}

/// 粒子爆发效果类型。
enum ParticleEffect {
  /// 五彩纸屑：向上扬起的彩色矩形彩带。
  confetti,

  /// 星光闪烁：向四周扩散的五角星。
  sparkles,

  /// 烟花绽放：向上喷射后扩散落下的圆点。
  firework,
}

// ---------------------------------------------------------------------------
// 粒子数据
// ---------------------------------------------------------------------------

/// 单个粒子的数据模型。
///
/// 仅持有运动与外观所需的可变字段，物理更新由 [_ParticleSystemState]
/// 在 Ticker 回调中驱动。
class Particle {
  Particle({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.color,
    required this.shape,
    required this.size,
    required this.rotation,
    required this.rotationSpeed,
    required this.opacity,
    required this.life,
  });

  /// 当前位置 x。
  double x;

  /// 当前位置 y。
  double y;

  /// x 方向速度（像素/帧基准，由 dt 缩放）。
  double vx;

  /// y 方向速度（像素/帧基准，由 dt 缩放）。
  double vy;

  /// 粒子颜色。
  Color color;

  /// 粒子形状。
  ParticleShape shape;

  /// 粒子主尺寸（直径或矩形长边）。
  double size;

  /// 当前旋转角度（弧度）。
  double rotation;

  /// 旋转角速度（弧度/帧基准）。
  double rotationSpeed;

  /// 不透明度 0~1。
  double opacity;

  /// 剩余生命值（毫秒），0 时完全消失。
  double life;

  /// 重力加速度（像素/毫秒² 基准）。
  static const double gravity = 0.15;

  /// 空气阻力系数（每帧速度衰减）。
  static const double drag = 0.98;

  /// 粒子总生命周期（毫秒）。
  static const double totalLife = 2000.0;
}

// ---------------------------------------------------------------------------
// 粒子绘制器
// ---------------------------------------------------------------------------

/// 粒子自定义绘制器。
///
/// 根据当前 [particles] 列表逐粒子绘制，不负责物理更新；
/// 通过传入的 [repaint] Listenable（通常是 AnimationController/ValueNotifier）
/// 触发重绘。
class ParticlePainter extends CustomPainter {
  ParticlePainter({
    required this.particles,
    required Listenable repaint,
  }) : super(repaint: repaint);

  /// 需要绘制的粒子列表。
  final List<Particle> particles;

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      if (p.opacity <= 0.0 || p.life <= 0.0) {
        continue;
      }
      canvas.save();
      canvas.translate(p.x, p.y);
      canvas.rotate(p.rotation);

      final paint = Paint()
        ..color = p.color.withOpacity(p.opacity.clamp(0.0, 1.0))
        ..style = PaintingStyle.fill
        ..isAntiAlias = true;

      switch (p.shape) {
        case ParticleShape.rect:
          _drawRect(canvas, paint, p.size);
          break;
        case ParticleShape.star:
          _drawStar(canvas, paint, p.size);
          break;
        case ParticleShape.dot:
          canvas.drawCircle(Offset.zero, p.size / 2, paint);
          break;
      }
      canvas.restore();
    }
  }

  /// 绘制矩形彩带（细长矩形）。
  void _drawRect(Canvas canvas, Paint paint, double size) {
    final rect = Rect.fromCenter(
      center: Offset.zero,
      width: size,
      height: size * 0.4,
    );
    canvas.drawRect(rect, paint);
  }

  /// 绘制五角星路径。
  void _drawStar(Canvas canvas, Paint paint, double size) {
    final path = Path();
    final outerR = size / 2;
    final innerR = outerR * 0.45;
    const points = 5;
    for (var i = 0; i < points * 2; i++) {
      final r = i.isEven ? outerR : innerR;
      final angle = -math.pi / 2 + i * math.pi / points;
      final x = math.cos(angle) * r;
      final y = math.sin(angle) * r;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant ParticlePainter oldDelegate) => true;
}

// ---------------------------------------------------------------------------
// ParticleSystem 组件
// ---------------------------------------------------------------------------

/// 粒子系统组件。
///
/// 在指定的 [origin] 处一次性生成 [particleCount] 个粒子，受重力
/// 与空气阻力影响，在 2 秒内逐渐淡出。组件创建 [Particle.totalLife] +
/// 200ms 后自动停止动画并触发 [onComplete] 回调（约 2.2 秒）。
///
/// 粒子区域为充满父级的 [CustomPaint]，且 [IgnorePointer] 不会拦截
/// 用户手势。
class ParticleSystem extends StatefulWidget {
  const ParticleSystem({
    super.key,
    required this.origin,
    this.particleCount = 24,
    this.type = ParticleEffect.confetti,
    this.colors,
    this.onComplete,
  });

  /// 粒子发射原点（相对于父级布局的坐标）。
  final Offset origin;

  /// 粒子数量，默认 24，最大 30。
  final int particleCount;

  /// 粒子效果类型。
  final ParticleEffect type;

  /// 自定义粒子颜色列表；为 null 时使用一组默认主色调。
  final List<Color>? colors;

  /// 粒子动画播放完毕（约 2.2s）后的回调。
  final VoidCallback? onComplete;

  @override
  State<ParticleSystem> createState() => _ParticleSystemState();
}

class _ParticleSystemState extends State<ParticleSystem>
    with TickerProviderStateMixin {
  late final Ticker _ticker;
  late final List<Particle> _particles;
  late final math.Random _random;
  final ValueNotifier<double> _repaintNotifier = ValueNotifier<double>(0);

  double _lastElapsedMs = 0;
  bool _completed = false;

  /// 自动停止并回调的总时长（毫秒）。
  static const int _autoDisposeMs = 2200;

  @override
  void initState() {
    super.initState();
    _random = math.Random();
    _particles = <Particle>[];
    _spawnParticles();
    _ticker = createTicker(_onTick);
    _ticker.start();
  }

  // ---------------------------------------------------------------------------
  // 粒子生成
  // ---------------------------------------------------------------------------

  void _spawnParticles() {
    final count = widget.particleCount.clamp(1, 30);
    final colors = widget.colors ?? _defaultColors();
    final shape = _shapeForEffect(widget.type);

    for (var i = 0; i < count; i++) {
      final speed = _initialSpeed(widget.type);
      double vx;
      double vy;

      switch (widget.type) {
        case ParticleEffect.firework:
        case ParticleEffect.confetti:
          // 向上扇形喷射
          final spread = widget.type == ParticleEffect.firework
              ? math.pi * 0.9
              : math.pi * 0.7;
          final baseAngle = -math.pi / 2;
          final angle = baseAngle + (_random.nextDouble() - 0.5) * spread;
          vx = math.cos(angle) * speed;
          vy = math.sin(angle) * speed;
          break;
        case ParticleEffect.sparkles:
          // 全方向均匀扩散
          final angle = _random.nextDouble() * math.pi * 2;
          vx = math.cos(angle) * speed;
          vy = math.sin(angle) * speed;
          break;
      }

      _particles.add(
        Particle(
          x: widget.origin.dx,
          y: widget.origin.dy,
          vx: vx,
          vy: vy,
          color: colors[_random.nextInt(colors.length)],
          shape: shape,
          size: _randomSize(shape),
          rotation: _random.nextDouble() * math.pi * 2,
          rotationSpeed: (_random.nextDouble() - 0.5) * 0.25,
          opacity: 1.0,
          life: Particle.totalLife,
        ),
      );
    }
  }

  /// 不同效果的初始速度范围。
  double _initialSpeed(ParticleEffect type) {
    switch (type) {
      case ParticleEffect.firework:
        return 3.5 + _random.nextDouble() * 3.5;
      case ParticleEffect.confetti:
        return 2.5 + _random.nextDouble() * 3.0;
      case ParticleEffect.sparkles:
        return 1.5 + _random.nextDouble() * 2.5;
    }
  }

  /// 不同形状的尺寸范围。
  double _randomSize(ParticleShape shape) {
    switch (shape) {
      case ParticleShape.rect:
        return 7.0 + _random.nextDouble() * 7.0;
      case ParticleShape.star:
        return 7.0 + _random.nextDouble() * 7.0;
      case ParticleShape.dot:
        return 3.0 + _random.nextDouble() * 4.0;
    }
  }

  /// 效果类型到粒子形状的映射。
  ParticleShape _shapeForEffect(ParticleEffect type) {
    switch (type) {
      case ParticleEffect.confetti:
        return ParticleShape.rect;
      case ParticleEffect.sparkles:
        return ParticleShape.star;
      case ParticleEffect.firework:
        return ParticleShape.dot;
    }
  }

  /// 默认主色调集合。
  List<Color> _defaultColors() {
    return const <Color>[
      Color(0xFFFF5252), // 红
      Color(0xFFFFD740), // 黄
      Color(0xFF69F0AE), // 绿
      Color(0xFF40C4FF), // 蓝
      Color(0xFFE040FB), // 紫
      Color(0xFFFFAB40), // 橙
      Color(0xFFFF80AB), // 粉
    ];
  }

  // ---------------------------------------------------------------------------
  // 物理更新
  // ---------------------------------------------------------------------------

  void _onTick(Duration elapsed) {
    final currentMs = elapsed.inMicroseconds / 1000.0;
    final dt = _lastElapsedMs == 0 ? 0.0 : currentMs - _lastElapsedMs;
    _lastElapsedMs = currentMs;

    if (dt > 0 && dt < 100) {
      // 以 60fps（约 16ms/帧）为基准缩放物理量，使速度与帧率无关
      final scale = dt / 16.0;
      for (final p in _particles) {
        p.vy += Particle.gravity * scale;
        final dragFactor = math.pow(Particle.drag, scale).toDouble();
        p.vx *= dragFactor;
        p.vy *= dragFactor;
        p.x += p.vx * scale;
        p.y += p.vy * scale;
        p.rotation += p.rotationSpeed * scale;
        p.life -= dt;
        if (p.life < 0) {
          p.life = 0;
        }
        p.opacity = (p.life / Particle.totalLife).clamp(0.0, 1.0);
      }
    }

    _repaintNotifier.value = currentMs;

    if (currentMs >= _autoDisposeMs && !_completed) {
      _completed = true;
      _ticker.stop();
      widget.onComplete?.call();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    _repaintNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        painter: ParticlePainter(
          particles: _particles,
          repaint: _repaintNotifier,
        ),
        size: Size.infinite,
      ),
    );
  }
}
