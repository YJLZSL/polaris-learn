import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/motion/spring_motion.dart';
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
                      // 装饰星星
                      if (widget.showDecorations) ..._buildStars(mascotSize, colorScheme),
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

  List<Widget> _buildStars(double mascotSize, ColorScheme colorScheme) {
    final starColor = colorScheme.primary.withValues(alpha: 0.4);
    return [
      _TwinklingStar(
        size: 8,
        top: 5,
        left: 10,
        color: starColor,
        period: const Duration(milliseconds: 2400),
      ),
      _TwinklingStar(
        size: 6,
        top: 20,
        right: 5,
        color: starColor,
        period: const Duration(milliseconds: 3200),
      ),
      _TwinklingStar(
        size: 10,
        bottom: 10,
        left: 0,
        color: starColor,
        period: const Duration(milliseconds: 2800),
      ),
      _TwinklingStar(
        size: 5,
        bottom: 20,
        right: 15,
        color: starColor,
        period: const Duration(milliseconds: 3600),
      ),
      _TwinklingStar(
        size: 7,
        top: 0,
        right: mascotSize * 0.4,
        color: starColor,
        period: const Duration(milliseconds: 2000),
      ),
    ];
  }
}

/// 闪烁小星星
class _TwinklingStar extends StatefulWidget {
  const _TwinklingStar({
    required this.size,
    this.top,
    this.left,
    this.right,
    this.bottom,
    required this.color,
    required this.period,
  });

  final double size;
  final double? top;
  final double? left;
  final double? right;
  final double? bottom;
  final Color color;
  final Duration period;

  @override
  State<_TwinklingStar> createState() => _TwinklingStarState();
}

class _TwinklingStarState extends State<_TwinklingStar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.period);
    _opacity = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.2, end: 1.0).chain(CurveTween(curve: Curves.easeInOut)), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.2).chain(CurveTween(curve: Curves.easeInOut)), weight: 60),
    ]).animate(_controller);
    _scale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.7, end: 1.2).chain(CurveTween(curve: Curves.easeInOut)), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 1.2, end: 0.7).chain(CurveTween(curve: Curves.easeInOut)), weight: 60),
    ]).animate(_controller);
    _controller.repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: widget.top,
      left: widget.left,
      right: widget.right,
      bottom: widget.bottom,
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) => Opacity(
            opacity: _opacity.value,
            child: Transform.scale(
              scale: _scale.value,
              child: child,
            ),
          ),
          child: CustomPaint(
            size: Size(widget.size, widget.size),
            painter: _StarPainter(color: widget.color),
          ),
        ),
      ),
    );
  }
}

class _StarPainter extends CustomPainter {
  _StarPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    final path = _createStarPath(5, size.width / 2, size.width / 2, size.width / 2, size.width / 4);
    canvas.drawPath(path, paint);
  }

  Path _createStarPath(int points, double cx, double cy, double outerR, double innerR) {
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
  bool shouldRepaint(covariant _StarPainter oldDelegate) => color != oldDelegate.color;
}
