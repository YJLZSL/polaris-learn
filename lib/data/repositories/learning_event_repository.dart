import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';

/// 学习事件类型常量。
abstract class LearningEventType {
  static const lessonStart = 'lesson_start';
  static const lessonComplete = 'lesson_complete';
  static const quizAttempt = 'quiz_attempt';
  static const quizPass = 'quiz_pass';
  static const socraticTurn = 'socratic_turn';
  static const noteCreate = 'note_create';
  static const reviewComplete = 'review_complete';
}

/// 学习事件仓库：记录和查询学习行为事件。
class LearningEventRepository {
  LearningEventRepository(this._db);

  final LingxiDatabase _db;

  /// 记录一个学习事件。
  Future<void> recordEvent({
    required String eventType,
    String? courseId,
    String? lessonId,
    String? knowledgePointId,
    Map<String, dynamic>? metadata,
    int? durationSeconds,
  }) async {
    await _db.into(_db.learningEvents).insert(
          LearningEventsCompanion.insert(
            eventType: eventType,
            courseId: Value(courseId),
            lessonId: Value(lessonId),
            knowledgePointId: Value(knowledgePointId),
            metadata: Value(jsonEncode(metadata ?? {})),
            durationSeconds: Value(durationSeconds),
          ),
        );
  }

  /// 查询指定知识点的最近完成事件（用于遗忘曲线）。
  Future<LearningEventData?> getLastCompletionEvent(
    String knowledgePointId,
  ) async {
    final query = _db.select(_db.learningEvents)
      ..where((t) =>
          t.knowledgePointId.equals(knowledgePointId) &
          (t.eventType.equals(LearningEventType.lessonComplete) |
              t.eventType.equals(LearningEventType.reviewComplete)))
      ..orderBy([(t) => OrderingTerm.desc(t.createdAt)])
      ..limit(1);
    return query.getSingleOrNull();
  }

  /// 查询今日学习事件数。
  Future<int> getTodayEventCount() async {
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    final query = _db.select(_db.learningEvents)
      ..where((t) => t.createdAt.isBiggerOrEqualValue(startOfDay));
    final results = await query.get();
    return results.length;
  }

  /// 查询指定时间范围内的事件（用于统计）。
  Future<List<LearningEventData>> getEventsBetween(
    DateTime start,
    DateTime end,
  ) async {
    final query = _db.select(_db.learningEvents)
      ..where((t) =>
          t.createdAt.isBiggerOrEqualValue(start) &
          t.createdAt.isSmallerThanValue(end))
      ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]);
    return query.get();
  }

  /// 查询指定课程的苏格拉底对话总轮次。
  Future<int> getSocraticTurnCount(String courseId) async {
    final query = _db.select(_db.learningEvents)
      ..where((t) =>
          t.courseId.equals(courseId) &
          t.eventType.equals(LearningEventType.socraticTurn));
    final results = await query.get();
    return results.length;
  }
}

/// 学习事件仓库 Provider。
final learningEventRepositoryProvider =
    Provider<LearningEventRepository>((ref) {
  return LearningEventRepository(ref.watch(databaseProvider));
});
