// ignore_for_file: lines_longer_than_80_lines

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/repositories/achievement_repository.dart';
import 'package:lingxi_academy/data/repositories/note_repository.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';
import 'package:lingxi_academy/data/repositories/settings_repository.dart';
import 'package:lingxi_academy/features/mascot/mascot_controller.dart';
import 'package:lingxi_academy/features/progress/achievement_definitions.dart';
import 'package:lingxi_academy/features/progress/achievement_service.dart';

/// 创建内存数据库与 AchievementService 实例。
(LingxiDatabase, AchievementService) _setup() {
  final db = LingxiDatabase.forTesting(NativeDatabase.memory());
  final service = AchievementService(
    db: db,
    achievementRepo: AchievementRepository(db),
    settings: SettingsRepository(db),
    mascot: MascotController(),
    noteRepo: NoteRepository(db),
    progressRepo: ProgressRepository(db),
  );
  return (db, service);
}

void main() {
  group('AchievementService', () {
    test('getAll 首次调用时种子化全部预定义徽章', () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      final list = await service.getAll();
      expect(list.length, AchievementDefinitions.all.length);
      // 验证所有徽章初始均为未解锁
      for (final item in list) {
        expect(item.unlocked, isFalse);
        expect(item.progress, 0.0);
      }
    });

    test('unlock 解锁徽章并设置 unlockedAt', () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service.unlock(AchievementDefinitions.firstLesson.code);
      final list = await service.getAll();
      final first = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.firstLesson.code,
      );
      expect(first.unlocked, isTrue);
      expect(first.achievement.unlockedAt, isNotNull);
    });

    test('unlock 幂等：重复解锁不覆盖 unlockedAt', () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service.unlock(AchievementDefinitions.firstLesson.code);
      final list1 = await service.getAll();
      final first1 = list1.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.firstLesson.code,
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));
      await service.unlock(AchievementDefinitions.firstLesson.code);
      final list2 = await service.getAll();
      final first2 = list2.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.firstLesson.code,
      );

      expect(first2.achievement.unlockedAt, first1.achievement.unlockedAt);
    });

    test('updateProgress progress >= 1.0 时自动解锁', () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service.updateProgress(
        AchievementDefinitions.socratic100.code,
        0.5,
      );
      var list = await service.getAll();
      var item = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.socratic100.code,
      );
      expect(item.unlocked, isFalse);
      expect(item.progress, closeTo(0.5, 0.01));

      await service.updateProgress(
        AchievementDefinitions.socratic100.code,
        1.0,
      );
      list = await service.getAll();
      item = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.socratic100.code,
      );
      expect(item.unlocked, isTrue);
    });

    test('checkAndUnlockByEvent LessonCompletedEvent 解锁 first_lesson',
        () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service.checkAndUnlockByEvent(
        const LessonCompletedEvent(courseId: 'c1', lessonId: 'l1'),
      );
      final list = await service.getAll();
      final first = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.firstLesson.code,
      );
      expect(first.unlocked, isTrue);
    });

    test('LessonCompletedEvent L0 全部完成时解锁 course_l0_complete', () async {
      final (db, service) = _setup();
      addTearDown(db.close);
      const courseId = 'l0_python';
      final progressRepo = ProgressRepository(db);
      // 两个知识点全部完成 → 完成率 1.0
      await progressRepo.markCompleted(courseId, 'l1', 'kp1');
      await progressRepo.markCompleted(courseId, 'l1', 'kp2');

      await service.checkAndUnlockByEvent(
        const LessonCompletedEvent(
          courseId: courseId,
          lessonId: 'l1',
          courseLevel: CourseLevel.l0,
        ),
      );
      final list = await service.getAll();
      final item = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.courseL0Complete.code,
      );
      expect(item.unlocked, isTrue);
    });

    test('LessonCompletedEvent L0 部分完成时更新进度但不解锁', () async {
      final (db, service) = _setup();
      addTearDown(db.close);
      const courseId = 'l0_python';
      final progressRepo = ProgressRepository(db);
      // 两个知识点仅完成一个 → 完成率 0.5
      await progressRepo.markCompleted(courseId, 'l1', 'kp1');
      await progressRepo.markInProgress(courseId, 'l1', 'kp2');

      await service.checkAndUnlockByEvent(
        const LessonCompletedEvent(
          courseId: courseId,
          lessonId: 'l1',
          courseLevel: CourseLevel.l0,
        ),
      );
      final list = await service.getAll();
      final item = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.courseL0Complete.code,
      );
      expect(item.unlocked, isFalse);
      expect(item.progress, closeTo(0.5, 0.01));
    });

    test('LessonCompletedEvent L1 级别不解锁 L0 成就', () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service.checkAndUnlockByEvent(
        const LessonCompletedEvent(
          courseId: 'l1_course',
          lessonId: 'l1',
          courseLevel: CourseLevel.l1,
        ),
      );
      final list = await service.getAll();
      final item = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.courseL0Complete.code,
      );
      expect(item.unlocked, isFalse);
      expect(item.progress, 0.0);
    });

    test('LessonCompletedEvent courseLevel 为 null 时跳过级别检查', () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service.checkAndUnlockByEvent(
        const LessonCompletedEvent(courseId: 'c1', lessonId: 'l1'),
      );
      final list = await service.getAll();
      final item = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.courseL0Complete.code,
      );
      expect(item.unlocked, isFalse);
      expect(item.progress, 0.0);
    });

    test('checkAndUnlockByEvent QuizPassedEvent 解锁 first_quiz_pass',
        () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service.checkAndUnlockByEvent(const QuizPassedEvent());
      final list = await service.getAll();
      final item = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.firstQuizPass.code,
      );
      expect(item.unlocked, isTrue);
    });

    test('checkAndUnlockByEvent SocraticDialogEvent 累加计数', () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      // 触发 3 次
      for (var i = 0; i < 3; i++) {
        await service.checkAndUnlockByEvent(const SocraticDialogEvent());
      }
      final list = await service.getAll();
      final item = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.socratic100.code,
      );
      expect(item.unlocked, isFalse);
      expect(item.progress, closeTo(0.03, 0.01));
    });

    test('checkAndUnlockByEvent LevelExploredEvent 三次后解锁', () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service
          .checkAndUnlockByEvent(const LevelExploredEvent(levelId: 'simplify'));
      await service
          .checkAndUnlockByEvent(const LevelExploredEvent(levelId: 'deeper'));

      var list = await service.getAll();
      var item = list.firstWhere(
        (e) =>
            e.achievement.id == AchievementDefinitions.allLevelsExplore.code,
      );
      expect(item.unlocked, isFalse);
      expect(item.progress, closeTo(2 / 3, 0.01));

      await service
          .checkAndUnlockByEvent(const LevelExploredEvent(levelId: 'image'));
      list = await service.getAll();
      item = list.firstWhere(
        (e) =>
            e.achievement.id == AchievementDefinitions.allLevelsExplore.code,
      );
      expect(item.unlocked, isTrue);
    });

    test('checkStreakAchievements streak >= 7 解锁 streak_7', () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service.checkStreakAchievements(7);
      final list = await service.getAll();
      final streak7 = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.streak7.code,
      );
      expect(streak7.unlocked, isTrue);

      final streak30 = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.streak30.code,
      );
      expect(streak30.unlocked, isFalse);
    });

    test('checkStreakAchievements streak >= 30 同时解锁 streak_7 和 streak_30',
        () async {
      final (db, service) = _setup();
      addTearDown(db.close);

      await service.checkStreakAchievements(30);
      final list = await service.getAll();
      final streak7 = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.streak7.code,
      );
      final streak30 = list.firstWhere(
        (e) => e.achievement.id == AchievementDefinitions.streak30.code,
      );
      expect(streak7.unlocked, isTrue);
      expect(streak30.unlocked, isTrue);
    });
  });
}
