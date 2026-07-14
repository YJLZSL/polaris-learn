import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'mascot_state.dart';

/// 吉祥物"小犀"矢量绘制器。
///
/// 使用 [CustomPainter] + 纯矢量 API（[Path]/[drawCircle]/[drawOval]/
/// [drawArc]）绘制一只萌系圆润的星空小犀牛。6 种 [MascotMood] 通过不同的
/// 五官与动作参数区分；[animationValue] 驱动整体浮动/跳跃/旋转等动画偏移。
///
/// 设计要点：
/// - 大头小身体的萌系比例（头部约占整体 60%）。
/// - 主体灰紫色渐变（#7C4DFF → #B39DDB），学士帽黑色，翅膀半透明白色。
/// - 矢量路径绘制，三端像素级一致，缩放不糊。
/// - 实色 [Paint] 缓存为静态字段，渐变/描边按需创建，控制每帧分配数量。
class MascotPainter extends CustomPainter {
  const MascotPainter({
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
  static const Color _bodyTop = Color(0xFF7C4DFF);
  static const Color _bodyBottom = Color(0xFFB39DDB);
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
  bool shouldRepaint(covariant MascotPainter old) {
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

  // ============ 身体 ============
  void _drawBody(Canvas canvas, double s, double cx) {
    final center = Offset(cx, s * 0.74);
    final rx = s * 0.19;
    final ry = s * 0.14;
    final rect = Rect.fromCenter(center: center, width: rx * 2, height: ry * 2);
    final shader = const LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [_bodyTop, _bodyBottom],
    ).createShader(rect);
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
    final shader = const LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [_bodyTop, _bodyBottom],
    ).createShader(rect);
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
    canvas.drawOval(
      Rect.fromCenter(
        center: c + Offset(0, r * 0.05),
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
    canvas.drawCircle(c + Offset(lookX, lookY), r * 0.5, _pupilPaint);
    if (highlight) {
      canvas.drawCircle(c + Offset(-r * 0.3, -r * 0.3), r * 0.2, _scleraPaint);
    } else {
      canvas.drawCircle(c + Offset(-r * 0.18, -r * 0.18), r * 0.16, _scleraPaint);
    }
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
  }

  void _drawSadEye(
    Canvas canvas,
    Offset c,
    double r, {
    required bool browInnerDown,
  }) {
    canvas.drawCircle(c, r, _scleraPaint);
    // 瞳孔下垂
    canvas.drawCircle(c + Offset(0, r * 0.22), r * 0.45, _pupilPaint);
    // 下垂的上眼睑（粗弧覆盖上方）
    final lidRect = Rect.fromCircle(center: c + Offset(0, r * 0.1), radius: r * 1.05);
    canvas.drawArc(lidRect, math.pi, math.pi, false, _stroke(_pupilColor, r * 0.26));
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
        // 右眼外角泪滴，缓慢下滴
        final drip = (animationValue * 2 * math.pi);
        final dy = (math.sin(drip) * 0.5 + 0.5) * s * 0.04;
        _drawTeardrop(canvas, Offset(cx + s * 0.135, s * 0.40 + dy), s * 0.018);
      case MascotMood.curious:
        // 右侧放大镜
        _drawMagnifier(canvas, s, cx);
      case MascotMood.thinking:
        // 头顶右侧问号（随头部点头一起移动）
        _drawQuestionMark(canvas, Offset(cx + s * 0.18, s * 0.08), s * 0.10, _starColor);
      default:
        break;
    }
  }

  void _drawTeardrop(Canvas canvas, Offset c, double r) {
    final path = Path()
      ..moveTo(c.dx, c.dy - r * 1.8)
      ..quadraticBezierTo(c.dx + r, c.dy - r * 0.3, c.dx + r * 0.65, c.dy + r * 0.45)
      ..quadraticBezierTo(c.dx, c.dy + r, c.dx - r * 0.65, c.dy + r * 0.45)
      ..quadraticBezierTo(c.dx - r, c.dy - r * 0.3, c.dx, c.dy - r * 1.8)
      ..close();
    final paint = Paint()..color = const Color(0xFF4FC3F7);
    canvas.drawPath(path, paint);
    // 高光
    canvas.drawCircle(c + Offset(-r * 0.25, -r * 0.2), r * 0.22, _scleraPaint);
  }

  void _drawMagnifier(Canvas canvas, double s, double cx) {
    final lensCenter = Offset(cx + s * 0.145, s * 0.36);
    final lensR = s * 0.05;
    canvas.drawCircle(lensCenter, lensR, _glassPaint);
    canvas.drawCircle(lensCenter, lensR, _stroke(_pupilColor, s * 0.007));
    // 镜片高光
    canvas.drawArc(
      Rect.fromCircle(center: lensCenter, radius: lensR * 0.7),
      math.pi * 1.1,
      math.pi * 0.5,
      false,
      _stroke(const Color(0xCCFFFFFF), s * 0.006),
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
