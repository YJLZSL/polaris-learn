import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';
import 'package:flutter/scheduler.dart';

import '../../core/motion/animation_utils.dart';
import '../../core/motion/spring_motion.dart';
import '../../core/theme/lingxi_colors.dart';
import '../../core/theme/shape_variants.dart';

/// 徽章形状
enum LingxiBadgeShape {
  /// 圆形
  circle,

  /// 圆角矩形
  rounded,

  /// 八角形（切角矩形）
  octagon,
}

/// 灵犀学院成就徽章组件
///
/// 用于成就展示，未解锁时显示灰色锁定状态；解锁时以成就金高亮。
/// 支持圆形、圆角矩形、八角形三种形状。
///
/// 动画行为：
/// - [newlyUnlocked] 为 true 时：弹性入场（0→1.2→1.0，使用 [Curves.easeOutBack]，
///   总时长 800ms）+ 金色 SparkleRing 光环扩散。
/// - [unlocked] 为 true（非新解锁）时：徽章整体有轻柔的金色呼吸光效
///   （[SpringMotion.pulseBreathing]，minScale 0.98 / maxScale 1.02 / 周期 3s）。
/// - 未解锁且 [progress] 在 (0,1) 区间时：徽章外围绘制进度弧，进度变化时
///   以弹簧动画平滑过渡。
/// - 所有循环/入场动画在系统开启"减少动画"（[MediaQuery.disableAnimations]）时
///   自动降级为静态终态。
///
/// 交互：包裹 [Material] + [InkWell] 提供水波纹反馈，[onTap] 为 null 时
/// 不响应点击（无涟漪）。
class LingxiBadge extends StatefulWidget {
  const LingxiBadge({
    super.key,
    required this.icon,
    required this.label,
    this.unlocked = false,
    this.shape = LingxiBadgeShape.circle,
    this.size = 64,
    this.newlyUnlocked = false,
    this.progress,
    this.onTap,
  });

  /// 徽章图标（解锁时展示）
  final Widget icon;

  /// 徽章下方文字
  final Widget label;

  /// 是否已解锁
  final bool unlocked;

  /// 徽章形状
  final LingxiBadgeShape shape;

  /// 徽章尺寸（直径 / 边长）
  final double size;

  /// 是否为新解锁徽章。
  ///
  /// 为 true 时播放弹性入场动画（scale 0→1.2→1.0，800ms，[Curves.easeOutBack]）
  /// 并在徽章背后显示金色 SparkleRing 光环扩散。
  final bool newlyUnlocked;

  /// 解锁进度（0.0~1.0），仅对未解锁徽章生效。
  ///
  /// - 为 null 或 0.0 时不显示进度弧；
  /// - 为 1.0 时弧完整形成一个整圆；
  /// - 值变化时以弹簧动画平滑过渡。
  final double? progress;

  /// 点击回调；为 null 时不响应点击（不显示水波纹）。
  final VoidCallback? onTap;

  @override
  State<LingxiBadge> createState() => _LingxiBadgeState();
}

class _LingxiBadgeState extends State<LingxiBadge>
    with TickerProviderStateMixin {
  // ── 入场动画（新解锁弹性弹跳） ──────────────────────────
  late final AnimationController _entranceController;
  late final Animation<double> _entranceScale;

  // ── 进度弧动画（弹簧驱动） ──────────────────────────────
  late final AnimationController _progressController;
  late Animation<double> _progressAnimation;
  double _previousProgress = 0.0;

  bool get _reduceMotion =>
      SchedulerBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations;

  @override
  void initState() {
    super.initState();

    // 入场动画：scale 0 → 1.2 → 1.0，800ms
    _entranceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _entranceScale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 1.2)
            .chain(CurveTween(curve: Curves.easeOutBack)),
        weight: 60,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.2, end: 1.0)
            .chain(CurveTween(curve: Curves.easeOutCubic)),
        weight: 40,
      ),
    ]).animate(_entranceController);

    if (widget.newlyUnlocked && !_reduceMotion) {
      _entranceController.forward();
    } else {
      _entranceController.value = 1.0;
    }

    // 进度弧：初始值即当前进度，后续变化以弹簧驱动
    final initialProgress =
        AnimationUtils.clamp01(widget.progress ?? 0.0);
    _previousProgress = initialProgress;
    _progressController = AnimationController.unbounded(
      vsync: this,
    );
    _progressAnimation =
        AlwaysStoppedAnimation<double>(initialProgress);
  }

  @override
  void didUpdateWidget(covariant LingxiBadge oldWidget) {
    super.didUpdateWidget(oldWidget);

    // 进度变化 → 弹簧动画
    final newProgress = AnimationUtils.clamp01(widget.progress ?? 0.0);
    if ((newProgress - _previousProgress).abs() > 1e-6) {
      _animateProgressTo(newProgress);
    }

    // newlyUnlocked 从 false 切到 true → 重新播放入场
    if (!oldWidget.newlyUnlocked && widget.newlyUnlocked && !_reduceMotion) {
      _entranceController.forward(from: 0.0);
    }
  }

  void _animateProgressTo(double target) {
    _previousProgress = target;
    _progressAnimation = _progressController.drive(
      Tween<double>(begin: _progressAnimation.value, end: target),
    );
    _progressController.value = 0.0;
    final simulation = SpringSimulation(
      SpringMotion.gentleSpeed,
      0.0,
      1.0,
      0.0,
    );
    _progressController.animateWith(simulation);
  }

  @override
  void dispose() {
    _entranceController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  /// 根据形状返回对应的 [ShapeBorder]（用于 [Material.shape] 与
  /// [InkWell.customBorder]，保证水波纹贴合形状）。
  ShapeBorder _shapeBorderFor(LingxiBadgeShape shape) {
    switch (shape) {
      case LingxiBadgeShape.circle:
        return const CircleBorder();
      case LingxiBadgeShape.rounded:
        return RoundedRectangleBorder(
          borderRadius: ShapeVariants.roundedLarge.borderRadius,
        );
      case LingxiBadgeShape.octagon:
        return const _OctagonBorder();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.lingxiColors;
    final gold = colors.achievementGold;
    final iconColor =
        widget.unlocked ? gold : theme.colorScheme.onSurfaceVariant;
    final bgColor = widget.unlocked
        ? gold.withValues(alpha: 0.16)
        : theme.colorScheme.surfaceContainerHigh;

    final labelStyle = (theme.textTheme.labelSmall ?? const TextStyle())
        .copyWith(
          color: widget.unlocked
              ? theme.colorScheme.onSurface
              : theme.colorScheme.onSurfaceVariant,
        );

    final badgeSize = widget.size;
    // 光环 / 进度弧 预留的外圈边距
    const ringPadding = 8.0;
    final ringSize = badgeSize + ringPadding * 2;

    final showProgress = !widget.unlocked &&
        widget.progress != null &&
        widget.progress! > 0.0;

    // ── 徽章图标 / 锁 ─────────────────────────────────────
    final iconSize =
        widget.unlocked ? badgeSize * 0.5 : badgeSize * 0.4;
    final badgeContent = IconTheme(
      data: IconThemeData(color: iconColor, size: iconSize),
      child: widget.unlocked ? widget.icon : const Icon(Icons.lock_outline),
    );

    // ── 徽章主体：Material + InkWell 提供水波纹 ──────────
    final shapeBorder = _shapeBorderFor(widget.shape);
    final badgeBody = Material(
      color: bgColor,
      shape: shapeBorder,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        customBorder: shapeBorder,
        onTap: widget.onTap,
        child: SizedBox(
          width: badgeSize,
          height: badgeSize,
          child: Center(child: badgeContent),
        ),
      ),
    );

    // ── 动画包裹层 ────────────────────────────────────────
    Widget animatedBadge;
    if (widget.newlyUnlocked) {
      // 新解锁：弹性入场
      if (_reduceMotion) {
        animatedBadge = badgeBody;
      } else {
        animatedBadge = AnimatedBuilder(
          animation: _entranceController,
          builder: (context, child) => Transform.scale(
            scale: _entranceScale.value,
            child: child,
          ),
          child: badgeBody,
        );
      }
    } else if (widget.unlocked) {
      // 已解锁：呼吸光效
      animatedBadge = SpringMotion.pulseBreathing(
        child: badgeBody,
        minScale: 0.98,
        maxScale: 1.02,
        period: const Duration(seconds: 3),
      );
    } else {
      animatedBadge = badgeBody;
    }

    // ── 组装：Stack 叠放（光环 / 进度弧 / 徽章） ──────────
    final badgeArea = SizedBox(
      width: ringSize,
      height: ringSize,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // 进度弧（未解锁且有进度）
          if (showProgress)
            AnimatedBuilder(
              animation: _progressController,
              builder: (context, _) => CustomPaint(
                size: Size(ringSize, ringSize),
                painter: _ProgressArcPainter(
                  progress: _progressAnimation.value,
                  color: gold.withValues(alpha: 0.7),
                  trackColor: gold.withValues(alpha: 0.2),
                  strokeWidth: 3.0,
                ),
              ),
            ),
          // 金色光环（新解锁）
          if (widget.newlyUnlocked && !_reduceMotion)
            SpringMotion.sparkleRing(
              color: gold,
              size: ringSize,
              duration: const Duration(milliseconds: 800),
            ),
          // 徽章本体
          animatedBadge,
        ],
      ),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        badgeArea,
        const SizedBox(height: 6),
        DefaultTextStyle(
          style: labelStyle,
          textAlign: TextAlign.center,
          child: widget.label,
        ),
      ],
    );
  }
}

// ── 进度弧绘制器 ──────────────────────────────────────────────

/// 在圆形路径上绘制解锁进度弧，含背景轨道。
class _ProgressArcPainter extends CustomPainter {
  _ProgressArcPainter({
    required this.progress,
    required this.color,
    required this.trackColor,
    required this.strokeWidth,
  });

  final double progress;
  final Color color;
  final Color trackColor;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    // 背景轨道
    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..isAntiAlias = true;
    canvas.drawCircle(center, radius, trackPaint);

    // 进度弧：从 12 点钟方向顺时针
    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..isAntiAlias = true;
    const startAngle = -math.pi / 2;
    final sweepAngle = 2 * math.pi * AnimationUtils.clamp01(progress);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ProgressArcPainter oldDelegate) =>
      progress != oldDelegate.progress ||
      color != oldDelegate.color ||
      trackColor != oldDelegate.trackColor ||
      strokeWidth != oldDelegate.strokeWidth;
}

// ── 八角形形貌 ────────────────────────────────────────────────

/// 八角形形貌：将矩形四角裁去以形成正八角形观感，
/// 用于 [Material.shape] / [InkWell.customBorder] 使水波纹贴合形状。
class _OctagonBorder extends ShapeBorder {
  const _OctagonBorder();

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      getOuterPath(rect, textDirection: textDirection);

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    final w = rect.width;
    final h = rect.height;
    // 切角比例 ≈ 1/(1+√2) ≈ 0.293，取 0.3 形成正八角形观感
    final cutX = w * 0.3;
    final cutY = h * 0.3;
    return Path()
      ..moveTo(rect.left + cutX, rect.top)
      ..lineTo(rect.right - cutX, rect.top)
      ..lineTo(rect.right, rect.top + cutY)
      ..lineTo(rect.right, rect.bottom - cutY)
      ..lineTo(rect.right - cutX, rect.bottom)
      ..lineTo(rect.left + cutX, rect.bottom)
      ..lineTo(rect.left, rect.bottom - cutY)
      ..lineTo(rect.left, rect.top + cutY)
      ..close();
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {}

  @override
  ShapeBorder scale(double t) => this;
}
