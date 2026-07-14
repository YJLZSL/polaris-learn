import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:lingxi_academy/features/progress/streak_service.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 学习节奏提醒 Widget。
///
/// 基于 Streak 数据，在首页展示个性化鼓励语或适度休息建议。
/// - Streak >= 7 天：持续学习鼓励 + 适度休息提醒
/// - Streak 3-6 天：保持势头鼓励
/// - Streak 1-2 天：刚开始学习的鼓励
/// - Streak 0：温和邀请回归
class LearningPaceReminder extends ConsumerWidget {
  const LearningPaceReminder({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return FutureBuilder<_PaceInfo>(
      future: _getPaceInfo(ref),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();
        final info = snapshot.data!;

        return LingxiCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: info.iconBgColor.withValues(alpha: 0.15),
                  borderRadius: ShapeVariants.roundedMedium.borderRadius,
                ),
                child: Icon(
                  info.icon,
                  color: info.iconBgColor,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      info.title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      info.subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<_PaceInfo> _getPaceInfo(WidgetRef ref) async {
    try {
      final streakService = ref.read(streakServiceProvider);
      final streak = await streakService.getStreak();
      final days = streak.currentStreak;
      return _buildPaceInfo(days);
    } catch (_) {
      return _buildPaceInfo(0);
    }
  }

  _PaceInfo _buildPaceInfo(int streakDays) {
    if (streakDays >= 14) {
      return const _PaceInfo(
        icon: Icons.self_improvement_rounded,
        iconBgColor: Color(0xFF26A69A),
        title: '学习达人！记得适当休息',
        subtitle: '持续学习很棒，但大脑也需要休息来巩固记忆哦',
      );
    }
    if (streakDays >= 7) {
      return const _PaceInfo(
        icon: Icons.local_fire_department_rounded,
        iconBgColor: Color(0xFFFF7043),
        title: '一周连续学习！势不可挡',
        subtitle: '坚持7天以上，你已经养成了良好的学习习惯',
      );
    }
    if (streakDays >= 3) {
      return const _PaceInfo(
        icon: Icons.trending_up_rounded,
        iconBgColor: Color(0xFF66BB6A),
        title: '保持这个节奏！',
        subtitle: '再坚持几天就能养成稳定的学习习惯',
      );
    }
    if (streakDays >= 1) {
      return const _PaceInfo(
        icon: Icons.wb_sunny_rounded,
        iconBgColor: Color(0xFFFFB300),
        title: '今天也在学习，很棒！',
        subtitle: '每天一小步，坚持就会看到进步',
      );
    }
    return const _PaceInfo(
      icon: Icons.waving_hand_rounded,
      iconBgColor: Color(0xFF7C4DFF),
      title: '好久不见，欢迎回来！',
      subtitle: '从上次学的地方继续，重新开始永远不晚',
    );
  }
}

/// 节奏提醒信息。
class _PaceInfo {
  const _PaceInfo({
    required this.icon,
    required this.iconBgColor,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final Color iconBgColor;
  final String title;
  final String subtitle;
}
