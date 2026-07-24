import 'package:shared_preferences/shared_preferences.dart';

/// 自动更新偏好仓库（基于 [SharedPreferences]，不新建 Drift 表）。
///
/// 存储两类信息：
/// - 上次检查时间（用于 [kUpdateCheckIntervalHours] 小时节流）
/// - 用户跳过的版本号（下次有更高版本才再次提示）
///
/// 风格参考 [ProviderConfigRepository]（SharedPreferences 后端，非 Drift）。
class UpdatePreferencesRepository {
  UpdatePreferencesRepository(this._prefs);

  final SharedPreferences _prefs;

  static const String _lastCheckTimeKey = 'update_last_check_time';
  static const String _skippedVersionKey = 'update_skipped_version';

  /// 获取上次检查更新的时间，null 表示从未检查。
  DateTime? getLastCheckTime() {
    final iso = _prefs.getString(_lastCheckTimeKey);
    if (iso == null) return null;
    return DateTime.tryParse(iso);
  }

  /// 设置上次检查更新的时间（ISO8601 文本存储，保留毫秒精度）。
  Future<void> setLastCheckTime(DateTime time) {
    return _prefs.setString(_lastCheckTimeKey, time.toIso8601String());
  }

  /// 获取用户跳过的版本号，null 表示未跳过任何版本。
  String? getSkippedVersion() {
    return _prefs.getString(_skippedVersionKey);
  }

  /// 设置用户跳过的版本号，传 null 清除跳过记录。
  Future<void> setSkippedVersion(String? version) {
    if (version == null) {
      return _prefs.remove(_skippedVersionKey);
    }
    return _prefs.setString(_skippedVersionKey, version);
  }
}
