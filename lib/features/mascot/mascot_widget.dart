import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/motion/animation_utils.dart';
import '../../core/motion/spring_motion.dart';
import '../../core/theme/lingxi_gradients.dart';
import 'mascot_controller.dart';
import 'mascot_state.dart';

/// 吉祥物"小犀"展示组件。
///
/// 内部维护 [AnimationController] 驱动 [_MascotPainter] 的动画进度，
/// 支持外部指定 [mood]，或从 [mascotControllerProvider] 读取全局情绪。
/// 点击交互：
/// - 单次点击：随机切换俏皮表情（happy / curious）1.5 秒后恢复。
/// - 2 秒内连续点击 5 次：触发庆祝彩蛋（celebrate 持续 3 秒 + 额外星光）。
///
/// 可选 [speechBubble] 显示对话气泡（用于引导提示）。
class MascotWidget extends ConsumerStatefulWidget {
  const MascotWidget({
    super.key,
    this.size = 120,
    this.mood,
    this.onTap,
    this.enableTapInteraction = true,
    this.speechBubble,
    this.showAura = true,
  });

  /// 吉祥物尺寸（正方形画布边长）
  final double size;

  /// 外部指定情绪，优先于全局 controller
  final MascotMood? mood;

  /// 点击回调
  final VoidCallback? onTap;

  /// 是否启用点击交互（彩蛋/俏皮动画）
  final bool enableTapInteraction;

  /// 可选对话气泡文字（显示在吉祥物右上方）
  final String? speechBubble;

  /// 是否显示吉祥物背后的光晕
  final bool showAura;

  @override
  ConsumerState<MascotWidget> createState() => _MascotWidgetState();
}

class _MascotWidgetState extends ConsumerState<MascotWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  final math.Random _random = math.Random();

  /// 当前正在播放动画的情绪（缓存，用于检测变化并重启动画）
  MascotMood _currentMood = MascotMood.idle;

  /// 临时情绪（点击触发的俏皮动画），为 null 时回退到基础情绪
  MascotMood? _tempMood;

  /// 彩蛋额外星光
  bool _easterEgg = false;

  /// 点击计数与最近一次点击时间（用于彩蛋检测）
  int _tapCount = 0;
  DateTime? _lastTapTime;

  /// 临时情绪恢复计时器
  Timer? _restoreTimer;

  @override
  void initState() {
    super.initState();
    _currentMood = widget.mood ?? MascotMood.idle;
    _controller = AnimationController(
      vsync: this,
      duration: _durationFor(_currentMood),
    );
    if (!AnimationUtils.platformReduceMotion) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _restoreTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  /// 不同情绪对应的动画时长
  Duration _durationFor(MascotMood m) => switch (m) {
        MascotMood.idle => const Duration(seconds: 3),
        MascotMood.happy => const Duration(milliseconds: 1000),
        MascotMood.thinking => const Duration(seconds: 4),
        MascotMood.sad => const Duration(seconds: 3),
        MascotMood.celebrate => const Duration(seconds: 2),
        MascotMood.curious => const Duration(seconds: 3),
      };

  /// 处理点击：俏皮动画 / 彩蛋
  void _handleTap() {
    if (!widget.enableTapInteraction) {
      return;
    }
    AnimationUtils.hapticLight();
    final now = DateTime.now();
    if (_lastTapTime == null ||
        now.difference(_lastTapTime!) > const Duration(seconds: 2)) {
      _tapCount = 0;
    }
    _tapCount++;
    _lastTapTime = now;
    _restoreTimer?.cancel();

    if (_tapCount >= 5) {
      // 触发彩蛋：庆祝 3 秒 + 额外星光
      _tapCount = 0;
      _tempMood = MascotMood.celebrate;
      _easterEgg = true;
      AnimationUtils.hapticMedium();
      _restoreTimer = Timer(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() {
            _tempMood = null;
            _easterEgg = false;
          });
        }
      });
    } else {
      // 随机俏皮表情：开心 / 好奇
      _tempMood = _random.nextBool() ? MascotMood.happy : MascotMood.curious;
      _restoreTimer = Timer(const Duration(milliseconds: 1500), () {
        if (mounted) {
          setState(() {
            _tempMood = null;
          });
        }
      });
    }

    widget.onTap?.call();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    // 基础情绪：外部指定优先，否则读取全局 controller
    final baseMood = widget.mood ?? ref.watch(mascotControllerProvider).mood;
    final effective = _tempMood ?? baseMood;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    // 情绪变化时重启动画（切换时长并重新循环）
    if (effective != _currentMood) {
      _currentMood = effective;
      _controller.duration = _durationFor(effective);
      _controller.repeat();
    }

    Widget customPaint = SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return CustomPaint(
            size: Size.infinite,
            painter: _MascotPainter(
              mood: _currentMood,
              animationValue: _controller.value,
              extraSparkle: _easterEgg,
            ),
          );
        },
      ),
    );

    // 添加光晕
    if (widget.showAura && !reduceMotion) {
      customPaint = Stack(
        clipBehavior: Clip.none,
        children: [
          // 背后光晕：RepaintBoundary 隔离呼吸动画，避免触发吉祥物重绘
          const Positioned.fill(
            child: RepaintBoundary(
              child: _AuraGlow(),
            ),
          ),
          // 吉祥物本身也隔离，两个独立动画单元互不干扰
          RepaintBoundary(child: customPaint),
        ],
      );
    }

    // 点击交互
    if (widget.enableTapInteraction) {
      customPaint = GestureDetector(
        onTap: _handleTap,
        behavior: HitTestBehavior.opaque,
        child: SpringMotion.scalePressFeedback(child: customPaint),
      );
    }

    // 对话气泡
    if (widget.speechBubble != null && widget.speechBubble!.isNotEmpty) {
      customPaint = Stack(
        clipBehavior: Clip.none,
        children: [
          Padding(
            padding: EdgeInsets.only(top: widget.size * 0.25),
            child: customPaint,
          ),
          Positioned(
            top: 0,
            right: 0,
            child: _SpeechBubble(text: widget.speechBubble!),
          ),
        ],
      );
    }

    // 无障碍：为屏幕阅读器提供吉祥物语义标签
    final moodLabel = switch (_currentMood) {
      MascotMood.idle => '待机中',
      MascotMood.happy => '开心',
      MascotMood.thinking => '思考中',
      MascotMood.sad => '难过',
      MascotMood.celebrate => '庆祝',
      MascotMood.curious => '好奇',
    };
    return Semantics(
      label: '灵犀吉祥物，当前状态：$moodLabel',
      button: widget.enableTapInteraction,
      child: customPaint,
    );
  }
}

/// 吉祥物背后的柔和光晕
///
/// 使用 [LingxiGradients.mascotHero] 语义化渐变（紫色径向辉光），
/// 替代早期按 [MascotMood] 硬编码的颜色切换。光晕通过 4 秒周期的
/// 缓慢呼吸脉动（scale 0.95 → 1.05）营造柔和氛围。
class _AuraGlow extends StatelessWidget {
  const _AuraGlow();

  @override
  Widget build(BuildContext context) {
    final gradients = context.lingxiGradients;
    return _AuraGlowAnimator(
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: gradients.mascotHero,
        ),
      ),
    );
  }
}

/// 驱动光环呼吸动画的内部 widget，独立持有 [AnimationController]，
/// 配合外层 [RepaintBoundary] 隔离动画重绘。
class _AuraGlowAnimator extends StatefulWidget {
  const _AuraGlowAnimator({required this.child});

  final Widget child;

  @override
  State<_AuraGlowAnimator> createState() => _AuraGlowAnimatorState();
}

class _AuraGlowAnimatorState extends State<_AuraGlowAnimator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breath;

  @override
  void initState() {
    super.initState();
    _breath = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _breath,
      builder: (context, _) {
        // 4 秒周期呼吸：scale 0.95 → 1.05，配合 mascotHero 渐变
        final scale = 0.95 + 0.10 * _breath.value;
        // 透明度微变（0.85 → 1.0）增强脉动感，避免光环过于平淡
        final opacity = 0.85 + 0.15 * _breath.value;
        return Transform.scale(
          scale: scale,
          child: Opacity(
            opacity: opacity,
            child: widget.child,
          ),
        );
      },
    );
  }
}

/// 对话气泡
class _SpeechBubble extends StatelessWidget {
  const _SpeechBubble({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return SpringMotion.springTransition(
      beginScale: 0.8,
      child: CustomPaint(
        painter: _BubblePainter(color: cs.surfaceContainerHighest),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: cs.onSurface,
              height: 1.4,
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ),
    );
  }
}

class _BubblePainter extends CustomPainter {
  _BubblePainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    const r = 10.0;
    const tailW = 8.0;
    const tailH = 10.0;
    final paint = Paint()..color = color;
    final rect = RRect.fromLTRBR(0, 0, size.width, size.height - tailH + 2,
        const Radius.circular(r));
    final tail = Path()
      ..moveTo(size.width * 0.7, size.height - tailH)
      ..lineTo(size.width * 0.7 + tailW, size.height)
      ..lineTo(size.width * 0.7 + tailW * 2, size.height - tailH)
      ..close();
    canvas.drawRRect(rect, paint);
    canvas.drawPath(tail, paint);
  }

  @override
  bool shouldRepaint(covariant _BubblePainter old) => color != old.color;
}

// fallback 实现，仅内部使用，外部统一使用 MascotWidget。
//
// 使用 [CustomPainter] + 纯矢量 API（[Path]/[drawCircle]/[drawOval]/
// [drawArc]）绘制一只萌系圆润的星空小犀牛。6 种 [MascotMood] 通过不同的
// 五官与动作参数区分；[animationValue] 驱动整体浮动/跳跃/旋转等动画偏移。
//
// 设计要点：
// - 大头小身体的萌系比例（头部约占整体 60%）。
// - 主体灰紫色渐变（#7C4DFF → #B39DDB），学士帽黑色，翅膀半透明白色。
// - 矢量路径绘制，三端像素级一致，缩放不糊。
// - 实色 [Paint] 缓存为静态字段，渐变/描边按需创建，控制每帧分配数量。
class _MascotPainter extends CustomPainter {
  const _MascotPainter({
    required this.mood,
    this.animationValue = 0,
    this.extraSparkle = false,
  });

  /// 当前情绪
  final MascotMood mood;

  /// 动画进度（0.0 - 1.0），由 [AnimationController] 驱动
  final double animationValue;

  /// 是否叠加额外星光粒子（彩蛋触发时为 true）
  final bool extraSparkle;

  // ---- 颜色常量（ARGB 十六进制，避免使用已废弃的 withOpacity）----
  // 身体径向渐变：中心 mascotPrimary（#7C4DFF），外缘深紫（#5E35B1）增强立体感
  static const Color _bodyTop = Color(0xFF7C4DFF);
  static const Color _bodyBottom = Color(0xFFB39DDB);
  static const Color _bodyOuter = Color(0xFF5E35B1);
  // 角部高光反射（白色 20% 透明度）
  static const Color _hornHighlight = Color(0x33FFFFFF);
  // 瞳孔高光点（白色 70% 透明度，小圆点）
  static const Color _pupilGlint = Color(0xB3FFFFFF);
  // 放大镜边缘光泽反射（白色 30% 透明度）
  static const Color _lensGlint = Color(0x4DFFFFFF);
  static const Color _capColor = Color(0xFF1C1B2E);
  static const Color _tasselColor = Color(0xFFFFD54F);
  static const Color _starColor = Color(0xFFFFE082);
  static const Color _scleraColor = Color(0xFFFFFFFF);
  static const Color _pupilColor = Color(0xFF2A2118);
  static const Color _mouthColor = Color(0xFF3E2723);
  static const Color _hornTop = Color(0xFFFFFFFF);
  static const Color _hornBottom = Color(0xFFB39DDB);
  static const Color _tongueColor = Color(0xFFFF8A95);
  static const Color _glassColor = Color(0x33B3E5FC);

  // 半透明色（直接用 ARGB 十六进制）
  static const Color _blushColor = Color(0x66FF8A95);
  static const Color _wingFillColor = Color(0x59FFFFFF);
  static const Color _wingStrokeColor = Color(0x99FFFFFF);
  static const Color _highlightColor = Color(0x55FFFFFF);

  // ---- 实色 Paint 缓存（只读共享，不会在绘制中被修改）----
  static final Paint _capPaint = Paint()..color = _capColor;
  static final Paint _tasselPaint = Paint()..color = _tasselColor;
  static final Paint _scleraPaint = Paint()..color = _scleraColor;
  static final Paint _pupilPaint = Paint()..color = _pupilColor;
  static final Paint _blushPaint = Paint()..color = _blushColor;
  static final Paint _starFillPaint = Paint()..color = _starColor;
  static final Paint _mouthFillPaint = Paint()..color = _mouthColor;
  static final Paint _tonguePaint = Paint()..color = _tongueColor;
  static final Paint _wingFillPaint = Paint()..color = _wingFillColor;
  static final Paint _wingStrokePaint = Paint()
    ..color = _wingStrokeColor
    ..style = PaintingStyle.stroke
    ..strokeWidth = 1.2;
  static final Paint _glassPaint = Paint()..color = _glassColor;

  @override
  void paint(Canvas canvas, Size size) {
    // 假设正方形画布（由 MascotWidget 的 SizedBox 保证）
    final s = size.width;
    final cx = s * 0.5;
    final av = animationValue;
    final t = av * 2 * math.pi;

    // 计算整体动画变换
    double bodyDy = 0.0;
    var scale = 1.0;
    var rotation = 0.0;
    if (mood == MascotMood.idle) {
      bodyDy = math.sin(t) * s * 0.015;
    } else if (mood == MascotMood.happy) {
      final jump = 4 * av * (1 - av); // 抛物线 0..1..0
      bodyDy = -jump * s * 0.08;
    } else if (mood == MascotMood.sad) {
      bodyDy = s * 0.012;
    } else if (mood == MascotMood.celebrate) {
      final hop = (0.5 - 0.5 * math.cos(t)) * 0.04;
      bodyDy = -hop * s;
      scale = 1 + 0.05 * math.sin(t);
      rotation = t * 0.5;
    } else if (mood == MascotMood.curious) {
      bodyDy = math.sin(t) * s * 0.01;
    }
    // thinking：整体静止，头部单独点头

    // 1. 地面投影（不受整体变换影响，仅随跳跃高度收缩）
    _drawShadow(canvas, s, cx, bodyDy);

    // 2. 主体（应用整体变换：浮动/跳跃/缩放/旋转）
    canvas.save();
    canvas.translate(cx, s * 0.5);
    canvas.rotate(rotation);
    canvas.scale(scale);
    canvas.translate(-cx, -s * 0.5);
    canvas.translate(0.0, bodyDy);

    _drawWings(canvas, s, cx);
    _drawBody(canvas, s, cx);
    _drawHeadGroup(canvas, s, cx);

    canvas.restore();

    // 3. 环绕星光/庆祝撒花（不受整体变换影响，独立闪烁）
    _drawAmbientStars(canvas, s, cx);
  }

  @override
  bool shouldRepaint(covariant _MascotPainter old) {
    return mood != old.mood ||
        animationValue != old.animationValue ||
        extraSparkle != old.extraSparkle;
  }

  // ============ 地面投影 ============
  void _drawShadow(Canvas canvas, double s, double cx, double bodyDy) {
    // 跳起越高（bodyDy 越负），投影越小越淡
    final lift = (-bodyDy / (s * 0.08)).clamp(0.0, 1.0);
    final alpha = (0.12 * (1 - lift * 0.5)).clamp(0.02, 0.12);
    final paint = Paint()..color = _rgba(0x000000, alpha);
    final rx = s * 0.18 * (1 - lift * 0.25);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx, s * 0.93),
        width: rx * 2,
        height: s * 0.045,
      ),
      paint,
    );
  }

  // ============ 翅膀 ============
  void _drawWings(Canvas canvas, double s, double cx) {
    final flapBase = <MascotMood, double>{
      MascotMood.happy: 0.28,
      MascotMood.celebrate: 0.32,
      MascotMood.idle: 0.10,
      MascotMood.curious: 0.08,
      MascotMood.thinking: 0.04,
      MascotMood.sad: 0.02,
    }[mood]!;
    final flap = math.sin(animationValue * 2 * math.pi) * flapBase;
    final bodyCy = s * 0.72;
    _drawWing(canvas, s, cx, bodyCy, -1, flap);
    _drawWing(canvas, s, cx, bodyCy, 1, flap);
  }

  void _drawWing(
    Canvas canvas,
    double s,
    double cx,
    double bodyCy,
    int side,
    double flap,
  ) {
    final anchor = Offset(cx + side * s * 0.08, bodyCy - s * 0.02);
    canvas.save();
    canvas.translate(anchor.dx, anchor.dy);
    canvas.rotate(side * (0.45 + flap));

    final len = s * 0.16;
    final wid = s * 0.10;
    final path = Path()
      ..moveTo(0, 0)
      ..quadraticBezierTo(side * len * 0.5, -wid * 0.65, side * len, -wid * 0.1)
      ..quadraticBezierTo(side * len * 0.78, wid * 0.05, side * len * 0.6, wid * 0.32)
      ..quadraticBezierTo(side * len * 0.3, wid * 0.18, 0, wid * 0.12)
      ..close();
    canvas.drawPath(path, _wingFillPaint);
    canvas.drawPath(path, _wingStrokePaint);

    // 羽脉（两条内部细线，增加翅膀质感）
    final vein1 = Path()
      ..moveTo(0, 0)
      ..quadraticBezierTo(side * len * 0.4, -wid * 0.2, side * len * 0.75, -wid * 0.05);
    final vein2 = Path()
      ..moveTo(0, wid * 0.05)
      ..quadraticBezierTo(side * len * 0.35, wid * 0.05, side * len * 0.6, wid * 0.2);
    final veinPaint = _stroke(_wingStrokeColor, s * 0.005);
    canvas.drawPath(vein1, veinPaint);
    canvas.drawPath(vein2, veinPaint);

    // 翅尖星光
    canvas.drawPath(
      _starPath(Offset(side * len, -wid * 0.05), s * 0.018, s * 0.008),
      _starFillPaint,
    );

    canvas.restore();
  }

  // 身体径向渐变（const，复用）：偏左上中心 → 外缘深紫，模拟立体受光
  static const RadialGradient _bodyGradient = RadialGradient(
    center: Alignment(-0.3, -0.3),
    radius: 0.95,
    colors: [_bodyTop, _bodyBottom, _bodyOuter],
    stops: [0.0, 0.6, 1.0],
  );

  // ============ 身体 ============
  void _drawBody(Canvas canvas, double s, double cx) {
    final center = Offset(cx, s * 0.74);
    final rx = s * 0.19;
    final ry = s * 0.14;
    final rect = Rect.fromCenter(center: center, width: rx * 2, height: ry * 2);
    final shader = _bodyGradient.createShader(rect);
    canvas.drawOval(rect, Paint()..shader = shader);

    // 身体高光
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx - rx * 0.4, center.dy - ry * 0.35),
        width: rx * 0.7,
        height: ry * 0.5,
      ),
      Paint()..color = _highlightColor,
    );

    // 身体上的小星星装饰
    _drawBodyStars(canvas, s, cx, center, rx, ry);
  }

  void _drawBodyStars(
    Canvas canvas,
    double s,
    double cx,
    Offset center,
    double rx,
    double ry,
  ) {
    final stars = <Offset>[
      Offset(cx - rx * 0.35, center.dy - ry * 0.1),
      Offset(cx + rx * 0.3, center.dy + ry * 0.15),
      Offset(cx + rx * 0.05, center.dy - ry * 0.35),
    ];
    final sizes = <double>[0.014, 0.011, 0.012];
    for (var i = 0; i < stars.length; i++) {
      final twinkle = 0.6 + 0.4 * math.sin(animationValue * 2 * math.pi + i);
      final paint = Paint()..color = _rgba(0xFFFFE082, twinkle.clamp(0.0, 1.0));
      canvas.drawPath(
        _starPath(stars[i], s * sizes[i], s * sizes[i] * 0.42),
        paint,
      );
    }
  }

  // ============ 头部组（含头、角、帽、五官、面部附加元素）============
  void _drawHeadGroup(Canvas canvas, double s, double cx) {
    // 头部独立变换：thinking 点头，curious 歪头
    var headRot = 0.0;
    var headDy = 0.0;
    if (mood == MascotMood.thinking) {
      headDy = (0.5 - 0.5 * math.cos(animationValue * 2 * math.pi)) * s * 0.015;
    } else if (mood == MascotMood.curious) {
      headRot = 0.12 + 0.04 * math.sin(animationValue * 2 * math.pi);
    }

    final headCenter = Offset(cx, s * 0.42);
    canvas.save();
    canvas.translate(headCenter.dx, headCenter.dy + headDy);
    canvas.rotate(headRot);
    canvas.translate(-headCenter.dx, -headCenter.dy);

    _drawHead(canvas, s, cx);
    _drawHorn(canvas, s, cx);
    _drawCap(canvas, s, cx);
    _drawBlush(canvas, s, cx);
    _drawEyes(canvas, s, cx);
    _drawMouth(canvas, s, cx);
    _drawFaceExtras(canvas, s, cx);

    canvas.restore();
  }

  void _drawHead(Canvas canvas, double s, double cx) {
    final center = Offset(cx, s * 0.42);
    final r = s * 0.26;
    final rect = Rect.fromCircle(center: center, radius: r);
    final shader = _bodyGradient.createShader(rect);
    canvas.drawCircle(center, r, Paint()..shader = shader);

    // 头部高光
    canvas.drawCircle(
      Offset(center.dx - r * 0.35, center.dy - r * 0.4),
      r * 0.32,
      Paint()..color = _highlightColor,
    );
  }

  // 头顶（额头）小犀角 + 星光点缀
  void _drawHorn(Canvas canvas, double s, double cx) {
    final baseY = s * 0.28;
    final tipY = s * 0.19;
    final baseHalf = s * 0.028;
    final rect = Rect.fromLTRB(cx - baseHalf, tipY, cx + baseHalf, baseY);
    final shader = const LinearGradient(
      begin: Alignment.bottomCenter,
      end: Alignment.topCenter,
      colors: [_hornBottom, _hornTop],
    ).createShader(rect);
    final path = Path()
      ..moveTo(cx - baseHalf, baseY)
      ..lineTo(cx + baseHalf, baseY)
      ..lineTo(cx, tipY)
      ..close();
    canvas.drawPath(path, Paint()..shader = shader);

    // 角部高光反射：白色 20% 透明度小圆，偏左模拟受光面
    canvas.drawCircle(
      Offset(cx - baseHalf * 0.35, tipY + (baseY - tipY) * 0.35),
      s * 0.008,
      Paint()..color = _hornHighlight,
    );

    // 角尖星光
    final twinkle = 0.5 + 0.5 * math.sin(animationValue * 2 * math.pi);
    canvas.drawPath(
      _starPath(Offset(cx, tipY - s * 0.005), s * 0.022, s * 0.009),
      Paint()..color = _rgba(0xFFFFE082, twinkle.clamp(0.0, 1.0)),
    );
  }

  // 学士帽（菱形帽板 + 帽箍 + 流苏）
  void _drawCap(Canvas canvas, double s, double cx) {
    // 帽板（菱形）
    final top = Offset(cx, s * 0.045);
    final right = Offset(cx + s * 0.13, s * 0.075);
    final bottom = Offset(cx, s * 0.105);
    final left = Offset(cx - s * 0.13, s * 0.075);
    final board = Path()
      ..moveTo(top.dx, top.dy)
      ..lineTo(right.dx, right.dy)
      ..lineTo(bottom.dx, bottom.dy)
      ..lineTo(left.dx, left.dy)
      ..close();
    canvas.drawPath(board, _capPaint);

    // 帽箍（贴合头顶的梯形）
    final band = Path()
      ..moveTo(cx - s * 0.035, s * 0.105)
      ..lineTo(cx + s * 0.035, s * 0.105)
      ..lineTo(cx + s * 0.085, s * 0.165)
      ..lineTo(cx - s * 0.085, s * 0.165)
      ..close();
    canvas.drawPath(band, _capPaint);

    // 帽钮
    canvas.drawCircle(Offset(cx, s * 0.075), s * 0.012, _tasselPaint);

    // 流苏：帽钮 → 右角 → 下垂
    final cord = _stroke(_tasselColor, s * 0.012);
    canvas.drawLine(Offset(cx, s * 0.075), right, cord);
    final tasselEnd = Offset(right.dx, s * 0.21);
    canvas.drawLine(right, tasselEnd, cord);
    // 流苏穗（小圆头 + 三条细线）
    canvas.drawCircle(tasselEnd, s * 0.014, _tasselPaint);
    final fringe = _stroke(_tasselColor, s * 0.006);
    canvas.drawLine(tasselEnd, tasselEnd + Offset(s * 0.012, s * 0.02), fringe);
    canvas.drawLine(tasselEnd, tasselEnd + Offset(-s * 0.004, s * 0.024), fringe);
    canvas.drawLine(tasselEnd, tasselEnd + Offset(s * 0.004, s * 0.026), fringe);
  }

  // 腮红
  void _drawBlush(Canvas canvas, double s, double cx) {
    if (mood == MascotMood.sad || mood == MascotMood.thinking) {
      return; // 难过/思考时不画腮红
    }
    final y = s * 0.46;
    canvas.drawCircle(Offset(cx - s * 0.135, y), s * 0.022, _blushPaint);
    canvas.drawCircle(Offset(cx + s * 0.135, y), s * 0.022, _blushPaint);
  }

  // ============ 眼睛（按情绪区分）============
  void _drawEyes(Canvas canvas, double s, double cx) {
    final eyeY = s * 0.39;
    final eyeDx = s * 0.085;
    final eyeR = s * 0.046;
    final left = Offset(cx - eyeDx, eyeY);
    final right = Offset(cx + eyeDx, eyeY);

    switch (mood) {
      case MascotMood.idle:
        _drawHalfOpenEye(canvas, left, eyeR, _blinkFactor());
        _drawHalfOpenEye(canvas, right, eyeR, _blinkFactor());
      case MascotMood.happy:
        _drawHappyEye(canvas, left, eyeR);
        _drawHappyEye(canvas, right, eyeR);
      case MascotMood.thinking:
        // 左眼正常向上看，右眼微闭
        _drawOpenEye(canvas, left, eyeR, lookY: -eyeR * 0.18);
        _drawSquintEye(canvas, right, eyeR);
      case MascotMood.sad:
        _drawSadEye(canvas, left, eyeR, browInnerDown: false);
        _drawSadEye(canvas, right, eyeR, browInnerDown: true);
      case MascotMood.celebrate:
        _drawStarEye(canvas, left, eyeR);
        _drawStarEye(canvas, right, eyeR);
      case MascotMood.curious:
        // 左眼略小，右眼放大（好奇）
        _drawOpenEye(canvas, left, eyeR * 0.82, lookY: 0, lookX: eyeR * 0.1);
        _drawOpenEye(canvas, right, eyeR * 1.25, lookY: 0, highlight: true);
    }
  }

  /// 计算眨眼系数（仅 idle 使用），1.0=张开，接近 0=闭眼
  double _blinkFactor() {
    final av = animationValue;
    if (av >= 0.5 && av <= 0.58) {
      final local = (av - 0.5) / 0.08;
      return 1.0 - math.sin(local * math.pi) * 0.9;
    }
    return 1.0;
  }

  void _drawHalfOpenEye(Canvas canvas, Offset c, double r, double blink) {
    final openness = 0.6 * blink;
    canvas.drawOval(
      Rect.fromCenter(center: c, width: r * 2, height: r * 2 * openness),
      _scleraPaint,
    );
    final pupilCenter = c + Offset(0, r * 0.05);
    canvas.drawOval(
      Rect.fromCenter(
        center: pupilCenter,
        width: r * 0.9,
        height: r * 0.9 * openness,
      ),
      _pupilPaint,
    );
    canvas.drawCircle(
      c + Offset(-r * 0.22, -r * 0.12 * openness),
      r * 0.18,
      _scleraPaint,
    );
    // 瞳孔高光点：白色小圆，增强眼神感
    if (openness > 0.3) {
      canvas.drawCircle(
        pupilCenter + Offset(-r * 0.12, -r * 0.08 * openness),
        r * 0.08,
        Paint()..color = _pupilGlint,
      );
    }
  }

  void _drawOpenEye(
    Canvas canvas,
    Offset c,
    double r, {
    double lookX = 0,
    double lookY = 0,
    bool highlight = false,
  }) {
    canvas.drawCircle(c, r, _scleraPaint);
    final pupilCenter = c + Offset(lookX, lookY);
    canvas.drawCircle(pupilCenter, r * 0.5, _pupilPaint);
    if (highlight) {
      canvas.drawCircle(c + Offset(-r * 0.3, -r * 0.3), r * 0.2, _scleraPaint);
    } else {
      canvas.drawCircle(c + Offset(-r * 0.18, -r * 0.18), r * 0.16, _scleraPaint);
    }
    // 瞳孔高光点：白色小圆，固定在瞳孔左上
    canvas.drawCircle(
      pupilCenter + Offset(-r * 0.18, -r * 0.18),
      r * 0.10,
      Paint()..color = _pupilGlint,
    );
  }

  void _drawHappyEye(Canvas canvas, Offset c, double r) {
    // ^_^：向上凸起的弧（caret 形）
    final path = Path()
      ..moveTo(c.dx - r * 0.9, c.dy + r * 0.15)
      ..quadraticBezierTo(c.dx, c.dy - r * 0.7, c.dx + r * 0.9, c.dy + r * 0.15);
    canvas.drawPath(path, _stroke(_pupilColor, r * 0.34));
  }

  void _drawSquintEye(Canvas canvas, Offset c, double r) {
    // 微闭：扁椭圆 + 细缝
    canvas.drawOval(
      Rect.fromCenter(center: c, width: r * 1.7, height: r * 0.45),
      _scleraPaint,
    );
    canvas.drawOval(
      Rect.fromCenter(center: c, width: r * 0.8, height: r * 0.4),
      _pupilPaint,
    );
    // 瞳孔高光点：细缝中透出的小亮点
    canvas.drawCircle(
      c + Offset(-r * 0.18, -r * 0.06),
      r * 0.07,
      Paint()..color = _pupilGlint,
    );
  }

  void _drawSadEye(
    Canvas canvas,
    Offset c,
    double r, {
    required bool browInnerDown,
  }) {
    canvas.drawCircle(c, r, _scleraPaint);
    // 瞳孔下垂
    final pupilCenter = c + Offset(0, r * 0.22);
    canvas.drawCircle(pupilCenter, r * 0.45, _pupilPaint);
    // 下垂的上眼睑（粗弧覆盖上方）
    final lidRect = Rect.fromCircle(center: c + Offset(0, r * 0.1), radius: r * 1.05);
    canvas.drawArc(lidRect, math.pi, math.pi, false, _stroke(_pupilColor, r * 0.26));
    // 瞳孔高光点：保留一丝神采
    canvas.drawCircle(
      pupilCenter + Offset(-r * 0.14, -r * 0.12),
      r * 0.08,
      Paint()..color = _pupilGlint,
    );
    // 难过眉毛（内侧低、外侧高）
    final brow = _stroke(_pupilColor, r * 0.22);
    if (browInnerDown) {
      canvas.drawLine(c + Offset(-r * 0.9, -r * 0.85), c + Offset(r * 0.7, -r * 1.25), brow);
    } else {
      canvas.drawLine(c + Offset(-r * 0.7, -r * 1.25), c + Offset(r * 0.9, -r * 0.85), brow);
    }
  }

  void _drawStarEye(Canvas canvas, Offset c, double r) {
    canvas.drawPath(_starPath(c, r * 0.95, r * 0.4), _starFillPaint);
    canvas.drawCircle(c, r * 0.18, _scleraPaint);
  }

  // ============ 嘴巴（按情绪区分）============
  void _drawMouth(Canvas canvas, double s, double cx) {
    final center = Offset(cx, s * 0.5);
    switch (mood) {
      case MascotMood.idle:
        // 轻微微笑
        canvas.drawArc(
          Rect.fromCenter(center: center, width: s * 0.10, height: s * 0.08),
          0,
          math.pi,
          false,
          _stroke(_mouthColor, s * 0.012),
        );
      case MascotMood.happy:
        _drawOpenSmile(canvas, s, cx, Offset(cx, s * 0.51), s * 0.14, s * 0.10, true);
      case MascotMood.thinking:
        // "o" 小圆嘴
        canvas.drawOval(
          Rect.fromCenter(center: Offset(cx, s * 0.52), width: s * 0.04, height: s * 0.05),
          _mouthFillPaint,
        );
      case MascotMood.sad:
        // 倒弧（皱嘴）
        canvas.drawArc(
          Rect.fromCenter(center: Offset(cx, s * 0.53), width: s * 0.10, height: s * 0.08),
          math.pi,
          math.pi,
          false,
          _stroke(_mouthColor, s * 0.012),
        );
      case MascotMood.celebrate:
        _drawOpenSmile(canvas, s, cx, Offset(cx, s * 0.51), s * 0.17, s * 0.12, true);
      case MascotMood.curious:
        // "?" 形小嘴
        _drawQuestionMark(canvas, Offset(cx, s * 0.50), s * 0.05, _mouthColor);
    }
  }

  void _drawOpenSmile(
    Canvas canvas,
    double s,
    double cx,
    Offset center,
    double w,
    double h,
    bool withTongue,
  ) {
    final rect = Rect.fromCenter(center: center, width: w, height: h);
    final path = Path()..addArc(rect, 0, math.pi)..close();
    canvas.drawPath(path, _mouthFillPaint);
    if (withTongue) {
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(cx, center.dy + h * 0.35),
          width: w * 0.4,
          height: h * 0.35,
        ),
        _tonguePaint,
      );
    }
  }

  // ============ 面部/头顶附加元素（泪滴、放大镜、问号）============
  void _drawFaceExtras(Canvas canvas, double s, double cx) {
    switch (mood) {
      case MascotMood.sad:
        // 泪滴沿脸颊滑落：从眼睛（s*0.40）到下颌（s*0.62）
        // 一个动画周期内完成一次滑落（2 倍速循环）
        final dripProgress = (animationValue * 2) % 1.0;
        final startY = s * 0.40;
        final endY = s * 0.62;
        final tearY = startY + (endY - startY) * dripProgress;
        // 透明度：sin 曲线，开始淡入，结束淡出
        final tearAlpha = math.sin(dripProgress * math.pi).clamp(0.0, 1.0);
        // 大小：下落时略微积聚变大
        final tearR = s * 0.016 * (0.85 + 0.3 * dripProgress);
        _drawTeardrop(
          canvas,
          Offset(cx + s * 0.135, tearY),
          tearR,
          alpha: tearAlpha,
        );
      case MascotMood.curious:
        // 右侧放大镜
        _drawMagnifier(canvas, s, cx);
      case MascotMood.thinking:
        // 头顶右侧问号（随头部点头一起移动），轻微浮动呼吸（y 偏移 ±2px ≈ s*0.015）
        final floatY = math.sin(animationValue * 2 * math.pi) * s * 0.015;
        _drawQuestionMark(
          canvas,
          Offset(cx + s * 0.18, s * 0.08 + floatY),
          s * 0.10,
          _starColor,
        );
      default:
        break;
    }
  }

  void _drawTeardrop(Canvas canvas, Offset c, double r, {double alpha = 1.0}) {
    final path = Path()
      ..moveTo(c.dx, c.dy - r * 1.8)
      ..quadraticBezierTo(c.dx + r, c.dy - r * 0.3, c.dx + r * 0.65, c.dy + r * 0.45)
      ..quadraticBezierTo(c.dx, c.dy + r, c.dx - r * 0.65, c.dy + r * 0.45)
      ..quadraticBezierTo(c.dx - r, c.dy - r * 0.3, c.dx, c.dy - r * 1.8)
      ..close();
    final paint = Paint()..color = _rgba(0xFF4FC3F7, alpha);
    canvas.drawPath(path, paint);
    // 高光（随泪滴透明度淡入淡出）
    canvas.drawCircle(
      c + Offset(-r * 0.25, -r * 0.2),
      r * 0.22,
      Paint()..color = _rgba(0xFFFFFF, alpha * 0.85),
    );
  }

  void _drawMagnifier(Canvas canvas, double s, double cx) {
    final lensCenter = Offset(cx + s * 0.145, s * 0.36);
    final lensR = s * 0.05;
    canvas.drawCircle(lensCenter, lensR, _glassPaint);
    canvas.drawCircle(lensCenter, lensR, _stroke(_pupilColor, s * 0.007));
    // 镜片内部高光弧（白色 30% 透明度）
    canvas.drawArc(
      Rect.fromCircle(center: lensCenter, radius: lensR * 0.7),
      math.pi * 1.1,
      math.pi * 0.5,
      false,
      _stroke(_lensGlint, s * 0.006),
    );
    // 镜片边缘光泽反射弧线（白色 30% 透明度，沿边缘外侧模拟玻璃反光）
    canvas.drawArc(
      Rect.fromCircle(center: lensCenter, radius: lensR * 0.95),
      math.pi * 1.3,
      math.pi * 0.35,
      false,
      _stroke(_lensGlint, s * 0.005),
    );
    // 手柄
    canvas.drawLine(
      lensCenter + Offset(lensR * 0.7, lensR * 0.7),
      lensCenter + Offset(lensR * 1.6, lensR * 1.6),
      _stroke(_pupilColor, s * 0.014),
    );
  }

  void _drawQuestionMark(Canvas canvas, Offset c, double scale, Color color) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = scale * 0.28
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    // 弯钩：顶部弧 + 短竖
    final path = Path()
      ..moveTo(c.dx - scale * 0.35, c.dy - scale * 0.2)
      ..cubicTo(
        c.dx - scale * 0.7,
        c.dy - scale * 1.0,
        c.dx + scale * 0.8,
        c.dy - scale * 1.0,
        c.dx + scale * 0.2,
        c.dy - scale * 0.1,
      )
      ..lineTo(c.dx + scale * 0.2, c.dy + scale * 0.35);
    canvas.drawPath(path, paint);
    // 点
    canvas.drawCircle(
      Offset(c.dx + scale * 0.2, c.dy + scale * 0.7),
      scale * 0.13,
      Paint()..color = color,
    );
  }

  // ============ 环绕星光 / 庆祝撒花 ============
  void _drawAmbientStars(Canvas canvas, double s, double cx) {
    final av = animationValue;
    final t = av * 2 * math.pi;
    // 常驻环绕小星星（位置以画布比例给出）
    const ambient = <Offset>[
      Offset(0.12, 0.16),
      Offset(0.88, 0.20),
      Offset(0.06, 0.55),
      Offset(0.94, 0.58),
      Offset(0.22, 0.88),
      Offset(0.78, 0.90),
      Offset(0.50, 0.04),
    ];
    for (var i = 0; i < ambient.length; i++) {
      final p = ambient[i];
      final twinkle = (0.4 + 0.6 * (0.5 + 0.5 * math.sin(t + i * 1.3))).clamp(0.0, 1.0);
      final size = s * (0.012 + 0.006 * math.sin(t + i));
      canvas.drawPath(
        _starPath(Offset(p.dx * s, p.dy * s), size, size * 0.42),
        Paint()..color = _rgba(0xFFFFE082, twinkle),
      );
    }

    // 庆祝撒花
    if (mood == MascotMood.celebrate) {
      final count = extraSparkle ? 16 : 10;
      final palette = <int>[0xFFFFE082, 0xFFFF8A95, 0xFF81D4FA, 0xFFB39DDB, 0xFFFFAB91];
      for (var i = 0; i < count; i++) {
        final angle = (i / count) * 2 * math.pi + av * math.pi;
        final radius = s * (0.38 + 0.08 * math.sin(t + i));
        final px = cx + math.cos(angle) * radius;
        final py = s * 0.5 + math.sin(angle) * radius * 0.85;
        final size = s * (0.016 + 0.008 * ((i % 3) / 3));
        final alpha = (0.6 + 0.4 * math.sin(t * 1.5 + i)).clamp(0.2, 1.0);
        canvas.drawPath(
          _starPath(Offset(px, py), size, size * 0.42, rotation: angle),
          Paint()..color = _rgba(palette[i % palette.length], alpha),
        );
      }

      // 辐射粒子拖尾：从中心向外辐射，带轨迹拖尾（10 个粒子，每个 4 段拖尾）
      const radialCount = 10;
      const trailSegments = 4;
      const maxRadiusRatio = 0.42;
      const radialPalette = <int>[0xFFFFE082, 0xFFFF8A95, 0xFF81D4FA, 0xFFB39DDB];
      for (var i = 0; i < radialCount; i++) {
        final baseAngle = (i / radialCount) * 2 * math.pi + av * 0.5;
        // 每个粒子的进度（0→1 循环），相位错开形成连续辐射
        final phase = (av + i / radialCount) % 1.0;
        for (var j = 0; j < trailSegments; j++) {
          final trailPhase = (phase - j * 0.05).clamp(0.0, 1.0);
          final radius = s * maxRadiusRatio * trailPhase;
          final px = cx + math.cos(baseAngle) * radius;
          final py = s * 0.45 + math.sin(baseAngle) * radius * 0.9;
          // 头部（j=0）最大最亮，尾部逐段缩小变淡
          final sizeFactor = (1.0 - j * 0.22).clamp(0.1, 1.0);
          final size = s * 0.014 * sizeFactor;
          final alpha = (1.0 - j * 0.22 - trailPhase * 0.2).clamp(0.0, 1.0);
          if (alpha > 0.01 && size > 0.1) {
            canvas.drawPath(
              _starPath(Offset(px, py), size, size * 0.42, rotation: baseAngle),
              Paint()..color = _rgba(radialPalette[i % radialPalette.length], alpha),
            );
          }
        }
      }
    }

    // 彩蛋额外粒子
    if (extraSparkle && mood != MascotMood.celebrate) {
      for (var i = 0; i < 12; i++) {
        final angle = (i / 12) * 2 * math.pi + t * 0.5;
        final radius = s * 0.34;
        final px = cx + math.cos(angle) * radius;
        final py = s * 0.5 + math.sin(angle) * radius;
        final alpha = (0.5 + 0.5 * math.sin(t + i)).clamp(0.2, 1.0);
        canvas.drawPath(
          _starPath(Offset(px, py), s * 0.014, s * 0.006),
          Paint()..color = _rgba(0xFFFFE082, alpha),
        );
      }
    }
  }

  // ============ 工具方法 ============
  /// 构造五角星路径。
  static Path _starPath(
    Offset center,
    double outer,
    double inner, {
    double rotation = -math.pi / 2,
    int points = 5,
  }) {
    final path = Path();
    for (var i = 0; i < points * 2; i++) {
      final r = i.isEven ? outer : inner;
      final a = rotation + i * math.pi / points;
      final p = Offset(center.dx + r * math.cos(a), center.dy + r * math.sin(a));
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }
    path.close();
    return path;
  }

  /// 创建描边 Paint。
  static Paint _stroke(
    Color color,
    double width, {
    StrokeCap cap = StrokeCap.round,
    StrokeJoin join = StrokeJoin.round,
  }) {
    return Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..strokeCap = cap
      ..strokeJoin = join;
  }

  /// 以指定 alpha 构造颜色（避免使用已废弃的 withOpacity）。
  static Color _rgba(int rgb, double alpha) {
    final a = (alpha.clamp(0.0, 1.0) * 255).round();
    return Color((a << 24) | (rgb & 0xFFFFFF));
  }
}
