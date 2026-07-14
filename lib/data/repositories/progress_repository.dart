import 'package:drift/drift.dart';
import 'package:lingxi_academy/data/db/database.dart';

/// Drift 生成的 Progress 表数据类为 [ProgressData]（避免与表名冲突）。
/// 这里使用 `ProgressEntry` 别名，对外保持业务语义清晰。
typedef ProgressEntry = ProgressData;

/// 学习进度仓库：封装 [Progress] 表的状态切换与查询。
///
/// 状态机：`not_started` → `in_progress` → `completed`。
class ProgressRepository {
  ProgressRepository(this._db);

  final LingxiDatabase _db;

  /// 获取指定课程下的全部进度记录。
  Future<List<ProgressEntry>> getProgress(String courseId) {
    final query = _db.select(_db.progress)
      ..where((t) => t.courseId.equals(courseId));
    return query.get();
  }

  /// 监听指定课程的进度变化。
  Stream<List<ProgressEntry>> watchProgress(String courseId) {
    final query = _db.select(_db.progress)
      ..where((t) => t.courseId.equals(courseId));
    return query.watch();
  }

  /// 精确查询某个知识点的进度记录。若无记录返回 null。
  Future<ProgressEntry?> getKnowledgePointProgress(
    String courseId,
    String lessonId,
    String knowledgePointId,
  ) {
    final query = _db.select(_db.progress)
      ..where(
        (t) =>
            t.courseId.equals(courseId) &
            t.lessonId.equals(lessonId) &
            t.knowledgePointId.equals(knowledgePointId),
      );
    return query.getSingleOrNull();
  }

  /// 将指定知识点标记为进行中。
  ///
  /// 如果记录不存在则新建；若已存在且状态非 `completed`，则更新为
  /// `in_progress` 并刷新 [Progress.lastStudiedAt]。
  Future<void> markInProgress(
    String courseId,
    String lessonId,
    String knowledgePointId,
  ) async {
    final existing = await getKnowledgePointProgress(
      courseId,
      lessonId,
      knowledgePointId,
    );
    final now = DateTime.now();
    if (existing == null) {
      await _db.into(_db.progress).insert(ProgressCompanion(
            courseId: Value(courseId),
            lessonId: Value(lessonId),
            knowledgePointId: Value(knowledgePointId),
            status: const Value('in_progress'),
            lastStudiedAt: Value(now),
          ));
      return;
    }
    // 已完成的知识点不回退状态。
    if (existing.status == 'completed') return;
    await (_db.update(_db.progress)
          ..where((t) => t.id.equals(existing.id)))
        .write(ProgressCompanion(
      status: const Value('in_progress'),
      lastStudiedAt: Value(now),
    ));
  }

  /// 将指定知识点标记为已完成，并记录得分。
  Future<void> markCompleted(
    String courseId,
    String lessonId,
    String knowledgePointId, {
    double score = 1.0,
  }) async {
    final existing = await getKnowledgePointProgress(
      courseId,
      lessonId,
      knowledgePointId,
    );
    final now = DateTime.now();
    if (existing == null) {
      await _db.into(_db.progress).insert(ProgressCompanion(
            courseId: Value(courseId),
            lessonId: Value(lessonId),
            knowledgePointId: Value(knowledgePointId),
            status: const Value('completed'),
            score: Value(score),
            lastStudiedAt: Value(now),
            completedAt: Value(now),
          ));
      return;
    }
    await (_db.update(_db.progress)
          ..where((t) => t.id.equals(existing.id)))
        .write(ProgressCompanion(
      status: const Value('completed'),
      score: Value(score),
      lastStudiedAt: Value(now),
      completedAt: Value(now),
    ));
  }

  /// 计算指定课程的完成率（0.0 ~ 1.0）。
  ///
  /// 完成率 = 状态为 `completed` 的记录数 / 该课程总记录数。
  /// 若课程尚无任何进度记录，返回 0.0。
  Future<double> getCompletionRate(String courseId) async {
    final rows = await getProgress(courseId);
    if (rows.isEmpty) return 0.0;
    final completed = rows.where((r) => r.status == 'completed').length;
    return completed / rows.length;
  }
}
