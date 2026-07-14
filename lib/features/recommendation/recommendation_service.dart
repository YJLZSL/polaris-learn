import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/providers/course_providers.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';

/// 学习推荐项。
class LearningRecommendation {
  const LearningRecommendation({
    required this.type,
    required this.title,
    required this.subtitle,
    required this.courseId,
    this.lessonId,
    this.knowledgePointId,
    this.priority = 0,
  });

  /// 推荐类型。
  final RecommendationType type;

  /// 推荐标题。
  final String title;

  /// 推荐副标题/描述。
  final String subtitle;

  /// 关联课程 ID。
  final String courseId;

  /// 关联课时 ID（可选）。
  final String? lessonId;

  /// 关联知识点 ID（可选）。
  final String? knowledgePointId;

  /// 优先级（数值越大越靠前）。
  final int priority;
}

/// 推荐类型。
enum RecommendationType {
  /// 继续上次未完成的学习。
  continuelearning,

  /// 推荐下一个课时。
  nextLesson,

  /// 推荐复习已完成的知识点。
  review,

  /// 推荐新课程。
  newCourse,
}

/// 学习推荐引擎。
///
/// 基于规则的本地推荐逻辑（不依赖 ML），根据用户的学习进度、
/// 完成率和课程结构生成个性化学习推荐。
class RecommendationService {
  RecommendationService(this._progressRepo);

  final ProgressRepository _progressRepo;

  /// 生成推荐列表（最多返回 5 项）。
  Future<List<LearningRecommendation>> getRecommendations(
    List<Course> courses,
  ) async {
    final recommendations = <LearningRecommendation>[];

    for (final course in courses) {
      final completionRate = await _progressRepo.getCompletionRate(course.id);

      if (completionRate == 0.0) {
        // 未开始的课程：推荐开始学习
        recommendations.add(LearningRecommendation(
          type: RecommendationType.newCourse,
          title: '开始学习：${course.title}',
          subtitle: _getLevelLabel(course.level),
          courseId: course.id,
          priority: _getNewCoursePriority(course.level),
        ));
      } else if (completionRate < 1.0) {
        // 进行中的课程：找到下一个未完成的知识点
        final nextPoint = await _findNextIncompletePoint(course);
        if (nextPoint != null) {
          recommendations.add(LearningRecommendation(
            type: RecommendationType.continuelearning,
            title: '继续学习：${nextPoint.title}',
            subtitle: '${course.title} · ${(completionRate * 100).round()}% 完成',
            courseId: course.id,
            lessonId: nextPoint.lessonId,
            knowledgePointId: nextPoint.id,
            priority: 100, // 进行中的优先级最高
          ));
        }
      } else {
        // 已完成的课程：推荐复习
        recommendations.add(LearningRecommendation(
          type: RecommendationType.review,
          title: '复习：${course.title}',
          subtitle: '已完成，定期复习巩固知识',
          courseId: course.id,
          priority: 10,
        ));
      }
    }

    // 按优先级排序，取前 5 条
    recommendations.sort((a, b) => b.priority.compareTo(a.priority));
    return recommendations.take(5).toList();
  }

  /// 获取"继续学习"的第一个推荐项（用于首页 CTA）。
  Future<LearningRecommendation?> getContinueLearningRecommendation(
    List<Course> courses,
  ) async {
    for (final course in courses) {
      final completionRate = await _progressRepo.getCompletionRate(course.id);
      if (completionRate > 0.0 && completionRate < 1.0) {
        final nextPoint = await _findNextIncompletePoint(course);
        if (nextPoint != null) {
          return LearningRecommendation(
            type: RecommendationType.continuelearning,
            title: nextPoint.title,
            subtitle: '${course.title} · ${(completionRate * 100).round()}%',
            courseId: course.id,
            lessonId: nextPoint.lessonId,
            knowledgePointId: nextPoint.id,
          );
        }
      }
    }
    return null;
  }

  /// 查找课程中下一个未完成的知识点。
  Future<KnowledgePoint?> _findNextIncompletePoint(Course course) async {
    for (final module in course.modules) {
      for (final lesson in module.lessons) {
        for (final kp in lesson.knowledgePoints) {
          final progress = await _progressRepo.getKnowledgePointProgress(
            course.id,
            lesson.id,
            kp.id,
          );
          if (progress == null || progress.status != 'completed') {
            return kp;
          }
        }
      }
    }
    return null;
  }

  /// 根据课程级别返回新课程推荐优先级。
  int _getNewCoursePriority(CourseLevel level) {
    switch (level) {
      case CourseLevel.l0:
        return 80;
      case CourseLevel.l1:
        return 60;
      case CourseLevel.l2:
        return 40;
      case CourseLevel.l3:
        return 20;
      case CourseLevel.l4:
        return 10;
    }
  }

  String _getLevelLabel(CourseLevel level) {
    switch (level) {
      case CourseLevel.l0:
        return 'L0 入门 · 推荐新手开始';
      case CourseLevel.l1:
        return 'L1 进阶 · 有基础后学习';
      case CourseLevel.l2:
        return 'L2 应用 · AI 概念与实践';
      case CourseLevel.l3:
        return 'L3 实践 · AI 应用开发';
      case CourseLevel.l4:
        return 'L4 高阶 · 系统设计';
    }
  }
}

/// 推荐服务 Provider。
final recommendationServiceProvider = Provider<RecommendationService>((ref) {
  return RecommendationService(ref.watch(progressRepositoryProvider));
});

/// 学习推荐列表 Provider。
final learningRecommendationsProvider =
    FutureProvider<List<LearningRecommendation>>((ref) async {
  final service = ref.watch(recommendationServiceProvider);
  final coursesAsync = await ref.watch(allCoursesProvider.future);
  return service.getRecommendations(coursesAsync);
});
