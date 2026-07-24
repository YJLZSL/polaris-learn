import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/features/progress/spaced_repetition_service.dart';
import 'package:lingxi_academy/features/recommendation/recommendation_service.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 每日学习计划任务项。
class DailyTask {
  const DailyTask({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.type,
    this.routePath,
    this.isCompleted = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final DailyTaskType type;
  final String? routePath;
  final bool isCompleted;
}

/// 任务类型。
enum DailyTaskType {
  continueLearning,
  review,
  newLesson,
  practice,
  note,
}

/// 每日学习计划 Widget。
///
/// 根据用户的学习画像、进度和复习计划生成个性化每日任务清单。
/// 面向自学能力较弱的用户，提供结构化的学习引导。
class DailyPlanWidget extends ConsumerWidget {
  const DailyPlanWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final recommendationsAsync = ref.watch(learningRecommendationsProvider);
    final reviewsAsync = ref.watch(todayReviewListProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 标题
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            children: [
              Icon(
                Icons.today_rounded,
                size: 20,
                color: colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Text(
                '今日学习计划',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                _getDateString(),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // 任务列表
        _buildTaskList(
          context,
          ref,
          recommendationsAsync,
          reviewsAsync,
          theme,
          colorScheme,
        ),
      ],
    );
  }

  Widget _buildTaskList(
    BuildContext context,
    WidgetRef ref,
    AsyncValue<List<LearningRecommendation>> recommendationsAsync,
    AsyncValue<List<ReviewReminder>> reviewsAsync,
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    final tasks = <DailyTask>[];

    // 从推荐中提取"继续学习"任务
    final recommendations = recommendationsAsync.valueOrNull ?? [];
    for (final rec in recommendations.take(2)) {
      tasks.add(DailyTask(
        icon: rec.type == RecommendationType.continuelearning
            ? Icons.play_circle_outline_rounded
            : Icons.school_outlined,
        title: rec.title,
        subtitle: rec.subtitle,
        type: rec.type == RecommendationType.continuelearning
            ? DailyTaskType.continueLearning
            : DailyTaskType.newLesson,
        routePath: RouteNames.learningPath,
      ));
    }

    // 从复习计划中提取复习任务
    final reviews = reviewsAsync.valueOrNull ?? [];
    if (reviews.isNotEmpty) {
      final topReview = reviews.first;
      tasks.add(DailyTask(
        icon: Icons.refresh_rounded,
        title: '复习：${topReview.knowledgePointTitle}',
        subtitle: '${topReview.courseTitle} · ${topReview.daysSinceLastStudy} 天前学过',
        type: DailyTaskType.review,
        routePath: RouteNames.learningPath,
      ));
    }

    // 添加固定建议任务
    if (tasks.length < 4) {
      tasks.add(const DailyTask(
        icon: Icons.edit_note_rounded,
        title: '整理学习笔记',
        subtitle: '记录今天的学习心得',
        type: DailyTaskType.note,
        routePath: RouteNames.notesPath,
      ));
    }

    if (tasks.isEmpty) {
      return LingxiCard(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(
              Icons.check_circle_outline_rounded,
              size: 40,
              color: colorScheme.primary.withValues(alpha: 0.6),
            ),
            const SizedBox(height: 12),
            Text(
              '今日学习计划已完成！',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        for (var i = 0; i < tasks.length; i++) ...[
          _DailyTaskTile(task: tasks[i], index: i),
          if (i < tasks.length - 1) const SizedBox(height: 8),
        ],
      ],
    );
  }

  String _getDateString() {
    final now = DateTime.now();
    final weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return '${now.month}月${now.day}日 ${weekdays[now.weekday - 1]}';
  }
}

/// 单个任务项 Tile。
class _DailyTaskTile extends StatelessWidget {
  const _DailyTaskTile({
    required this.task,
    required this.index,
  });

  final DailyTask task;
  final int index;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return LingxiCard(
      animateEntrance: true,
      entranceDelay: Duration(milliseconds: 80 * index),
      onTap: task.routePath != null
          ? () {
              AnimationUtils.hapticLight();
              context.go(task.routePath!);
            }
          : null,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          // 序号圆圈
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: task.isCompleted
                  ? colorScheme.primary
                  : colorScheme.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: task.isCompleted
                  ? Icon(Icons.check_rounded,
                      size: 16, color: colorScheme.onPrimary)
                  : Text(
                      '${index + 1}',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 12),
          // 任务图标
          Icon(
            task.icon,
            size: 20,
            color: colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 10),
          // 文本
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.title,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                    decoration: task.isCompleted
                        ? TextDecoration.lineThrough
                        : null,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  task.subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // 箭头
          if (task.routePath != null)
            Icon(
              Icons.chevron_right_rounded,
              size: 18,
              color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
        ],
      ),
    );
  }
}
