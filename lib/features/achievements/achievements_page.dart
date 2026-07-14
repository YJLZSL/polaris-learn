import 'package:flutter/material.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';

import '../home/empty_states/empty_achievements_state.dart';

/// 成就页（简化版占位页）。
///
/// 注：完整的成就徽章墙位于 `features/progress/achievements_page.dart`，
/// 本文件保留为模块入口占位，展示空状态引导。
class AchievementsPage extends StatelessWidget {
  const AchievementsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const LingxiAppBar(title: Text('成就')),
      body: SpringMotion.springTransition(
        beginScale: 0.95,
        beginOffset: const Offset(0, 0.03),
        child: const EmptyAchievementsState(),
      ),
    );
  }
}
