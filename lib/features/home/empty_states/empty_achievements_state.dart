import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:lingxi_academy/shared/widgets/empty_state_widget.dart';

/// 无成就空状态。
///
/// 在成就页为空时展示，CTA 跳转到 /learning 去学习。
class EmptyAchievementsState extends StatelessWidget {
  const EmptyAchievementsState({super.key});

  @override
  Widget build(BuildContext context) {
    return EmptyStateWidget(
      mascotMood: MascotMood.happy,
      title: '成就墙空空如也',
      description: '完成课程、连续打卡，解锁专属徽章',
      ctaText: '去学习',
      onCta: () => context.go(RouteNames.learningPath),
    );
  }
}
