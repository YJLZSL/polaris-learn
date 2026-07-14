// ignore_for_file: lines_longer_than_80_lines

import 'package:lingxi_academy/data/models/course_content.dart';

/// 成就事件基类（sealed），用于事件驱动的成就判定。
///
/// 各子类对应一种用户行为，由 [AchievementService.checkAndUnlockByEvent]
/// 统一分发处理。
sealed class AchievementEvent {
  const AchievementEvent();
}

/// 完成一节课事件。
class LessonCompletedEvent extends AchievementEvent {
  const LessonCompletedEvent({
    required this.courseId,
    required this.lessonId,
    this.courseLevel,
  });

  /// 课程 ID
  final String courseId;

  /// 课时 ID
  final String lessonId;

  /// 课程级别（可选）。由调用方从 [Course.level] 传入，
  /// 用于级别相关成就判定；为 null 时跳过级别检查。
  final CourseLevel? courseLevel;
}

/// 通过测验事件。
class QuizPassedEvent extends AchievementEvent {
  const QuizPassedEvent({this.score = 1.0});

  /// 测验得分（0.0 - 1.0）
  final double score;
}

/// 苏格拉底对话事件。
class SocraticDialogEvent extends AchievementEvent {
  const SocraticDialogEvent();
}

/// 保存笔记事件。
class NoteSavedEvent extends AchievementEvent {
  const NoteSavedEvent();
}

/// 探索分级按钮事件。
class LevelExploredEvent extends AchievementEvent {
  const LevelExploredEvent({required this.levelId});

  /// 探索的级别标识（simplify / deeper / image）
  final String levelId;
}

/// 预定义成就徽章定义。
class AchievementDefinition {
  const AchievementDefinition({
    required this.code,
    required this.name,
    required this.description,
    required this.icon,
  });

  /// 唯一标识码
  final String code;

  /// 徽章名称
  final String name;

  /// 徽章描述
  final String description;

  /// 图标 emoji
  final String icon;
}

/// 全部预定义成就徽章集合。
class AchievementDefinitions {
  const AchievementDefinitions._();

  /// 完成第一节课
  static const firstLesson = AchievementDefinition(
    code: 'first_lesson',
    name: '初探学院',
    description: '完成第一节课',
    icon: '🎓',
  );

  /// 通过第一个测验
  static const firstQuizPass = AchievementDefinition(
    code: 'first_quiz_pass',
    name: '满分之心',
    description: '通过第一个测验',
    icon: '✅',
  );

  /// 连续学习 7 天
  static const streak7 = AchievementDefinition(
    code: 'streak_7',
    name: '一周不辍',
    description: '连续学习 7 天',
    icon: '🔥',
  );

  /// 连续学习 30 天
  static const streak30 = AchievementDefinition(
    code: 'streak_30',
    name: '月度坚持',
    description: '连续学习 30 天',
    icon: '🌙',
  );

  /// 苏格拉底对话 100 次
  static const socratic100 = AchievementDefinition(
    code: 'socratic_100',
    name: '思辨大师',
    description: '苏格拉底对话 100 次',
    icon: '🦉',
  );

  /// 完成 L0 课程
  static const courseL0Complete = AchievementDefinition(
    code: 'course_l0_complete',
    name: '启程者',
    description: '完成 L0 课程',
    icon: '🚀',
  );

  /// 保存 50 条笔记
  static const notes50 = AchievementDefinition(
    code: 'notes_50',
    name: '笔记达人',
    description: '保存 50 条笔记',
    icon: '📝',
  );

  /// 探索所有分级按钮
  static const allLevelsExplore = AchievementDefinition(
    code: 'all_levels_explore',
    name: '深度探索',
    description: '探索所有分级按钮',
    icon: '🔬',
  );

  /// 全部徽章列表（顺序即展示顺序）
  static const List<AchievementDefinition> all = [
    firstLesson,
    firstQuizPass,
    streak7,
    streak30,
    socratic100,
    courseL0Complete,
    notes50,
    allLevelsExplore,
  ];

  /// 按 code 查找定义
  static AchievementDefinition? byCode(String code) {
    for (final def in all) {
      if (def.code == code) return def;
    }
    return null;
  }
}
