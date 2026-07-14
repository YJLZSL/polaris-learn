import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/motion/spring_motion.dart';
import 'mascot_controller.dart';
import 'mascot_state.dart';
import 'mascot_widget.dart';

/// 全局吉祥物浮层。
///
/// 包裹子页面，当吉祥物处于非 idle 状态时在右下角悬浮显示小尺寸"小犀"，
/// 使用 SpringScale 实现弹出/收回动画，避免生硬的出现/消失。
class MascotOverlay extends ConsumerWidget {
  const MascotOverlay({super.key, required this.child});

  /// 子页面
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mascotState = ref.watch(mascotControllerProvider);
    final show = mascotState.mood != MascotMood.idle;

    return Stack(
      children: [
        child,
        Positioned(
          bottom: 96,
          right: 20,
          child: AnimatedSwitcher(
            duration: SpringMotion.gentleDuration,
            switchInCurve: SpringMotion.bouncyCurve,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, animation) {
              return ScaleTransition(
                scale: Tween<double>(begin: 0.3, end: 1.0).animate(animation),
                alignment: Alignment.bottomRight,
                child: FadeTransition(
                  opacity: animation,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0.2, 0.2),
                      end: Offset.zero,
                    ).animate(animation),
                    child: child,
                  ),
                ),
              );
            },
            child: show
                ? _FloatingMascot(
                    key: ValueKey(mascotState.mood),
                    mood: mascotState.mood,
                  )
                : const SizedBox.shrink(key: ValueKey('empty')),
          ),
        ),
      ],
    );
  }
}

class _FloatingMascot extends StatefulWidget {
  const _FloatingMascot({super.key, required this.mood});
  final MascotMood mood;

  @override
  State<_FloatingMascot> createState() => _FloatingMascotState();
}

class _FloatingMascotState extends State<_FloatingMascot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _float;

  @override
  void initState() {
    super.initState();
    _float = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _float.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _float,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -4 * _float.value),
          child: child,
        );
      },
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: MascotWidget(
          size: 72,
          mood: widget.mood,
          enableTapInteraction: true,
          showAura: true,
        ),
      ),
    );
  }
}
