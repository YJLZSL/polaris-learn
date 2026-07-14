import 'package:drift/drift.dart';
import 'package:lingxi_academy/data/db/database.dart';

/// 设置仓库：封装 [Settings] 键值对表的读写操作。
class SettingsRepository {
  SettingsRepository(this._db);

  final LingxiDatabase _db;

  /// 读取某个键的值。不存在时返回 null。
  Future<String?> getSetting(String key) async {
    final query = _db.select(_db.settings)
      ..where((t) => t.key.equals(key));
    final row = await query.getSingleOrNull();
    return row?.value;
  }

  /// 写入键值对。若键已存在则覆盖，并刷新 [Settings.updatedAt]。
  Future<void> setSetting(String key, String value) async {
    final existing = await getSetting(key);
    final now = DateTime.now();
    if (existing == null) {
      await _db.into(_db.settings).insert(SettingsCompanion(
            key: Value(key),
            value: Value(value),
            updatedAt: Value(now),
          ));
      return;
    }
    await (_db.update(_db.settings)
          ..where((t) => t.key.equals(key)))
        .write(SettingsCompanion(
      value: Value(value),
      updatedAt: Value(now),
    ));
  }

  /// 读取全部设置项，返回 key→value 的映射。
  Future<Map<String, String>> getAllSettings() async {
    final rows = await _db.select(_db.settings).get();
    return {for (final r in rows) r.key: r.value};
  }
}
