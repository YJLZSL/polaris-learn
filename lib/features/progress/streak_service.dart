// ignore_for_file: lines_longer_than_80_lines

import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/data/repositories/settings_repository.dart';

/// 连续学习天数据快照。
///
/// 由于 [Streaks] 表仅有 dayCount / lastStudyDate / updatedAt 三列，
/// longestStreak 与 totalStudyDays 通过 [SettingsRepository] 键值对补充存储。
class StreakData {
  const StreakData({
    required this.currentStreak,
    required this.longestStreak,
    required this.lastStudyDate,
    required this.totalStudyDays,
  });

  /// 当前连续学习天数
  final int currentStreak;

  /// 历史最长连续天数
  final int longestStreak;

  /// 最近一次学习日期
  final DateTime? lastStudyDate;

  /// 累计学习天数
  final int totalStudyDays;

  /// 空数据（首次使用时）
  static const empty = StreakData(
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    totalStudyDays: 0,
  );

  StreakData copyWith({
    int? currentStreak,
    int? longestStreak,
    DateTime? lastStudyDate,
    int? totalStudyDays,
  }) {
    return StreakData(
      currentStreak: currentStreak ?? this.currentStreak,
      longestStreak: longestStreak ?? this.longestStreak,
      lastStudyDate: lastStudyDate ?? this.lastStudyDate,
      totalStudyDays: totalStudyDays ?? this.totalStudyDays,
    );
  }
}

/// 连续学习天数服务。
///
/// 封装 [Streaks] 表的读写与连续天数计算逻辑。
/// 表中仅保留一行记录，通过 dayCount 列同时充当主键与当前连续天数。
class StreakService {
  StreakService(this._db, this._settings);

  final LingxiDatabase _db;
  final SettingsRepository _settings;

  /// Settings 中存储最长连续天数的键。
  static const _keyLongestStreak = 'streak_longest';

  /// Settings 中存储累计学习天数的键。
  static const _keyTotalStudyDays = 'streak_total_days';

  /// 获取当前 streak 记录。若表中无记录则创建初始行。
  Future<StreakData> getStreak() async {
    final row = await (_db.select(_db.streaks)..limit(1)).getSingleOrNull();
    if (row == null) {
      // 插入初始行：dayCount=0, lastStudyDate=null
      await _db.into(_db.streaks).insert(const StreaksCompanion(
            dayCount: Value(0),
          ));
      return StreakData.empty;
    }
    return StreakData(
      currentStreak: row.dayCount,
      longestStreak: await _getInt(_keyLongestStreak),
      lastStudyDate: row.lastStudyDate,
      totalStudyDays: await _getInt(_keyTotalStudyDays),
    );
  }

  /// 记录今日学习活动，更新连续天数。
  ///
  /// 规则：
  /// - lastStudyDate == today：不变（今日已记录）
  /// - lastStudyDate == yesterday：currentStreak++
  /// - lastStudyDate 早于昨天：currentStreak = 1
  /// - longestStreak = max(currentStreak, longestStreak)
  /// - totalStudyDays++（仅当今日首次记录）
  /// - lastStudyDate = today
  Future<StreakData> recordStudyActivity() async {
    final current = await getStreak();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final lastDate = current.lastStudyDate;
    final lastDateOnly = lastDate == null
        ? null
        : DateTime(lastDate.year, lastDate.month, lastDate.day);

    // 今日已记录，直接返回当前数据
    if (lastDateOnly != null && _isSameDay(lastDateOnly, today)) {
      return current;
    }

    int newStreak;
    if (lastDateOnly == null) {
      // 首次学习
      newStreak = 1;
    } else {
      final yesterday = today.subtract(const Duration(days: 1));
      if (_isSameDay(lastDateOnly, yesterday)) {
        // 连续：昨天学过
        newStreak = current.currentStreak + 1;
      } else {
        // 断档：重置为 1
        newStreak = 1;
      }
    }

    final newLongest =
        newStreak > current.longestStreak ? newStreak : current.longestStreak;
    final newTotalDays = current.totalStudyDays + 1;

    // 写入 Streaks 表（事务包裹 delete + insert，保证单行原子更新）
    // 由于 Streaks 表以 dayCount 为主键且值会变化，
    // 无法使用 insertOnConflictUpdate，改用事务确保两步操作原子执行。
    await _db.transaction(() async {
      await _db.delete(_db.streaks).go();
      await _db.into(_db.streaks).insert(StreaksCompanion(
            dayCount: Value(newStreak),
            lastStudyDate: Value(today),
            updatedAt: Value(now),
          ));
    });

    // 写入 Settings 表
    await _settings.setSetting(_keyLongestStreak, newLongest.toString());
    await _settings.setSetting(_keyTotalStudyDays, newTotalDays.toString());

    return StreakData(
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastStudyDate: today,
      totalStudyDays: newTotalDays,
    );
  }

  /// 便捷方法：返回当前连续天数。
  Future<int> getCurrentStreakDays() async {
    return (await getStreak()).currentStreak;
  }

  /// 从 Settings 读取整数值，不存在时返回 0。
  Future<int> _getInt(String key) async {
    final value = await _settings.getSetting(key);
    if (value == null) return 0;
    return int.tryParse(value) ?? 0;
  }

  /// 判断两个日期是否为同一天。
  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}

/// StreakService 全局 Provider。
final streakServiceProvider = Provider<StreakService>((ref) {
  return StreakService(
    ref.watch(databaseProvider),
    ref.watch(settingsRepositoryProvider),
  );
});
