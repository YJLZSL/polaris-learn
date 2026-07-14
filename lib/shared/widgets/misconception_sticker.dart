import 'package:flutter/material.dart';

import '../../core/motion/animation_utils.dart';
import '../../core/motion/spring_motion.dart';
import '../../core/theme/lingxi_colors.dart';
import '../../core/theme/shape_variants.dart';

/// 常见误解贴纸组件。
///
/// 以红色左边框 + 浅红背景的贴纸形式展示 AI 标注的常见误解内容，
/// 配合 [MisconceptionParser] 解析出的误解文本使用。
/// 入场时红色边条从 0 宽度展开，warning 图标持续微摇。
class MisconceptionSticker extends StatefulWidget {
  const MisconceptionSticker({
    super.key,
    required this.misconception,
  });

  /// 误解内容文本。
  final String misconception;

  @override
  State<MisconceptionSticker> createState() => _MisconceptionStickerState();
}

class _MisconceptionStickerState extends State<MisconceptionSticker>
    with SingleTickerProviderStateMixin {
  bool _visible = false;
  late final AnimationController _wiggleController;
  late final Animation<double> _wiggle;

  @override
  void initState() {
    super.initState();
    // 入场动画
    if (!AnimationUtils.platformReduceMotion) {
      Future.delayed(const Duration(milliseconds: 100), () {
        if (mounted) setState(() => _visible = true);
      });
    } else {
      _visible = true;
    }
    // 图标微摇动画（4s 周期）
    _wiggleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4000),
    );
    _wiggle = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 0.05).chain(CurveTween(curve: Curves.easeInOut)), weight: 5),
      TweenSequenceItem(tween: Tween(begin: 0.05, end: -0.05).chain(CurveTween(curve: Curves.easeInOut)), weight: 10),
      TweenSequenceItem(tween: Tween(begin: -0.05, end: 0.0).chain(CurveTween(curve: Curves.easeInOut)), weight: 5),
      TweenSequenceItem(tween: ConstantTween(0.0), weight: 80),
    ]).animate(_wiggleController);
    _wiggleController.repeat();
  }

  @override
  void dispose() {
    _wiggleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final lingxi = theme.extension<LingxiColors>() ?? LingxiColors.light;
    final redColor = lingxi.misconceptionRed;
    final borderRadius = ShapeVariants.roundedMedium.borderRadius;

    return AnimatedOpacity(
      opacity: _visible ? 1.0 : 0.0,
      duration: SpringMotion.defaultDuration,
      curve: SpringMotion.entranceCurve,
      child: ClipRRect(
        borderRadius: borderRadius,
        child: Container(
          color: redColor.withValues(alpha: 0.1),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 红色左边条：从 0 宽度展开
                AnimatedContainer(
                  duration: SpringMotion.defaultDuration,
                  curve: SpringMotion.entranceCurve,
                  width: _visible || reduceMotion ? 3.0 : 0.0,
                  color: redColor,
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 微摇图标
                        if (reduceMotion)
                          Icon(
                            Icons.warning_amber_rounded,
                            color: redColor,
                            size: 20,
                          )
                        else
                          AnimatedBuilder(
                            animation: _wiggle,
                            builder: (context, child) => Transform.rotate(
                              angle: _wiggle.value,
                              child: child,
                            ),
                            child: Icon(
                              Icons.warning_amber_rounded,
                              color: redColor,
                              size: 20,
                            ),
                          ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: AnimatedOpacity(
                            opacity: _visible ? 1.0 : 0.0,
                            duration: SpringMotion.defaultDuration,
                            curve: SpringMotion.entranceCurve,
                            child: Text(
                              '常见误解：${widget.misconception}',
                              style: theme.textTheme.bodyMedium
                                  ?.copyWith(color: redColor),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
