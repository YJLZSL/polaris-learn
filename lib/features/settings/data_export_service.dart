import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart' show InsertMode, Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/db/database.dart';
import '../../data/models/provider_config.dart';
import '../../data/providers/db_providers.dart';
import '../../data/providers/storage_providers.dart';
import '../../data/repositories/provider_config_repository.dart';
import '../../core/providers/app_providers.dart';

/// 导出文件格式版本。
const kExportVersion = '1.0';

/// 需要从 SharedPreferences 导出的应用设置键。
const _exportedPrefKeys = <String>[
  'theme_mode',
  'locale',
  'socratic_mode',
  'onboarding_completed',
];

/// 导入预览：解析后尚未写入的条目统计。
class ImportPreview {
  const ImportPreview({
    required this.conversations,
    required this.messages,
    required this.notes,
    required this.progress,
    required this.achievements,
    required this.streaks,
    required this.settings,
    required this.providerConfigs,
  });

  final int conversations;
  final int messages;
  final int notes;
  final int progress;
  final int achievements;
  final int streaks;
  final int settings;
  final int providerConfigs;

  int get total =>
      conversations +
      messages +
      notes +
      progress +
      achievements +
      streaks +
      settings +
      providerConfigs;
}

/// 导入结果：实际写入的条目统计（已存在的会被跳过）。
class ImportResult {
  const ImportResult({
    required this.conversations,
    required this.messages,
    required this.notes,
    required this.progress,
    required this.achievements,
    required this.streaks,
    required this.settings,
    required this.providerConfigs,
  });

  final int conversations;
  final int messages;
  final int notes;
  final int progress;
  final int achievements;
  final int streaks;
  final int settings;
  final int providerConfigs;

  int get total =>
      conversations +
      messages +
      notes +
      progress +
      achievements +
      streaks +
      settings +
      providerConfigs;
}

/// 数据导出服务。
///
/// 将应用数据序列化为 JSON 字符串，包含：对话（含消息）、笔记、学习进度、
/// 成就、连续学习天数、设置（SharedPreferences）、Provider 配置。
///
/// **安全保证**：Provider 配置通过 [ProviderConfig.toJson] 序列化，
/// 该方法**不包含** apiKey 字段；apiKey 仅存储于 SecureStorage，绝不导出。
class DataExportService {
  DataExportService(this._db, this._providerRepo, this._prefs);

  final LingxiDatabase _db;
  final ProviderConfigRepository _providerRepo;
  final SharedPreferences _prefs;

  /// 导出全部数据为 JSON 字符串。
  ///
  /// 格式：
  /// ```json
  /// {
  ///   "version": "1.0",
  ///   "exportedAt": "ISO8601",
  ///   "data": { "conversations": [...], "notes": [...], ... }
  /// }
  /// ```
  Future<String> exportAll() async {
    final conversations = await _db.select(_db.conversations).get();
    // N+1 优化：一次性查询所有消息，在内存按 conversationId 分组，
    // 避免对每个 conversation 单独发起一次查询。
    final allMessages = await _db.select(_db.messages).get();
    final messagesByConv = <String, List<Message>>{};
    for (final msg in allMessages) {
      messagesByConv.putIfAbsent(msg.conversationId, () => []).add(msg);
    }
    final conversationJson = <Map<String, dynamic>>[];
    for (final c in conversations) {
      final messages = messagesByConv[c.id] ?? <Message>[];
      conversationJson.add({
        'id': c.id,
        'title': c.title,
        'createdAt': c.createdAt.toIso8601String(),
        'updatedAt': c.updatedAt.toIso8601String(),
        'model': c.model,
        'provider': c.provider,
        'messages': messages
            .map((m) => {
                  'id': m.id,
                  'conversationId': m.conversationId,
                  'role': m.role,
                  'content': m.content,
                  'tokens': m.tokens,
                  'createdAt': m.createdAt.toIso8601String(),
                })
            .toList(),
      });
    }

    final notes = await _db.select(_db.notes).get();
    final progress = await _db.select(_db.progress).get();
    final achievements = await _db.select(_db.achievements).get();
    final streaks = await _db.select(_db.streaks).get();
    final dbSettings = await _db.select(_db.settings).get();

    final providers = await _providerRepo.getAllProviders();
    // ProviderConfig.toJson 不含 apiKey，再次确认安全
    final providerJson = providers
        .map((p) {
          final json = p.toJson();
          assert(
            !json.containsKey('apiKey'),
            'apiKey 不得出现在导出 JSON 中',
          );
          return json;
        })
        .toList();

    final settingsMap = <String, Object?>{};
    for (final key in _exportedPrefKeys) {
      if (_prefs.containsKey(key)) {
        settingsMap[key] = _prefs.get(key);
      }
    }

    final envelope = <String, dynamic>{
      'version': kExportVersion,
      'exportedAt': DateTime.now().toIso8601String(),
      'data': <String, dynamic>{
        'conversations': conversationJson,
        'notes': notes
            .map((n) => {
                  'id': n.id,
                  'title': n.title,
                  'content': n.content,
                  'tags': n.tags,
                  'conversationId': n.conversationId,
                  'courseId': n.courseId,
                  'lessonId': n.lessonId,
                  'createdAt': n.createdAt.toIso8601String(),
                  'updatedAt': n.updatedAt.toIso8601String(),
                })
            .toList(),
        'progress': progress
            .map((p) => {
                  'id': p.id,
                  'courseId': p.courseId,
                  'lessonId': p.lessonId,
                  'knowledgePointId': p.knowledgePointId,
                  'status': p.status,
                  'score': p.score,
                  'lastStudiedAt': p.lastStudiedAt?.toIso8601String(),
                  'completedAt': p.completedAt?.toIso8601String(),
                })
            .toList(),
        'achievements': achievements
            .map((a) => {
                  'id': a.id,
                  'name': a.name,
                  'description': a.description,
                  'icon': a.icon,
                  'unlocked': a.unlocked,
                  'unlockedAt': a.unlockedAt?.toIso8601String(),
                })
            .toList(),
        'streaks': streaks
            .map((s) => {
                  'dayCount': s.dayCount,
                  'lastStudyDate': s.lastStudyDate?.toIso8601String(),
                  'updatedAt': s.updatedAt.toIso8601String(),
                })
            .toList(),
        'dbSettings': dbSettings
            .map((s) => {
                  'key': s.key,
                  'value': s.value,
                  'updatedAt': s.updatedAt.toIso8601String(),
                })
            .toList(),
        'settings': settingsMap,
        'providerConfigs': providerJson,
      },
    };

    return const JsonEncoder.withIndent('  ').convert(envelope);
  }

  /// 导出全部数据并写入应用文档目录的 JSON 文件，返回文件绝对路径。
  ///
  /// 文件名格式：`lingxi_export_YYYYMMDD_HHmmss.json`。
  Future<String> exportToFile() async {
    final json = await exportAll();
    final dir = await getApplicationDocumentsDirectory();
    final now = DateTime.now();
    final stamp = '${now.year.toString().padLeft(4, '0')}'
        '${now.month.toString().padLeft(2, '0')}'
        '${now.day.toString().padLeft(2, '0')}'
        '_'
        '${now.hour.toString().padLeft(2, '0')}'
        '${now.minute.toString().padLeft(2, '0')}'
        '${now.second.toString().padLeft(2, '0')}';
    final file = File('${dir.path}/lingxi_export_$stamp.json');
    await file.writeAsString(json);
    return file.path;
  }
}

/// 数据导入服务。
///
/// 解析导出的 JSON，按 id 去重合并：已存在的记录跳过（不覆盖），
/// 仅插入新记录。Provider 配置按 providerType 去重，且不会导入 apiKey
/// （导出文件本身不含 apiKey）。
class DataImportService {
  DataImportService(this._db, this._providerRepo, this._prefs);

  final LingxiDatabase _db;
  final ProviderConfigRepository _providerRepo;
  final SharedPreferences _prefs;

  /// 解析导出 JSON，返回即将导入的条目统计（不写入）。
  ///
  /// 用于 UI 预览：选择文件后先展示将导入多少条，用户确认后再调用
  /// [importAll]。
  ImportPreview previewImport(String jsonStr) {
    final root = _parseEnvelope(jsonStr);
    final data = root['data'] as Map<String, dynamic>? ?? <String, dynamic>{};
    return ImportPreview(
      conversations: (data['conversations'] as List<dynamic>?)?.length ?? 0,
      messages: _countMessages(data),
      notes: (data['notes'] as List<dynamic>?)?.length ?? 0,
      progress: (data['progress'] as List<dynamic>?)?.length ?? 0,
      achievements: (data['achievements'] as List<dynamic>?)?.length ?? 0,
      streaks: (data['streaks'] as List<dynamic>?)?.length ?? 0,
      settings: (data['settings'] as Map<String, dynamic>?)?.length ?? 0,
      providerConfigs:
          (data['providerConfigs'] as List<dynamic>?)?.length ?? 0,
    );
  }

  int _countMessages(Map<String, dynamic> data) {
    final conversations = data['conversations'] as List<dynamic>?;
    if (conversations == null) return 0;
    var count = 0;
    for (final c in conversations) {
      final msgs =
          (c as Map<String, dynamic>)['messages'] as List<dynamic>?;
      count += msgs?.length ?? 0;
    }
    return count;
  }

  /// 执行导入：按 id 去重，已存在则跳过，返回实际写入条目统计。
  ///
  /// 校验 `version` 字段，不匹配时抛出 [FormatException]。
  Future<ImportResult> importAll(String jsonStr) async {
    // 在事务外解析 JSON：格式错误（jsonDecode / 版本校验）应在事务之前抛出，
    // 避免无谓地开启一个事务再立即回滚。
    final root = _parseEnvelope(jsonStr);
    final data = root['data'] as Map<String, dynamic>? ?? <String, dynamic>{};

    // 用事务包裹整个导入流程：任一子步骤抛异常则整体回滚，
    // 保证数据库不会停留在"导入一半"的中间状态。
    return _db.transaction(() async {
      final conversations = await _importConversations(data);
      final messages = await _importMessages(data);
      final notes = await _importNotes(data);
      final progress = await _importProgress(data);
      final achievements = await _importAchievements(data);
      final streaks = await _importStreaks(data);
      final settings = await _importSettings(data);
      final providerConfigs = await _importProviderConfigs(data);

      return ImportResult(
        conversations: conversations,
        messages: messages,
        notes: notes,
        progress: progress,
        achievements: achievements,
        streaks: streaks,
        settings: settings,
        providerConfigs: providerConfigs,
      );
    });
  }

  /// 解析并校验导出文件外层结构。
  Map<String, dynamic> _parseEnvelope(String jsonStr) {
    final dynamic decoded;
    try {
      decoded = jsonDecode(jsonStr);
    } catch (e) {
      throw FormatException('无法解析 JSON：$e');
    }
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('导出文件根结构不是 JSON 对象');
    }
    final version = decoded['version'] as String?;
    if (version != kExportVersion) {
      throw FormatException('不支持的导出版本：$version（当前支持 $kExportVersion）');
    }
    return decoded;
  }

  Future<int> _importConversations(Map<String, dynamic> data) async {
    final list = data['conversations'] as List<dynamic>? ?? <dynamic>[];
    final existingIds = (await _db.select(_db.conversations).get())
        .map((c) => c.id)
        .toSet();
    var imported = 0;
    for (final item in list) {
      final m = item as Map<String, dynamic>;
      final id = m['id'] as String?;
      if (id == null || existingIds.contains(id)) continue;
      final createdAt = _parseDate(m['createdAt']);
      final updatedAt = _parseDate(m['updatedAt']);
      await _db.into(_db.conversations).insert(
            ConversationsCompanion.insert(
              id: Value(id),
              title: Value(m['title'] as String? ?? '新对话'),
              createdAt: createdAt == null
                  ? const Value.absent()
                  : Value(createdAt),
              updatedAt: updatedAt == null
                  ? const Value.absent()
                  : Value(updatedAt),
              model: Value(m['model'] as String?),
              provider: Value(m['provider'] as String?),
            ),
            mode: InsertMode.insertOrIgnore,
          );
      imported++;
    }
    return imported;
  }

  Future<int> _importMessages(Map<String, dynamic> data) async {
    final conversations = data['conversations'] as List<dynamic>?;
    if (conversations == null) return 0;
    final existingIds = (await _db.select(_db.messages).get())
        .map((m) => m.id)
        .toSet();
    var imported = 0;
    for (final c in conversations) {
      final cm = c as Map<String, dynamic>;
      final convId = cm['id'] as String?;
      final msgs = cm['messages'] as List<dynamic>?;
      if (msgs == null || convId == null) continue;
      for (final item in msgs) {
        final m = item as Map<String, dynamic>;
        final id = m['id'] as String?;
        if (id == null || existingIds.contains(id)) continue;
        final msgCreatedAt = _parseDate(m['createdAt']);
        await _db.into(_db.messages).insert(
              MessagesCompanion.insert(
                id: Value(id),
                conversationId: convId,
                role: m['role'] as String? ?? 'user',
                content: m['content'] as String? ?? '',
                tokens: Value(m['tokens'] as int? ?? 0),
                createdAt: msgCreatedAt == null
                    ? const Value.absent()
                    : Value(msgCreatedAt),
              ),
              mode: InsertMode.insertOrIgnore,
            );
        imported++;
      }
    }
    return imported;
  }

  Future<int> _importNotes(Map<String, dynamic> data) async {
    final list = data['notes'] as List<dynamic>? ?? <dynamic>[];
    final existingIds =
        (await _db.select(_db.notes).get()).map((n) => n.id).toSet();
    var imported = 0;
    for (final item in list) {
      final m = item as Map<String, dynamic>;
      final id = m['id'] as String?;
      if (id == null || existingIds.contains(id)) continue;
      final noteCreatedAt = _parseDate(m['createdAt']);
      final noteUpdatedAt = _parseDate(m['updatedAt']);
      await _db.into(_db.notes).insert(
            NotesCompanion.insert(
              id: Value(id),
              title: m['title'] as String? ?? '',
              content: m['content'] as String? ?? '',
              tags: Value(m['tags'] as String? ?? ''),
              conversationId: Value(m['conversationId'] as String?),
              courseId: Value(m['courseId'] as String?),
              lessonId: Value(m['lessonId'] as String?),
              createdAt: noteCreatedAt == null
                  ? const Value.absent()
                  : Value(noteCreatedAt),
              updatedAt: noteUpdatedAt == null
                  ? const Value.absent()
                  : Value(noteUpdatedAt),
            ),
            mode: InsertMode.insertOrIgnore,
          );
      imported++;
    }
    return imported;
  }

  Future<int> _importProgress(Map<String, dynamic> data) async {
    final list = data['progress'] as List<dynamic>? ?? <dynamic>[];
    final existingIds =
        (await _db.select(_db.progress).get()).map((p) => p.id).toSet();
    var imported = 0;
    for (final item in list) {
      final m = item as Map<String, dynamic>;
      final id = m['id'] as String?;
      if (id == null || existingIds.contains(id)) continue;
      await _db.into(_db.progress).insert(
            ProgressCompanion.insert(
              id: Value(id),
              courseId: m['courseId'] as String? ?? '',
              lessonId: m['lessonId'] as String? ?? '',
              knowledgePointId: m['knowledgePointId'] as String? ?? '',
              status: Value(m['status'] as String? ?? 'not_started'),
              score: Value((m['score'] as num?)?.toDouble() ?? 0.0),
              lastStudiedAt: Value(_parseDate(m['lastStudiedAt'])),
              completedAt: Value(_parseDate(m['completedAt'])),
            ),
            mode: InsertMode.insertOrIgnore,
          );
      imported++;
    }
    return imported;
  }

  Future<int> _importAchievements(Map<String, dynamic> data) async {
    final list = data['achievements'] as List<dynamic>? ?? <dynamic>[];
    final existingIds =
        (await _db.select(_db.achievements).get()).map((a) => a.id).toSet();
    var imported = 0;
    for (final item in list) {
      final m = item as Map<String, dynamic>;
      final id = m['id'] as String?;
      if (id == null || existingIds.contains(id)) continue;
      await _db.into(_db.achievements).insert(
            AchievementsCompanion.insert(
              id: id,
              name: m['name'] as String? ?? '',
              description: m['description'] as String? ?? '',
              icon: m['icon'] as String? ?? '',
              unlocked: Value(m['unlocked'] as bool? ?? false),
              unlockedAt: Value(_parseDate(m['unlockedAt'])),
            ),
            mode: InsertMode.insertOrIgnore,
          );
      imported++;
    }
    return imported;
  }

  Future<int> _importStreaks(Map<String, dynamic> data) async {
    final list = data['streaks'] as List<dynamic>? ?? <dynamic>[];
    final existing = await _db.select(_db.streaks).get();
    if (existing.isNotEmpty) return 0; // 单行表，已存在则跳过
    var imported = 0;
    for (final item in list) {
      final m = item as Map<String, dynamic>;
      final streakUpdatedAt = _parseDate(m['updatedAt']);
      await _db.into(_db.streaks).insert(
            StreaksCompanion.insert(
              dayCount: Value(m['dayCount'] as int? ?? 0),
              lastStudyDate: Value(_parseDate(m['lastStudyDate'])),
              updatedAt: streakUpdatedAt == null
                  ? const Value.absent()
                  : Value(streakUpdatedAt),
            ),
            mode: InsertMode.insertOrIgnore,
          );
      imported++;
    }
    return imported;
  }

  Future<int> _importSettings(Map<String, dynamic> data) async {
    final map = data['settings'] as Map<String, dynamic>?;
    if (map == null || map.isEmpty) return 0;
    var imported = 0;
    for (final key in _exportedPrefKeys) {
      if (!map.containsKey(key)) continue;
      if (_prefs.containsKey(key)) continue; // 已存在则跳过
      final value = map[key];
      if (value is int) {
        await _prefs.setInt(key, value);
      } else if (value is bool) {
        await _prefs.setBool(key, value);
      } else if (value is double) {
        await _prefs.setDouble(key, value);
      } else if (value is String) {
        await _prefs.setString(key, value);
      }
      imported++;
    }
    return imported;
  }

  Future<int> _importProviderConfigs(Map<String, dynamic> data) async {
    final list = data['providerConfigs'] as List<dynamic>? ?? <dynamic>[];
    final existingTypes = (await _providerRepo.getAllProviders())
        .map((p) => p.providerType)
        .toSet();
    var imported = 0;
    for (final item in list) {
      final m = item as Map<String, dynamic>;
      if (m['providerType'] is! String) continue;
      final config = ProviderConfig.fromJson(m);
      if (existingTypes.contains(config.providerType)) continue;
      // 导入时不带 apiKey（导出文件不含 apiKey），apiKey 留空
      await _providerRepo.saveProvider(config.copyWith(apiKey: ''));
      imported++;
    }
    return imported;
  }

  /// 解析 ISO8601 字符串为 [DateTime]，解析失败（null 或非法字符串）返回 null。
  ///
  /// 调用方需处理 null：对于非空字段使用 [Value.absent] 让数据库回退到
  /// schema 默认值（currentDateAndTime），对于可空字段直接使用 [Value] 传入。
  DateTime? _parseDate(Object? value) {
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }
}

/// [DataExportService] 提供者。
final dataExportServiceProvider = Provider<DataExportService>((ref) {
  return DataExportService(
    ref.watch(databaseProvider),
    ref.watch(providerConfigRepositoryProvider),
    ref.watch(sharedPreferencesProvider),
  );
});

/// [DataImportService] 提供者。
final dataImportServiceProvider = Provider<DataImportService>((ref) {
  return DataImportService(
    ref.watch(databaseProvider),
    ref.watch(providerConfigRepositoryProvider),
    ref.watch(sharedPreferencesProvider),
  );
});
