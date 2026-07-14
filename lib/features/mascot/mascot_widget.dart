import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/motion/animation_utils.dart';
import '../../core/motion/spring_motion.dart';
import 'mascot_controller.dart';
import 'mascot_painter.dart';
import 'mascot_state.dart';

/// 吉祥物"小犀"展示组件。
///
/// 内部维护 [AnimationController] 驱动 [MascotPainter] 的动画进度，
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

  /// 情绪切换过渡进度（0→1，使用弹簧曲线）
  double _moodTransition = 1.0;

  @override
  void initState() {
    super.initState();
    _currentMood = widget.mood ?? MascotMood.idle;
    _controller = AnimationController(
      vsync: this,
      duration: _durationFor(_currentMood),
    )..repeat();
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
            painter: MascotPainter(
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
          // 背后光晕
          Positioned.fill(
            child: _AuraGlow(size: widget.size, mood: _currentMood),
          ),
          customPaint,
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

    return customPaint;
  }
}

/// 吉祥物背后的柔和光晕
class _AuraGlow extends StatefulWidget {
  const _AuraGlow({required this.size, required this.mood});

  final double size;
  final MascotMood mood;

  @override
  State<_AuraGlow> createState() => _AuraGlowState();
}

class _AuraGlowState extends State<_AuraGlow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breath;

  @override
  void initState() {
    super.initState();
    _breath = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  Color _auraColorFor(MascotMood mood) {
    return switch (mood) {
      MascotMood.thinking => const Color(0xFF7C4DFF),
      MascotMood.happy => const Color(0xFFFFB74D),
      MascotMood.celebrate => const Color(0xFFFF4081),
      MascotMood.sad => const Color(0xFF90A4AE),
      MascotMood.curious => const Color(0xFF4FC3F7),
      MascotMood.idle => const Color(0xFFB39DDB),
    };
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _breath,
      builder: (context, _) {
        final scale = 0.95 + 0.08 * _breath.value;
        final alpha = 0.12 + 0.06 * _breath.value;
        return Transform.scale(
          scale: scale,
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  _auraColorFor(widget.mood).withValues(alpha: alpha),
                  _auraColorFor(widget.mood).withValues(alpha: 0),
                ],
                stops: const [0.4, 1.0],
              ),
            ),
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
