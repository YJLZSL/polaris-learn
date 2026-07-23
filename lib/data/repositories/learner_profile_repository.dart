import 'package:drift/drift.dart';
import 'package:lingxi_academy/data/db/database.dart';

/// 学习者画像数据别名。
typedef LearnerProfileEntry = LearnerProfile;

/// 学习者画像仓库：管理用户的学习偏好和个人资料。
///
/// 使用单行表模式（id='default'），确保全局唯一一份画像数据。
class LearnerProfileRepository {
  LearnerProfileRepository(this._db);

  final LingxiDatabase _db;

  /// 获取当前学习者画像，若不存在则创建默认画像。
  Future<LearnerProfileEntry> getProfile() async {
    final query = _db.select(_db.learnerProfiles)
      ..where((t) => t.id.equals('default'));
    final existing = await query.getSingleOrNull();
    if (existing != null) return existing;

    // 初次使用，创建默认画像
    await _db.into(_db.learnerProfiles).insert(
          LearnerProfilesCompanion.insert(),
        );
    return (await query.getSingle());
  }

  /// 更新学习者年龄段。
  Future<void> updateAgeGroup(String ageGroup) async {
    await (_db.update(_db.learnerProfiles)
          ..where((t) => t.id.equals('default')))
        .write(LearnerProfilesCompanion(
      ageGroup: Value(ageGroup),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// 更新编程水平。
  Future<void> updateSkillLevel(String level) async {
    await (_db.update(_db.learnerProfiles)
          ..where((t) => t.id.equals('default')))
        .write(LearnerProfilesCompanion(
      skillLevel: Value(level),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// 更新学习目标。
  Future<void> updateLearningGoal(String goal) async {
    await (_db.update(_db.learnerProfiles)
          ..where((t) => t.id.equals('default')))
        .write(LearnerProfilesCompanion(
      learningGoal: Value(goal),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// 更新每日学习时长。
  Future<void> updateDailyMinutes(int minutes) async {
    await (_db.update(_db.learnerProfiles)
          ..where((t) => t.id.equals('default')))
        .write(LearnerProfilesCompanion(
      dailyMinutes: Value(minutes),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// 更新学习节奏。
  Future<void> updatePace(String pace) async {
    await (_db.update(_db.learnerProfiles)
          ..where((t) => t.id.equals('default')))
        .write(LearnerProfilesCompanion(
      pace: Value(pace),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// 批量更新画像。
  Future<void> updateProfile({
    String? ageGroup,
    String? skillLevel,
    String? learningGoal,
    int? dailyMinutes,
    String? pace,
  }) async {
    await (_db.update(_db.learnerProfiles)
          ..where((t) => t.id.equals('default')))
        .write(LearnerProfilesCompanion(
      ageGroup: ageGroup != null ? Value(ageGroup) : const Value.absent(),
      skillLevel:
          skillLevel != null ? Value(skillLevel) : const Value.absent(),
      learningGoal:
          learningGoal != null ? Value(learningGoal) : const Value.absent(),
      dailyMinutes:
          dailyMinutes != null ? Value(dailyMinutes) : const Value.absent(),
      pace: pace != null ? Value(pace) : const Value.absent(),
      updatedAt: Value(DateTime.now()),
    ));
  }
}
