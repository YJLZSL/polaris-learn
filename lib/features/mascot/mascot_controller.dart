import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'mascot_state.dart';

/// 吉祥物状态控制器（Riverpod [StateNotifier]）。
///
/// 维护当前 [MascotMood] 与点击计数，提供情绪切换、AI 思考态联动、
/// 彩蛋触发等能力。UI 层通过 [mascotControllerProvider] 订阅状态。
class MascotController extends StateNotifier<MascotState> {
  MascotController() : super(const MascotState());

  /// 直接设定情绪，并标记为动画进行中。
  void setMood(MascotMood mood) {
    state = state.copyWith(mood: mood, isAnimating: true);
  }

  /// 联动 AI 思考态：思考中切换为 [MascotMood.thinking]，否则回到 [MascotMood.idle]。
  void setAiThinking(bool thinking) {
    setMood(thinking ? MascotMood.thinking : MascotMood.idle);
  }

  /// 处理一次点击：
  /// - 2 秒内连续点击 5 次：触发庆祝彩蛋（[MascotMood.celebrate] 持续 3 秒）。
  /// - 否则：切换为 [MascotMood.happy] 持续 1.5 秒后恢复待机。
  void triggerTap() {
    final newCount = state.tapCount + 1;
    if (newCount >= 5) {
      // 触发彩蛋
      setMood(MascotMood.celebrate);
      state = state.copyWith(tapCount: 0);
      // 3 秒后恢复待机
      Future<void>.delayed(const Duration(seconds: 3), () {
        if (mounted) {
          setMood(MascotMood.idle);
        }
      });
    } else {
      state = state.copyWith(tapCount: newCount);
      // 随机切换一个开心表情
      setMood(MascotMood.happy);
      // 1.5 秒后恢复待机
      Future<void>.delayed(const Duration(milliseconds: 1500), () {
        if (mounted && state.mood == MascotMood.happy) {
          setMood(MascotMood.idle);
        }
      });
    }
  }

  /// 触发一次庆祝动画，3 秒后恢复待机。
  void celebrate() {
    setMood(MascotMood.celebrate);
    Future<void>.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        setMood(MascotMood.idle);
      }
    });
  }

  /// 重置为初始待机状态。
  void reset() {
    state = const MascotState();
  }
}

/// 吉祥物全局状态 Provider。
///
/// 在 [ProviderScope] 内单例存活，跨页面共享同一份情绪状态。
final mascotControllerProvider =
    StateNotifierProvider<MascotController, MascotState>(
  (ref) => MascotController(),
);
