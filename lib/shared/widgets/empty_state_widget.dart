import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/motion/animation_utils.dart';
import '../../core/motion/spring_motion.dart';
import '../../core/theme/lingxi_gradients.dart';
import '../../features/mascot/mascot_controller.dart';
import '../../features/mascot/mascot_state.dart';
import '../../features/mascot/mascot_widget.dart';
import 'lingxi_button.dart';

/// 通用空状态组件。
///
/// 垂直居中展示吉祥物（指定情绪）+ 标题 + 描述 + 可选 CTA 按钮，
/// 以弹簧动画入场。吉祥物后方有圆形渐变光晕呼吸效果，CTA 按钮带呼吸脉动。
class EmptyStateWidget extends ConsumerStatefulWidget {
  const EmptyStateWidget({
    super.key,
    required this.mascotMood,
    required this.title,
    required this.description,
    this.ctaText,
    this.onCta,
    this.illustration,
    this.mascotSize = 150,
    this.showDecorations = true,
  });

  /// 吉祥物情绪
  final MascotMood mascotMood;

  /// 标题
  final String title;

  /// 描述文案
  final String description;

  /// CTA 按钮文字，为 null 时不显示按钮
  final String? ctaText;

  /// CTA 点击回调
  final VoidCallback? onCta;

  /// 自定义插图，优先于吉祥物展示
  final Widget? illustration;

  /// 吉祥物尺寸（正方形边长），范围 120-180
  final double mascotSize;

  /// 是否显示装饰星星和光晕
  final bool showDecorations;

  @override
  ConsumerState<EmptyStateWidget> createState() => _EmptyStateWidgetState();
}

class _EmptyStateWidgetState extends ConsumerState<EmptyStateWidget> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final mascotSize = widget.mascotSize.clamp(120.0, 180.0);

    return GestureDetector(
      onTap: () => ref.read(mascotControllerProvider.notifier).triggerTap(),
      behavior: HitTestBehavior.opaque,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: SpringMotion.springTransition(
            beginScale: 0.9,
            beginOffset: const Offset(0, 0.05),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 吉祥物/插图 + 光晕 + 星星
                SizedBox(
                  width: mascotSize + 40,
                  height: mascotSize + 40,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // 光晕背景
                      if (widget.showDecorations)
                        SpringMotion.pulseBreathing(
                          minScale: 0.9,
                          maxScale: 1.1,
                          period: const Duration(seconds: 4),
                          child: Container(
                            width: mascotSize + 30,
                            height: mascotSize + 30,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: RadialGradient(
                                colors: [
                                  colorScheme.primaryContainer.withValues(alpha: 0.5),
                                  colorScheme.primaryContainer.withValues(alpha: 0.0),
                                ],
                              ),
                            ),
                          ),
                        ),
                      // 装饰粒子场（多粒子动画，使用 LingxiGradients.celebration 渐变色）
                      if (widget.showDecorations)
                        _ParticleField(mascotSize: mascotSize),
                      // 插图或吉祥物
                      widget.illustration ??
                          MascotWidget(
                            size: mascotSize,
                            mood: widget.mascotMood,
                          ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  widget.title,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  widget.description,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (widget.ctaText != null && widget.onCta != null) ...[
                  const SizedBox(height: 24),
                  LingxiButton(
                    label: Text(widget.ctaText!),
                    icon: const Icon(Icons.arrow_forward),
                    onPressed: widget.onCta,
                    pulse: true,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

}

// ── 多粒子动画系统 ────────────────────────────────────────────
//
// 替代 v0.2.0 的 `_TwinklingStar` 静态闪烁星星，升级为 Lottie 风格的多粒子
// 动画场。7 个粒子分布在吉祥物周围，使用三种轨迹（圆形 / 螺旋 / 抛物线）
// 与不同延迟、周期，配合 `LingxiGradients.celebration` 渐变色（紫 → 粉 → 橙）
// 营造庆祝氛围。
//
// 设计要点：
// - **两层 RepaintBoundary 隔离**：外层隔离整个粒子场与页面其他元素，
//   内层（每个 `_Particle`）隔离各粒子彼此，避免单个粒子动画触发整场重绘。
// - **reduceMotion 降级**：当 `MediaQuery.disableAnimations` 为 true 时，
//   粒子以固定位置 + 60% opacity 静态渲染，不创建 AnimationController。
// - **轨迹数学**：
//   - `circular`：粒子在初始位置周围做圆周运动。
//   - `spiral`：半径在 0 → orbitRadius → 0 间振荡，角度旋转 2 圈，形成螺旋。
//   - `parabolic`：水平正弦摆动 + 垂直抛物线（喷泉轨迹 0 → 峰值 → 0）。

/// 粒子轨迹类型
enum _ParticleTrajectory {
  /// 圆形：粒子围绕初始位置做匀速圆周运动
  circular,

  /// 螺旋：半径振荡 + 双圈旋转，形成螺旋扩散效果
  spiral,

  /// 抛物线：水平正弦 + 垂直抛物线，模拟喷泉粒子
  parabolic,
}

/// 单个粒子的不可变规格
class _ParticleSpec {
  const _ParticleSpec({
    required this.size,
    required this.initialOffsetFromCenter,
    required this.trajectory,
    required this.period,
    required this.delayFraction,
    required this.orbitRadius,
  });

  /// 粒子尺寸（正方形边长）
  final double size;

  /// 初始位置相对于粒子场中心的偏移
  final Offset initialOffsetFromCenter;

  /// 轨迹类型
  final _ParticleTrajectory trajectory;

  /// 动画周期
  final Duration period;

  /// 延迟 fraction（0.0-1.0），粒子在周期开始后延迟此比例时间才出现
  final double delayFraction;

  /// 轨迹半径（circular / spiral / parabolic 共用）
  final double orbitRadius;
}

/// 粒子场：管理所有粒子的布局与生命周期
///
/// 通过 [context.lingxiGradients] 读取 `celebration` 渐变色并传递给所有粒子。
/// 整个粒子场由外层 [RepaintBoundary] 隔离，避免动画触发父级重绘。
class _ParticleField extends StatelessWidget {
  const _ParticleField({required this.mascotSize});

  /// 吉祥物尺寸，用于计算粒子分布范围
  final double mascotSize;

  @override
  Widget build(BuildContext context) {
    final gradients = context.lingxiGradients;
    final gradientColors = gradients.celebration.colors;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final parentSize = mascotSize + 40;

    final specs = <_ParticleSpec>[
      _ParticleSpec(
        size: 8,
        initialOffsetFromCenter: Offset(-mascotSize * 0.42, -mascotSize * 0.42),
        trajectory: _ParticleTrajectory.circular,
        period: const Duration(milliseconds: 2800),
        delayFraction: 0.0,
        orbitRadius: mascotSize * 0.05,
      ),
      _ParticleSpec(
        size: 6,
        initialOffsetFromCenter: Offset(mascotSize * 0.42, -mascotSize * 0.38),
        trajectory: _ParticleTrajectory.spiral,
        period: const Duration(milliseconds: 3400),
        delayFraction: 0.15,
        orbitRadius: mascotSize * 0.07,
      ),
      _ParticleSpec(
        size: 10,
        initialOffsetFromCenter: Offset(-mascotSize * 0.46, mascotSize * 0.12),
        trajectory: _ParticleTrajectory.parabolic,
        period: const Duration(milliseconds: 3000),
        delayFraction: 0.3,
        orbitRadius: mascotSize * 0.06,
      ),
      _ParticleSpec(
        size: 5,
        initialOffsetFromCenter: Offset(mascotSize * 0.46, mascotSize * 0.18),
        trajectory: _ParticleTrajectory.circular,
        period: const Duration(milliseconds: 3600),
        delayFraction: 0.45,
        orbitRadius: mascotSize * 0.04,
      ),
      _ParticleSpec(
        size: 7,
        initialOffsetFromCenter: Offset(0, -mascotSize * 0.52),
        trajectory: _ParticleTrajectory.spiral,
        period: const Duration(milliseconds: 2400),
        delayFraction: 0.6,
        orbitRadius: mascotSize * 0.06,
      ),
      _ParticleSpec(
        size: 6,
        initialOffsetFromCenter: Offset(-mascotSize * 0.18, mascotSize * 0.48),
        trajectory: _ParticleTrajectory.parabolic,
        period: const Duration(milliseconds: 3200),
        delayFraction: 0.2,
        orbitRadius: mascotSize * 0.05,
      ),
      _ParticleSpec(
        size: 5,
        initialOffsetFromCenter: Offset(mascotSize * 0.22, mascotSize * 0.44),
        trajectory: _ParticleTrajectory.circular,
        period: const Duration(milliseconds: 3800),
        delayFraction: 0.5,
        orbitRadius: mascotSize * 0.05,
      ),
    ];

    return Positioned.fill(
      child: RepaintBoundary(
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            for (final spec in specs)
              _Particle(
                spec: spec,
                gradientColors: gradientColors,
                reduceMotion: reduceMotion,
                parentSize: parentSize,
              ),
          ],
        ),
      ),
    );
  }
}

/// 单个粒子：持有独立的 [AnimationController] 驱动轨迹/透明度/缩放
///
/// **布局策略**：[Positioned] 作为 [Stack] 的直接子节点，使用固定的
/// `left` / `top`（基础位置）锚定粒子。动画通过 [Transform.translate]
/// 驱动粒子围绕基础位置运动，避免每帧重建 [Positioned] 的 parent data。
///
/// **性能优化**：
/// - [CustomPaint] 作为 [AnimatedBuilder] 的静态 `child`（仅创建一次，
///   不随每帧重建），由 builder 复用。
/// - 内部 [RepaintBoundary] 隔离自身动画，避免影响其他粒子或父级。
///
/// `reduceMotion` 为 true 时不创建 controller，以静态姿态渲染。
class _Particle extends StatefulWidget {
  const _Particle({
    required this.spec,
    required this.gradientColors,
    required this.reduceMotion,
    required this.parentSize,
  });

  final _ParticleSpec spec;
  final List<Color> gradientColors;
  final bool reduceMotion;
  final double parentSize;

  @override
  State<_Particle> createState() => _ParticleState();
}

class _ParticleState extends State<_Particle>
    with SingleTickerProviderStateMixin {
  AnimationController? _controller;

  @override
  void initState() {
    super.initState();
    if (!widget.reduceMotion) {
      _controller = AnimationController(
        vsync: this,
        duration: widget.spec.period,
      )..repeat();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  /// 基础位置（Stack 坐标系下的固定锚点）
  Offset get _basePosition {
    final spec = widget.spec;
    return Offset(
      widget.parentSize / 2 + spec.initialOffsetFromCenter.dx,
      widget.parentSize / 2 + spec.initialOffsetFromCenter.dy,
    );
  }

  /// 根据进度 t（0.0-1.0）计算粒子相对基础位置的轨迹偏移
  Offset _trajectoryOffsetForProgress(double t) {
    final spec = widget.spec;
    final angle = t * 2 * math.pi;

    switch (spec.trajectory) {
      case _ParticleTrajectory.circular:
        // 圆周运动：固定半径，匀速旋转
        return Offset(
          spec.orbitRadius * math.cos(angle),
          spec.orbitRadius * math.sin(angle),
        );
      case _ParticleTrajectory.spiral:
        // 螺旋：半径在 0 → orbitRadius → 0 间振荡，角度旋转 2 圈
        final radius = spec.orbitRadius * (0.5 - 0.5 * math.cos(angle));
        final spiralAngle = t * 4 * math.pi;
        return Offset(
          radius * math.cos(spiralAngle),
          radius * math.sin(spiralAngle),
        );
      case _ParticleTrajectory.parabolic:
        // 抛物线（喷泉）：水平正弦摆动 + 垂直 4·t·(1-t) 抛物线
        final dx = spec.orbitRadius * math.sin(angle);
        final dy = -spec.orbitRadius * 1.5 * 4 * t * (1 - t);
        return Offset(dx, dy);
    }
  }

  /// 根据进度 t 计算透明度：延迟出现 → 淡入 → 保持 → 淡出
  double _opacityForProgress(double t) {
    final start = widget.spec.delayFraction;
    const visibleDuration = 0.6;
    final end = (start + visibleDuration).clamp(0.0, 1.0);
    if (t < start || t > end) {
      return 0.0;
    }
    final localT = (t - start) / (end - start);
    if (localT < 0.25) {
      return localT / 0.25; // 淡入
    } else if (localT > 0.75) {
      return (1.0 - localT) / 0.25; // 淡出
    }
    return 1.0; // 保持
  }

  /// 根据进度 t 计算缩放：0.7 → 1.2 → 0.7 呼吸式缩放
  double _scaleForProgress(double t) {
    return 0.7 + 0.5 * (0.5 - 0.5 * math.cos(t * 2 * math.pi));
  }

  @override
  Widget build(BuildContext context) {
    final spec = widget.spec;
    final base = _basePosition;
    final particleSize = Size(spec.size, spec.size);

    // CustomPaint 作为静态子组件，仅创建一次由 AnimatedBuilder 复用
    final customPaint = CustomPaint(
      size: particleSize,
      painter: _ParticlePainter(gradientColors: widget.gradientColors),
    );

    // reduceMotion 降级：固定位置 + 60% opacity 静态渲染
    if (widget.reduceMotion) {
      return Positioned(
        left: base.dx - spec.size / 2,
        top: base.dy - spec.size / 2,
        child: RepaintBoundary(
          child: Opacity(
            opacity: 0.6,
            child: customPaint,
          ),
        ),
      );
    }

    return Positioned(
      left: base.dx - spec.size / 2,
      top: base.dy - spec.size / 2,
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _controller!,
          builder: (context, child) {
            final t = _controller!.value;
            return Transform.translate(
              offset: _trajectoryOffsetForProgress(t),
              child: Opacity(
                opacity: _opacityForProgress(t),
                child: Transform.scale(
                  scale: _scaleForProgress(t),
                  child: child,
                ),
              ),
            );
          },
          child: customPaint,
        ),
      ),
    );
  }
}

/// 粒子绘制器：以 [LingxiGradients.celebration] 渐变色填充五角星路径
///
/// `gradientColors` 引用自 [LingxiGradients.celebration.colors]，列表实例
/// 在 [_ParticleField] 中创建后稳定传递给所有粒子，[shouldRepaint] 通过
/// 引用相等判断即可避免无效重绘。
class _ParticlePainter extends CustomPainter {
  _ParticlePainter({required this.gradientColors});

  final List<Color> gradientColors;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: gradientColors,
      ).createShader(rect)
      ..style = PaintingStyle.fill;
    final path = _createStarPath(
      5,
      size.width / 2,
      size.width / 2,
      size.width / 2,
      size.width / 4,
    );
    canvas.drawPath(path, paint);
  }

  Path _createStarPath(
    int points,
    double cx,
    double cy,
    double outerR,
    double innerR,
  ) {
    final path = Path();
    for (var i = 0; i < points * 2; i++) {
      final r = i.isEven ? outerR : innerR;
      final angle = (i * math.pi / points) - math.pi / 2;
      final x = cx + r * math.cos(angle);
      final y = cy + r * math.sin(angle);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    return path..close();
  }

  @override
  bool shouldRepaint(covariant _ParticlePainter oldDelegate) =>
      !identical(gradientColors, oldDelegate.gradientColors);
}
