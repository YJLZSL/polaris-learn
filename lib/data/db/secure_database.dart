import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:lingxi_academy/data/db/connection.dart';

/// 打开加密数据库连接（预留接口，当前未启用）。
///
/// 设计说明：
/// - 加密能力由 `sqlcipher_flutter_libs` 提供，已在 `pubspec.yaml` 中预声明。
/// - 真实 API Key 与敏感数据使用 `flutter_secure_storage` 存储（详见 Task 5），
///   不进入 Drift 数据库；因此当前数据库内容并不强依赖加密。
/// - 未来若决定启用整库加密，需要在 [LingxiDatabase.open] 中将
///   [openConnection] 替换为 [openSecureConnection]，并完成一次性数据迁移：
///     1. 读取现有未加密数据库导出 SQL；
///     2. 使用 Key 打开新的 SQLCipher 数据库；
///     3. 重放 SQL 并切换连接。
///
/// 注意：加密 Key 必须由 `flutter_secure_storage` 安全存储，不能硬编码、
/// 也不能写入数据库本身。
LazyDatabase openSecureConnection(String encryptionKey) {
  return LazyDatabase(() async {
    final dbFile = await getDatabaseFile();

    // 通过 SQLCipher 打开加密数据库。
    // setup 回调在打开数据库后、执行任何其他语句前运行。
    return NativeDatabase.createInBackground(
      dbFile,
      setup: (rawDb) {
        // SQLCipher 要求在所有其他操作之前执行 PRAGMA key。
        // 转义 Key 中的单引号，避免 SQL 注入。
        rawDb.execute(
          "PRAGMA key = '${encryptionKey.replaceAll("'", "''")}'",
        );
      },
      logStatements: false,
    );
  });
}
