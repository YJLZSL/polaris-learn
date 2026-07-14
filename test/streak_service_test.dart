// ignore_for_file: lines_longer_than_80_lines

import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/repositories/settings_repository.dart';
import 'package:lingxi_academy/features/progress/streak_service.dart';

/// 创建内存数据库与 StreakService 实例。
(LingxiDatabase, SettingsRepository, StreakService) _setup() {
  final db = LingxiDatabase.forTesting(NativeDatabase.memory());
  final settings = SettingsRepository(db);
  final service = StreakService(db, settings);
  return (db, settings, service);
}

/// 获取今日日期（仅日期部分）。
DateTime _today() {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day);
}

/// 判断两个日期是否为同一天。
bool _isSameDay(DateTime a, DateTime b) {
  return a.year == b.year && a.month == b.month && a.day == b.day;
}

/// 向 Streaks 表直接插入一条预设记录，用于测试前置状态。
Future<void> _seedStreak(
  LingxiDatabase db, {
  required int dayCount,
  required DateTime? lastStudyDate,
}) async {
  await db.into(db.streaks).insert(StreaksCompanion(
        dayCount: Value(dayCount),
        lastStudyDate: lastStudyDate == null
            ? const Value.absent()
            : Value(lastStudyDate),
      ));
}

/// 向 Settings 表预设 longestStreak 与 totalStudyDays。
Future<void> _seedSettings(
  SettingsRepository settings, {
  required int longest,
  required int totalDays,
}) async {
  await settings.setSetting('streak_longest', longest.toString());
  await settings.setSetting('streak_total_days', totalDays.toString());
}

void main() {
  group('StreakService', () {
    test('getStreak 无记录时创建初始行并返回空数据', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final streak = await service.getStreak();
      expect(streak.currentStreak, 0);
      expect(streak.longestStreak, 0);
      expect(streak.lastStudyDate, isNull);
      expect(streak.totalStudyDays, 0);
    });

    test('recordStudyActivity 首次学习时 currentStreak=1', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 1);
      expect(streak.longestStreak, 1);
      expect(streak.totalStudyDays, 1);
      expect(streak.lastStudyDate, isNotNull);
    });

    test('yesterday → today 连续学习 currentStreak +1', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final yesterday = _today().subtract(const Duration(days: 1));
      await _seedStreak(db, dayCount: 5, lastStudyDate: yesterday);
      await _seedSettings(settings, longest: 5, totalDays: 10);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 6);
      expect(streak.longestStreak, 6);
      expect(streak.totalStudyDays, 11);
    });

    test('lastWeek → today 断档重置 currentStreak=1', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final lastWeek = _today().subtract(const Duration(days: 7));
      await _seedStreak(db, dayCount: 10, lastStudyDate: lastWeek);
      await _seedSettings(settings, longest: 10, totalDays: 20);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 1);
      // longestStreak 保持不变（10 > 1）
      expect(streak.longestStreak, 10);
      expect(streak.totalStudyDays, 21);
    });

    test('同一天重复记录 currentStreak 不变', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final today = _today();
      await _seedStreak(db, dayCount: 3, lastStudyDate: today);
      await _seedSettings(settings, longest: 5, totalDays: 10);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 3);
      expect(streak.longestStreak, 5);
      expect(streak.totalStudyDays, 10);
    });

    test('longestStreak 在 currentStreak 超越时更新', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final yesterday = _today().subtract(const Duration(days: 1));
      await _seedStreak(db, dayCount: 10, lastStudyDate: yesterday);
      await _seedSettings(settings, longest: 8, totalDays: 10);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 11);
      expect(streak.longestStreak, 11);
    });

    test('getCurrentStreakDays 便捷方法返回当前连续天数', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      await service.recordStudyActivity();
      final days = await service.getCurrentStreakDays();
      expect(days, 1);
    });

    test('表中仅保留一行记录', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      await service.recordStudyActivity();
      await service.recordStudyActivity();

      final rows = await db.select(db.streaks).get();
      expect(rows.length, 1);
    });

    test('recordStudyActivity 使用事务保证原子性', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      await service.recordStudyActivity();

      // 事务完成后表中应恰好一行
      final rows = await db.select(db.streaks).get();
      expect(rows.length, 1, reason: '事务后 Streaks 表应恰好一行');

      // currentStreak 与 lastStudyDate 同时更新，而非只更新一半
      final row = rows.single;
      expect(row.dayCount, 1, reason: 'currentStreak 应更新为 1');
      expect(row.lastStudyDate, isNotNull, reason: 'lastStudyDate 应同时更新');
      expect(
        _isSameDay(row.lastStudyDate!, _today()),
        isTrue,
        reason: 'lastStudyDate 应为今日',
      );
    });

    test('recordStudyActivity 事务中 delete+insert 原子执行', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      // 先插入一条预设 streak 记录
      final yesterday = _today().subtract(const Duration(days: 1));
      await _seedStreak(db, dayCount: 5, lastStudyDate: yesterday);
      await _seedSettings(settings, longest: 5, totalDays: 10);

      // 更新前确认只有一行
      var rows = await db.select(db.streaks).get();
      expect(rows.length, 1);

      // 调用 recordStudyActivity 触发事务内 delete + insert
      await service.recordStudyActivity();

      // 更新后仍恰好一行（非 delete 后 insert 前的空表中间态）
      rows = await db.select(db.streaks).get();
      expect(rows.length, 1, reason: '事务后应恰好一行，不应出现空表中间态');

      // 数据完整：currentStreak +1，lastStudyDate 为今日
      final row = rows.single;
      expect(row.dayCount, 6, reason: 'currentStreak 应为 5+1=6');
      expect(
        _isSameDay(row.lastStudyDate!, _today()),
        isTrue,
        reason: 'lastStudyDate 应更新为今日',
      );
    });

    test('recordStudyActivity 在同一天多次调用保持数据一致', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      // 第一次调用：首次学习
      await service.recordStudyActivity();

      // 验证第一次后数据完整
      var rows = await db.select(db.streaks).get();
      expect(rows.length, 1, reason: '第一次调用后应一行');
      expect(rows.single.dayCount, 1);
      expect(rows.single.lastStudyDate, isNotNull);
      expect(_isSameDay(rows.single.lastStudyDate!, _today()), isTrue);

      // 同一天第二次调用：不应改变数据
      await service.recordStudyActivity();

      rows = await db.select(db.streaks).get();
      expect(rows.length, 1, reason: '第二次调用后仍应一行');
      expect(rows.single.dayCount, 1, reason: '同一天 currentStreak 不变');
      expect(rows.single.lastStudyDate, isNotNull);
      expect(
        _isSameDay(rows.single.lastStudyDate!, _today()),
        isTrue,
        reason: 'lastStudyDate 仍为今日',
      );

      // 第三次调用：数据依然一致
      await service.recordStudyActivity();

      rows = await db.select(db.streaks).get();
      expect(rows.length, 1, reason: '第三次调用后仍应一行');
      expect(rows.single.dayCount, 1);
    });
  });
}
