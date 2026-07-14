// ignore_for_file: lines_longer_than_80_lines

import 'package:drift/drift.dart';
import 'package:lingxi_academy/data/db/connection.dart';
import 'package:uuid/uuid.dart';

part 'database.g.dart';

// =====================================================================
// 表定义
// =====================================================================

/// 生成新的 UUID 字符串，作为各表默认主键。
String _uuid() => const Uuid().v4();

/// 对话表：存储一次会话的元信息（标题、模型、时间戳）。
class Conversations extends Table {
  TextColumn get id => text().clientDefault(_uuid)();
  TextColumn get title => text().withDefault(const Constant('新对话'))();
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();
  TextColumn get model => text().nullable()();
  TextColumn get provider => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// 消息表：存储对话中的每一条消息（user / assistant / system）。
class Messages extends Table {
  TextColumn get id => text().clientDefault(_uuid)();
  TextColumn get conversationId => text()();
  TextColumn get role => text()(); // 'user' | 'assistant' | 'system'
  TextColumn get content => text()();
  IntColumn get tokens => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// 笔记表：用户记录的学习笔记，可关联到对话、课程或课时。
class Notes extends Table {
  TextColumn get id => text().clientDefault(_uuid)();
  TextColumn get title => text()();
  TextColumn get content => text()();
  TextColumn get tags => text().withDefault(const Constant(''))(); // 逗号分隔
  TextColumn get conversationId => text().nullable()();
  TextColumn get courseId => text().nullable()();
  TextColumn get lessonId => text().nullable()();
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// 学习进度表：记录每个知识点的学习状态与得分。
class Progress extends Table {
  TextColumn get id => text().clientDefault(_uuid)();
  TextColumn get courseId => text()();
  TextColumn get lessonId => text()();
  TextColumn get knowledgePointId => text()();
  TextColumn get status =>
      text().withDefault(const Constant('not_started'))();
  // not_started | in_progress | completed
  RealColumn get score => real().withDefault(const Constant(0.0))();
  DateTimeColumn get lastStudiedAt => dateTime().nullable()();
  DateTimeColumn get completedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// API Key 元数据表：仅存储 provider 类型、baseUrl、模型、采样参数等。
///
/// 注意：真实 API Key 不入库，使用 flutter_secure_storage 单独存储。
class ApiKeys extends Table {
  TextColumn get providerType => text()();
  // openai_compatible | anthropic | gemini | ollama
  TextColumn get baseUrl => text()();
  TextColumn get model => text()();
  RealColumn get temperature => real().withDefault(const Constant(0.7))();
  IntColumn get maxTokens => integer().withDefault(const Constant(2048))();
  BoolColumn get enabled => boolean().withDefault(const Constant(true))();
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {providerType};
}

/// 通用设置表：键值对形式存储用户偏好。
class Settings extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {key};
}

/// 成就表：记录用户解锁的成就。
class Achievements extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get description => text()();
  TextColumn get icon => text()(); // 图标标识符
  BoolColumn get unlocked => boolean().withDefault(const Constant(false))();
  DateTimeColumn get unlockedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// 连续学习天数表：单行表，通过固定 dayCount=1 占位。
///
/// 实际只使用一行数据，由 Repository 保证单行更新。
class Streaks extends Table {
  IntColumn get dayCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get lastStudyDate => dateTime().nullable()();
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {dayCount};
}

/// 学习者画像表：存储用户的学习偏好、年龄段与目标。
///
/// 单行表，由固定 id='default' 标识。如未创建过则由 Repository 懒初始化。
class LearnerProfiles extends Table {
  TextColumn get id =>
      text().clientDefault(() => 'default')();
  /// 年龄段：young / advanced
  TextColumn get ageGroup =>
      text().withDefault(const Constant('young'))();
  /// 自评编程水平：beginner / intermediate / advanced
  TextColumn get skillLevel =>
      text().withDefault(const Constant('beginner'))();
  /// 学习目标（自由文本）
  TextColumn get learningGoal =>
      text().withDefault(const Constant(''))();
  /// 每日偏好学习时长（分钟）
  IntColumn get dailyMinutes =>
      integer().withDefault(const Constant(30))();
  /// 偏好的学习节奏：relaxed / balanced / intensive
  TextColumn get pace =>
      text().withDefault(const Constant('balanced'))();
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

// =====================================================================
// 数据库
// =====================================================================

/// 灵犀学院本地数据库。
///
/// 当前 schema 版本为 2，包含 9 张表。后续升级通过 [migrationStrategy]
/// 的 `onUpgrade` 回调逐步迁移。
@DriftDatabase(tables: [
  Conversations,
  Messages,
  Notes,
  Progress,
  ApiKeys,
  Settings,
  Achievements,
  Streaks,
  LearnerProfiles,
])
class LingxiDatabase extends _$LingxiDatabase {
  /// 通过任意 [QueryExecutor] 构造数据库，主要用于生产环境。
  LingxiDatabase(super.e);

  /// 测试用工厂：可注入内存或自定义 executor。
  factory LingxiDatabase.forTesting(QueryExecutor e) => LingxiDatabase(e);

  /// 应用入口使用：默认打开跨端连接。
  factory LingxiDatabase.open() => LingxiDatabase(openConnection());

  /// 启用文本模式存储 DateTime，保留毫秒精度，便于按时间排序与展示。
  ///
  /// Drift 默认将 DateTime 存为 Unix 时间戳（秒），精度不足；
  /// 文本模式使用 ISO8601，可保留毫秒，且更易于 SQLite 工具直接查看。
  @override
  DriftDatabaseOptions get options =>
      const DriftDatabaseOptions(storeDateTimeAsText: true);

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          // Drift 自动根据表定义创建初始 schema。
          await m.createAll();
        },
        onUpgrade: (m, from, to) async {
          // v1 → v2：新增 LearnerProfiles 表
          if (from < 2) {
            await m.createTable(learnerProfiles);
          }
        },
        beforeOpen: (details) async {
          // 启用外键约束，确保未来表关联完整性。
          await customStatement('PRAGMA foreign_keys = ON');
        },
      );
}
