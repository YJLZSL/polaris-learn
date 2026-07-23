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

/// 获取今日日期（仅日期部分，本地时区）。
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
  group('StreakService 跨日边界', () {
    test('昨日 23:59 → 今日 00:01 跨日学习 streak +1', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      // 模拟昨夜 23:59 学习：lastStudyDate 设为昨日 23:59
      final yesterdayLate = _today()
          .subtract(const Duration(days: 1))
          .add(const Duration(hours: 23, minutes: 59));
      await _seedStreak(db, dayCount: 4, lastStudyDate: yesterdayLate);
      await _seedSettings(settings, longest: 4, totalDays: 8);

      // 今日（任意时刻，含 00:01）记录学习活动
      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 5, reason: '跨日应 +1');
      expect(streak.totalStudyDays, 9);
      expect(_isSameDay(streak.lastStudyDate!, _today()), isTrue);
    });

    test('同日多次学习 streak 不重复 +1 且 totalStudyDays 不变', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      await _seedStreak(db, dayCount: 3, lastStudyDate: _today());
      await _seedSettings(settings, longest: 5, totalDays: 10);

      final first = await service.recordStudyActivity();
      expect(first.currentStreak, 3);
      expect(first.totalStudyDays, 10);

      final second = await service.recordStudyActivity();
      expect(second.currentStreak, 3, reason: '同日第二次不变');
      expect(second.totalStudyDays, 10);

      final third = await service.recordStudyActivity();
      expect(third.currentStreak, 3);
      expect(third.totalStudyDays, 10);
    });

    test('同日不同时刻（00:01 与 23:59）均视为同一天', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      // 今日凌晨 00:01 学习过
      final earlyToday =
          _today().add(const Duration(minutes: 1));
      await _seedStreak(db, dayCount: 2, lastStudyDate: earlyToday);
      await _seedSettings(settings, longest: 2, totalDays: 5);

      // 今日深夜再次记录
      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 2, reason: '同一天不同时刻不重复 +1');
      expect(streak.totalStudyDays, 5);
    });
  });

  group('StreakService 时区处理', () {
    test('UTC 构造的"今日"被视为同一天（不重复 +1）', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final today = _today();
      // 用 UTC 构造同一日历日期，验证日历字段比较跨时区一致
      final utcToday = DateTime.utc(today.year, today.month, today.day);
      await _seedStreak(db, dayCount: 2, lastStudyDate: utcToday);
      await _seedSettings(settings, longest: 2, totalDays: 5);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 2, reason: 'UTC 今日应视为同一天');
      expect(streak.totalStudyDays, 5);
    });

    test('UTC 构造的"昨日"被视为昨日（streak +1）', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final today = _today();
      final utcYesterday = DateTime.utc(today.year, today.month, today.day)
          .subtract(const Duration(days: 1));
      await _seedStreak(db, dayCount: 6, lastStudyDate: utcYesterday);
      await _seedSettings(settings, longest: 6, totalDays: 12);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 7, reason: 'UTC 昨日应触发 +1');
      expect(streak.totalStudyDays, 13);
    });

    test('日期比较基于日历字段而非绝对时间差', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      // 昨日 23:59 距离今日 00:01 仅 2 分钟，但属于不同日历日 → streak +1
      final yesterdayLate = _today()
          .subtract(const Duration(days: 1))
          .add(const Duration(hours: 23, minutes: 59));
      await _seedStreak(db, dayCount: 1, lastStudyDate: yesterdayLate);
      await _seedSettings(settings, longest: 1, totalDays: 1);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 2,
          reason: '跨日历日即 +1，不受绝对时间差影响');
    });
  });

  group('StreakService 断档与补卡', () {
    test('断学 2 天后 streak 重置为 1（无补卡逻辑）', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      // 前天学习，昨天与今天断档 → gap = 2 天
      final twoDaysAgo = _today().subtract(const Duration(days: 2));
      await _seedStreak(db, dayCount: 7, lastStudyDate: twoDaysAgo);
      await _seedSettings(settings, longest: 7, totalDays: 14);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 1, reason: '断档 2 天重置为 1，无补卡');
      expect(streak.longestStreak, 7, reason: 'longestStreak 保持');
      expect(streak.totalStudyDays, 15);
    });

    test('断学 3 天后 streak 重置为 1', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final threeDaysAgo = _today().subtract(const Duration(days: 3));
      await _seedStreak(db, dayCount: 10, lastStudyDate: threeDaysAgo);
      await _seedSettings(settings, longest: 10, totalDays: 20);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 1, reason: '断档 3 天重置为 1');
      expect(streak.longestStreak, 10);
      expect(streak.totalStudyDays, 21);
    });

    test('断学 7 天后 streak 重置为 1', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final lastWeek = _today().subtract(const Duration(days: 7));
      await _seedStreak(db, dayCount: 15, lastStudyDate: lastWeek);
      await _seedSettings(settings, longest: 15, totalDays: 30);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 1);
      expect(streak.longestStreak, 15);
      expect(streak.totalStudyDays, 31);
    });

    test('恰好昨日学习 streak 连续 +1（断档边界：gap=1 不重置）', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final yesterday = _today().subtract(const Duration(days: 1));
      await _seedStreak(db, dayCount: 5, lastStudyDate: yesterday);
      await _seedSettings(settings, longest: 5, totalDays: 10);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 6, reason: 'gap=1 视为连续，不重置');
    });

    test('断档后 longestStreak 不被新 streak 覆盖', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      final lastWeek = _today().subtract(const Duration(days: 7));
      await _seedStreak(db, dayCount: 20, lastStudyDate: lastWeek);
      await _seedSettings(settings, longest: 20, totalDays: 30);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 1);
      expect(streak.longestStreak, 20, reason: '历史最长保留');
    });

    test('断档后重新连续：重置为 1 → 次日 +1 → 第 3 日 +1', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      // 断档后首次学习 → streak=1
      final lastWeek = _today().subtract(const Duration(days: 7));
      await _seedStreak(db, dayCount: 20, lastStudyDate: lastWeek);
      await _seedSettings(settings, longest: 20, totalDays: 30);
      final first = await service.recordStudyActivity();
      expect(first.currentStreak, 1);

      // 模拟次日学习：手动把 lastStudyDate 改为昨天
      await db.delete(db.streaks).go();
      await db.into(db.streaks).insert(StreaksCompanion(
            dayCount: const Value(1),
            lastStudyDate: Value(_today().subtract(const Duration(days: 1))),
          ));
      final second = await service.recordStudyActivity();
      expect(second.currentStreak, 2, reason: '次日连续 +1');

      // 模拟第 3 日学习
      await db.delete(db.streaks).go();
      await db.into(db.streaks).insert(StreaksCompanion(
            dayCount: const Value(2),
            lastStudyDate: Value(_today().subtract(const Duration(days: 1))),
          ));
      final third = await service.recordStudyActivity();
      expect(third.currentStreak, 3, reason: '第 3 日连续 +1');
    });
  });

  group('StreakService 首次与空状态边界', () {
    test('lastStudyDate 为 null 时首次记录 streak=1', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      await _seedStreak(db, dayCount: 0, lastStudyDate: null);
      await _seedSettings(settings, longest: 0, totalDays: 0);

      final streak = await service.recordStudyActivity();
      expect(streak.currentStreak, 1);
      expect(streak.longestStreak, 1);
      expect(streak.totalStudyDays, 1);
    });

    test('getStreak 在预设行存在时返回正确快照', () async {
      final (db, settings, service) = _setup();
      addTearDown(db.close);

      await _seedStreak(db, dayCount: 9, lastStudyDate: _today());
      await _seedSettings(settings, longest: 12, totalDays: 30);

      final streak = await service.getStreak();
      expect(streak.currentStreak, 9);
      expect(streak.longestStreak, 12);
      expect(streak.totalStudyDays, 30);
      expect(_isSameDay(streak.lastStudyDate!, _today()), isTrue);
    });

    test('getStreak 无记录时创建初始行并返回空数据', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final streak = await service.getStreak();
      expect(streak.currentStreak, 0);
      expect(streak.longestStreak, 0);
      expect(streak.lastStudyDate, isNull);
      expect(streak.totalStudyDays, 0);

      // 初始行已创建
      final rows = await db.select(db.streaks).get();
      expect(rows.length, 1);
      expect(rows.single.dayCount, 0);
    });
  });
}
