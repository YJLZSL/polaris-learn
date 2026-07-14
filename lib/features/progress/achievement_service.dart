// ignore_for_file: lines_longer_than_80_lines

import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/data/repositories/achievement_repository.dart';
import 'package:lingxi_academy/data/repositories/note_repository.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';
import 'package:lingxi_academy/data/repositories/settings_repository.dart';
import 'package:lingxi_academy/features/mascot/mascot_controller.dart';

import 'achievement_definitions.dart';

/// 成就 + 进度的复合视图对象。
///
/// [Achievements] 表无 progress 列，进度通过 [SettingsRepository] 补充存储。
class AchievementWithProgress {
  const AchievementWithProgress({
    required this.achievement,
    required this.progress,
  });

  /// 数据库中的成就记录
  final Achievement achievement;

  /// 进度（0.0 - 1.0），已解锁时固定为 1.0
  final double progress;

  /// 是否已解锁
  bool get unlocked => achievement.unlocked;
}

/// 成就服务：管理徽章解锁、进度更新与事件触发。
///
/// 预定义徽章在首次访问时自动写入 [Achievements] 表（种子化）。
/// 进度数据通过 [SettingsRepository] 键值对存储，键格式为
/// `ach_progress_<code>`。
class AchievementService {
  AchievementService({
    required LingxiDatabase db,
    required AchievementRepository achievementRepo,
    required SettingsRepository settings,
    required MascotController mascot,
    required NoteRepository noteRepo,
    required ProgressRepository progressRepo,
  })  : _db = db,
        _achievementRepo = achievementRepo,
        _settings = settings,
        _mascot = mascot,
        _noteRepo = noteRepo,
        _progressRepo = progressRepo;

  final LingxiDatabase _db;
  final AchievementRepository _achievementRepo;
  final SettingsRepository _settings;
  final MascotController _mascot;
  final NoteRepository _noteRepo;
  final ProgressRepository _progressRepo;

  /// Settings 中苏格拉底对话计数键。
  static const _keySocraticCount = 'count_socratic';

  /// Settings 中已探索级别列表键。
  static const _keyLevelsExplored = 'levels_explored';

  /// 种子化标记键。
  static const _keySeeded = 'achievements_seeded';

  bool _seeded = false;

  /// 确保预定义徽章已写入数据库（幂等）。
  Future<void> _ensureSeeded() async {
    if (_seeded) return;
    final flag = await _settings.getSetting(_keySeeded);
    if (flag == '1') {
      _seeded = true;
      return;
    }
    // 检查是否已有成就记录
    final existing = await _achievementRepo.getAllAchievements();
    final existingIds = existing.map((e) => e.id).toSet();

    for (final def in AchievementDefinitions.all) {
      if (!existingIds.contains(def.code)) {
        await _db.into(_db.achievements).insert(AchievementsCompanion(
              id: Value(def.code),
              name: Value(def.name),
              description: Value(def.description),
              icon: Value(def.icon),
            ));
      }
    }
    await _settings.setSetting(_keySeeded, '1');
    _seeded = true;
  }

  /// 返回全部徽章（已解锁 + 未解锁），附带进度。
  Future<List<AchievementWithProgress>> getAll() async {
    await _ensureSeeded();
    final list = await _achievementRepo.getAllAchievements();
    final result = <AchievementWithProgress>[];
    for (final ach in list) {
      final progress = ach.unlocked
          ? 1.0
          : await _getProgress(ach.id);
      result.add(AchievementWithProgress(
        achievement: ach,
        progress: progress,
      ));
    }
    return result;
  }

  /// 解锁徽章。若已解锁则跳过。解锁后触发吉祥物庆祝。
  Future<void> unlock(String code) async {
    await _ensureSeeded();
    final row = await (_db.select(_db.achievements)
          ..where((t) => t.id.equals(code)))
        .getSingleOrNull();
    if (row == null || row.unlocked) return;

    await _achievementRepo.unlockAchievement(code);
    _mascot.celebrate();
  }

  /// 更新进度（0.0 - 1.0）。progress >= 1 时自动解锁。
  Future<void> updateProgress(String code, double progress) async {
    await _ensureSeeded();
    final clamped = progress.clamp(0.0, 1.0);
    await _settings.setSetting(
      'ach_progress_$code',
      clamped.toStringAsFixed(4),
    );
    if (clamped >= 1.0) {
      await unlock(code);
    }
  }

  /// 根据事件触发成就判定。
  Future<void> checkAndUnlockByEvent(AchievementEvent event) async {
    await _ensureSeeded();
    switch (event) {
      case LessonCompletedEvent(:final courseId, :final courseLevel):
        // 完成第一节课
        await unlock(AchievementDefinitions.firstLesson.code);
        // 检查 L0 课程是否全部完成（仅当课程级别为 L0 时）
        if (courseLevel == CourseLevel.l0) {
          final rate = await _progressRepo.getCompletionRate(courseId);
          if (rate >= 1.0) {
            await unlock(AchievementDefinitions.courseL0Complete.code);
          } else {
            await updateProgress(
              AchievementDefinitions.courseL0Complete.code,
              rate,
            );
          }
        }
      case QuizPassedEvent():
        // 通过第一个测验
        await unlock(AchievementDefinitions.firstQuizPass.code);
      case SocraticDialogEvent():
        // 苏格拉底对话计数
        final count = await _getInt(_keySocraticCount) + 1;
        await _settings.setSetting(_keySocraticCount, count.toString());
        final progress = (count / 100).clamp(0.0, 1.0);
        if (count >= 100) {
          await unlock(AchievementDefinitions.socratic100.code);
        } else {
          await updateProgress(
            AchievementDefinitions.socratic100.code,
            progress,
          );
        }
      case NoteSavedEvent():
        // 笔记达人：50 条
        final notes = await _noteRepo.getAllNotes();
        final count = notes.length;
        final progress = (count / 50).clamp(0.0, 1.0);
        if (count >= 50) {
          await unlock(AchievementDefinitions.notes50.code);
        } else {
          await updateProgress(
            AchievementDefinitions.notes50.code,
            progress,
          );
        }
      case LevelExploredEvent(:final levelId):
        // 深度探索：探索所有分级按钮
        final explored = await _getExploredLevels();
        explored.add(levelId);
        await _settings.setSetting(_keyLevelsExplored, explored.join(','));
        // 三个级别：simplify / deeper / image
        final progress = (explored.length / 3).clamp(0.0, 1.0);
        if (explored.length >= 3) {
          await unlock(AchievementDefinitions.allLevelsExplore.code);
        } else {
          await updateProgress(
            AchievementDefinitions.allLevelsExplore.code,
            progress,
          );
        }
    }
  }

  /// 检查 streak 相关成就（streak_7 / streak_30）。
  ///
  /// 在 [StreakService.recordStudyActivity] 之后调用。
  Future<void> checkStreakAchievements(int currentStreak) async {
    await _ensureSeeded();
    if (currentStreak >= 30) {
      await unlock(AchievementDefinitions.streak30.code);
      await unlock(AchievementDefinitions.streak7.code);
    } else if (currentStreak >= 7) {
      await unlock(AchievementDefinitions.streak7.code);
      await updateProgress(
        AchievementDefinitions.streak30.code,
        currentStreak / 30,
      );
    }
  }

  /// 从 Settings 读取进度值。
  Future<double> _getProgress(String code) async {
    final value = await _settings.getSetting('ach_progress_$code');
    if (value == null) return 0.0;
    return double.tryParse(value) ?? 0.0;
  }

  /// 从 Settings 读取整数值，不存在时返回 0。
  Future<int> _getInt(String key) async {
    final value = await _settings.getSetting(key);
    if (value == null) return 0;
    return int.tryParse(value) ?? 0;
  }

  /// 获取已探索的级别集合。
  Future<Set<String>> _getExploredLevels() async {
    final value = await _settings.getSetting(_keyLevelsExplored);
    if (value == null || value.isEmpty) return {};
    return value.split(',').where((s) => s.isNotEmpty).toSet();
  }
}

/// AchievementService 全局 Provider。
final achievementServiceProvider = Provider<AchievementService>((ref) {
  return AchievementService(
    db: ref.watch(databaseProvider),
    achievementRepo: ref.watch(achievementRepositoryProvider),
    settings: ref.watch(settingsRepositoryProvider),
    mascot: ref.watch(mascotControllerProvider.notifier),
    noteRepo: ref.watch(noteRepositoryProvider),
    progressRepo: ref.watch(progressRepositoryProvider),
  );
});
