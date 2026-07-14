import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/motion/animation_utils.dart';
import '../../shared/widgets/particles/particle_painter.dart';

/// 庆祝事件类型
enum CelebrationType {
  /// 彩色纸屑（章节完成、普通成就）
  confetti,

  /// 星光闪烁（解锁徽章、答对题目）
  sparkles,

  /// 烟花（重大成就、连续学习里程碑）
  firework,
}

/// 庆祝事件
class CelebrationEvent {
  const CelebrationEvent({
    required this.origin,
    this.type = CelebrationType.confetti,
    this.particleCount = 24,
    this.colors,
  });

  /// 粒子喷发起点（全局坐标）
  final Offset origin;

  /// 庆祝类型
  final CelebrationType type;

  /// 粒子数量（1-30）
  final int particleCount;

  /// 自定义颜色列表
  final List<Color>? colors;
}

/// 全局庆祝服务
///
/// 通过 StreamController 广播 [CelebrationEvent]，全局 [CelebrationServiceListener]
/// 监听并显示粒子效果。使用 Riverpod Provider 注册。
class CelebrationService {
  CelebrationService._();

  static final CelebrationService instance = CelebrationService._();

  final _controller = StreamController<CelebrationEvent>.broadcast();

  /// 庆祝事件流
  Stream<CelebrationEvent> get events => _controller.stream;

  /// 触发一次庆祝
  void celebrate(CelebrationEvent event) {
    _controller.add(event);
  }

  /// 便捷方法：触发纸屑庆祝
  void confetti(Offset origin, {int count = 24}) {
    celebrate(CelebrationEvent(
      origin: origin,
      type: CelebrationType.confetti,
      particleCount: count,
    ));
  }

  /// 便捷方法：触发星光庆祝
  void sparkles(Offset origin, {int count = 20}) {
    celebrate(CelebrationEvent(
      origin: origin,
      type: CelebrationType.sparkles,
      particleCount: count,
    ));
  }

  /// 便捷方法：触发烟花庆祝
  void firework(Offset origin, {int count = 30}) {
    celebrate(CelebrationEvent(
      origin: origin,
      type: CelebrationType.firework,
      particleCount: count,
    ));
  }

  void dispose() {
    _controller.close();
  }
}

/// 全局庆祝监听器 Widget
///
/// 包裹在 MaterialApp 外层（或 ShellRoute 外层），监听 [CelebrationService.events]
/// 并在 Stack 上层显示粒子系统。
class GlobalCelebrationLayer extends StatefulWidget {
  const GlobalCelebrationLayer({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  State<GlobalCelebrationLayer> createState() => _GlobalCelebrationLayerState();
}

class _GlobalCelebrationLayerState extends State<GlobalCelebrationLayer> {
  final List<_ActiveCelebration> _active = [];
  StreamSubscription<CelebrationEvent>? _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = CelebrationService.instance.events.listen(_onEvent);
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  void _onEvent(CelebrationEvent event) {
    if (!mounted) return;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    if (reduceMotion) return;

    setState(() {
      _active.add(_ActiveCelebration(
        id: DateTime.now().microsecondsSinceEpoch,
        event: event,
      ));
    });
  }

  void _removeCelebration(int id) {
    if (mounted) {
      setState(() => _active.removeWhere((c) => c.id == id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        // 粒子层
        IgnorePointer(
          child: Stack(
            children: [
              for (final active in _active)
                _CelebrationParticleWidget(
                  key: ValueKey(active.id),
                  event: active.event,
                  onComplete: () => _removeCelebration(active.id),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActiveCelebration {
  _ActiveCelebration({required this.id, required this.event});
  final int id;
  final CelebrationEvent event;
}

class _CelebrationParticleWidget extends StatelessWidget {
  const _CelebrationParticleWidget({
    super.key,
    required this.event,
    required this.onComplete,
  });

  final CelebrationEvent event;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final particleType = switch (event.type) {
      CelebrationType.confetti => ParticleEffect.confetti,
      CelebrationType.sparkles => ParticleEffect.sparkles,
      CelebrationType.firework => ParticleEffect.firework,
    };

    return Positioned.fill(
      child: ParticleSystem(
        origin: event.origin,
        particleCount: event.particleCount.clamp(1, 30),
        type: particleType,
        colors: event.colors,
        onComplete: onComplete,
      ),
    );
  }
}
