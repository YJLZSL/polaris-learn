import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/providers/course_providers.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/data/repositories/learning_event_repository.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';

/// 复习提醒项。
class ReviewReminder {
  const ReviewReminder({
    required this.knowledgePointId,
    required this.knowledgePointTitle,
    required this.courseId,
    required this.courseTitle,
    required this.lessonId,
    required this.daysSinceLastStudy,
    required this.urgency,
  });

  final String knowledgePointId;
  final String knowledgePointTitle;
  final String courseId;
  final String courseTitle;
  final String lessonId;
  final int daysSinceLastStudy;

  /// 紧迫度（0.0-1.0，越高越需要立即复习）。
  final double urgency;
}

/// 间隔重复服务。
///
/// 基于简化的 Ebbinghaus 遗忘曲线算法（SM-2 变体），
/// 在知识点完成后按 1/3/7/14/30 天间隔触发复习建议。
class SpacedRepetitionService {
  SpacedRepetitionService(this._progressRepo, this._eventRepo);

  final ProgressRepository _progressRepo;
  final LearningEventRepository _eventRepo;

  /// 标准复习间隔（天）。
  static const _reviewIntervals = [1, 3, 7, 14, 30];

  /// 获取今日需要复习的知识点列表。
  Future<List<ReviewReminder>> getTodayReviewList(
    List<Course> courses,
  ) async {
    final reminders = <ReviewReminder>[];
    final now = DateTime.now();

    for (final course in courses) {
      for (final module in course.modules) {
        for (final lesson in module.lessons) {
          for (final kp in lesson.knowledgePoints) {
            final progress = await _progressRepo.getKnowledgePointProgress(
              course.id,
              lesson.id,
              kp.id,
            );

            // 只对已完成的知识点生成复习建议
            if (progress == null || progress.status != 'completed') continue;
            if (progress.completedAt == null) continue;

            // 获取最近一次学习/复习事件
            final lastEvent = await _eventRepo.getLastCompletionEvent(kp.id);
            final lastStudyDate =
                lastEvent?.createdAt ?? progress.completedAt!;
            final daysSince = now.difference(lastStudyDate).inDays;

            // 判断是否到了复习时间
            if (_shouldReview(daysSince)) {
              final urgency = _calculateUrgency(daysSince);
              reminders.add(ReviewReminder(
                knowledgePointId: kp.id,
                knowledgePointTitle: kp.title,
                courseId: course.id,
                courseTitle: course.title,
                lessonId: lesson.id,
                daysSinceLastStudy: daysSince,
                urgency: urgency,
              ));
            }
          }
        }
      }
    }

    // 按紧迫度排序
    reminders.sort((a, b) => b.urgency.compareTo(a.urgency));
    return reminders;
  }

  /// 判断是否应该复习。
  bool _shouldReview(int daysSinceLastStudy) {
    for (final interval in _reviewIntervals) {
      // 在每个复习间隔前后 1 天的窗口内触发
      if ((daysSinceLastStudy - interval).abs() <= 1) {
        return true;
      }
    }
    // 超过 30 天未复习也触发
    return daysSinceLastStudy > 30;
  }

  /// 计算复习紧迫度（0.0-1.0）。
  ///
  /// 基于遗忘曲线：R = e^(-t/S)，其中 t 是时间，S 是记忆强度。
  /// 这里简化为线性衰减模型。
  double _calculateUrgency(int daysSinceLastStudy) {
    if (daysSinceLastStudy <= 1) return 0.9;
    if (daysSinceLastStudy <= 3) return 0.8;
    if (daysSinceLastStudy <= 7) return 0.7;
    if (daysSinceLastStudy <= 14) return 0.5;
    if (daysSinceLastStudy <= 30) return 0.4;
    return 1.0; // 超过 30 天未复习，最高紧迫度
  }
}

/// 间隔重复服务 Provider。
final spacedRepetitionServiceProvider =
    Provider<SpacedRepetitionService>((ref) {
  return SpacedRepetitionService(
    ref.watch(progressRepositoryProvider),
    ref.watch(learningEventRepositoryProvider),
  );
});

/// 今日复习列表 Provider。
final todayReviewListProvider =
    FutureProvider<List<ReviewReminder>>((ref) async {
  final service = ref.watch(spacedRepetitionServiceProvider);
  final courses = await ref.watch(allCoursesProvider.future);
  return service.getTodayReviewList(courses);
});
