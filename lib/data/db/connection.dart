import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3_flutter_libs/sqlite3_flutter_libs.dart';

/// 获取应用数据库文件位置。
///
/// 在各平台的应用文档目录下创建 `lingxi_academy.db`。
Future<File> getDatabaseFile() async {
  final dbFolder = await getApplicationDocumentsDirectory();
  return File(p.join(dbFolder.path, 'lingxi_academy.db'));
}

/// 创建一个懒加载的跨端数据库连接。
///
/// 实际数据库在第一次被访问时才会打开，避免阻塞应用启动。
LazyDatabase openConnection() {
  return LazyDatabase(() async {
    final dbFile = await getDatabaseFile();

    // Android 旧版本（< 7.0）需要显式加载 sqlite3 共享库。
    if (Platform.isAndroid) {
      await applyWorkaroundToOpenSqlite3OnOldAndroidVersions();
    }

    return NativeDatabase.createInBackground(
      dbFile,
      logStatements: false, // 生产环境关闭 SQL 日志
    );
  });
}
