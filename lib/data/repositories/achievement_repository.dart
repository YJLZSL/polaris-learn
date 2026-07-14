import 'package:drift/drift.dart';
import 'package:lingxi_academy/data/db/database.dart';

/// 成就仓库：封装 [Achievements] 表的查询与解锁操作。
class AchievementRepository {
  AchievementRepository(this._db);

  final LingxiDatabase _db;

  /// 获取全部成就定义，按 id 排序保证展示顺序稳定。
  Future<List<Achievement>> getAllAchievements() {
    final query = _db.select(_db.achievements)
      ..orderBy([(t) => OrderingTerm.asc(t.id)]);
    return query.get();
  }

  /// 监听全部成就流。
  Stream<List<Achievement>> watchAchievements() {
    final query = _db.select(_db.achievements)
      ..orderBy([(t) => OrderingTerm.asc(t.id)]);
    return query.watch();
  }

  /// 解锁指定成就：将 [Achievements.unlocked] 置为 true，
  /// 并记录 [Achievements.unlockedAt]。
  ///
  /// 若成就已解锁则保持原解锁时间不变。
  Future<void> unlockAchievement(String id) async {
    final row = await (_db.select(_db.achievements)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    if (row == null) return;
    if (row.unlocked) return; // 已解锁，避免覆盖原始解锁时间。

    await (_db.update(_db.achievements)
          ..where((t) => t.id.equals(id)))
        .write(AchievementsCompanion(
      unlocked: const Value(true),
      unlockedAt: Value(DateTime.now()),
    ));
  }

  /// 获取所有已解锁的成就。
  Future<List<Achievement>> getUnlockedAchievements() {
    final query = _db.select(_db.achievements)
      ..where((t) => t.unlocked.equals(true))
      ..orderBy([(t) => OrderingTerm.asc(t.unlockedAt)]);
    return query.get();
  }
}
