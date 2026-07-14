// ignore_for_file: lines_longer_than_80_lines

import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/models/provider_config.dart';
import 'package:lingxi_academy/data/repositories/conversation_repository.dart';
import 'package:lingxi_academy/data/repositories/message_repository.dart';
import 'package:lingxi_academy/data/repositories/note_repository.dart';
import 'package:lingxi_academy/data/repositories/provider_config_repository.dart';
import 'package:lingxi_academy/data/services/secure_storage_service.dart';
import 'package:lingxi_academy/features/settings/data_export_service.dart';

/// 创建一个内存版 [LingxiDatabase]，测试间彼此隔离。
LingxiDatabase _createDb() =>
    LingxiDatabase.forTesting(NativeDatabase.memory());

/// 测试用的明文 API Key（绝不应出现在导出 JSON 中）。
const _testApiKey = 'sk-MUST-NOT-LEAK-1234567890';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    FlutterSecureStorage.setMockInitialValues(<String, String>{});
  });

  // ----------------------------------------------------------------------
  // 安全性：API Key 不入导出
  // ----------------------------------------------------------------------
  group('DataExportService 安全性', () {
    test('exportAll 不应包含 apiKey 字段', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo = ProviderConfigRepository(SecureStorageService(), prefs);
      final exportSvc = DataExportService(db, repo, prefs);
      addTearDown(db.close);

      await repo.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(apiKey: _testApiKey),
      );

      final json = await exportSvc.exportAll();

      // 解析为 Map 后递归搜索，确保任何层级都没有 apiKey 键
      final decoded = jsonDecode(json) as Map<String, dynamic>;
      expect(
        _containsKey(decoded, 'apiKey'),
        isFalse,
        reason: '导出 JSON 任何层级都不应包含 apiKey 键',
      );
      expect(
        _containsKey(decoded, 'api_key'),
        isFalse,
        reason: '导出 JSON 任何层级都不应包含 api_key 键',
      );
    });

    test('exportAll 不应包含明文 API Key 值', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo = ProviderConfigRepository(SecureStorageService(), prefs);
      final exportSvc = DataExportService(db, repo, prefs);
      addTearDown(db.close);

      await repo.saveProvider(
        ProviderConfig.defaultFor(ProviderType.anthropic)
            .copyWith(apiKey: _testApiKey),
      );

      final json = await exportSvc.exportAll();

      // 整个 JSON 字符串中不应出现明文密钥
      expect(
        json,
        isNot(contains(_testApiKey)),
        reason: '导出 JSON 中绝不应出现明文 API Key',
      );
    });

    test('exportAll 应包含 provider 配置（baseUrl/model）但不含密钥', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo = ProviderConfigRepository(SecureStorageService(), prefs);
      final exportSvc = DataExportService(db, repo, prefs);
      addTearDown(db.close);

      await repo.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible).copyWith(
          apiKey: _testApiKey,
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
        ),
      );

      final json = await exportSvc.exportAll();
      final decoded = jsonDecode(json) as Map<String, dynamic>;
      final data = decoded['data'] as Map<String, dynamic>;
      final providers = data['providerConfigs'] as List<dynamic>;

      expect(providers.length, 1);
      final provider = providers.first as Map<String, dynamic>;
      expect(provider['baseUrl'], 'https://api.openai.com/v1');
      expect(provider['model'], 'gpt-4o-mini');
      expect(provider.containsKey('apiKey'), isFalse);
      expect(
        provider.values.any((v) => v.toString().contains(_testApiKey)),
        isFalse,
      );
    });

    test('多 Provider 导出均不含 apiKey', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo = ProviderConfigRepository(SecureStorageService(), prefs);
      final exportSvc = DataExportService(db, repo, prefs);
      addTearDown(db.close);

      await repo.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(apiKey: 'sk-openai-secret'),
      );
      await repo.saveProvider(
        ProviderConfig.defaultFor(ProviderType.anthropic)
            .copyWith(apiKey: 'sk-anthropic-secret'),
      );
      await repo.saveProvider(
        ProviderConfig.defaultFor(ProviderType.gemini)
            .copyWith(apiKey: 'AIza-gemini-secret'),
      );

      final json = await exportSvc.exportAll();

      expect(json, isNot(contains('sk-openai-secret')));
      expect(json, isNot(contains('sk-anthropic-secret')));
      expect(json, isNot(contains('AIza-gemini-secret')));
    });
  });

  // ----------------------------------------------------------------------
  // 导出结构
  // ----------------------------------------------------------------------
  group('DataExportService 导出结构', () {
    test('空数据库导出应返回有效信封结构', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo = ProviderConfigRepository(SecureStorageService(), prefs);
      final exportSvc = DataExportService(db, repo, prefs);
      addTearDown(db.close);

      final json = await exportSvc.exportAll();
      final decoded = jsonDecode(json) as Map<String, dynamic>;

      expect(decoded['version'], kExportVersion);
      expect(decoded['exportedAt'], isA<String>());
      final data = decoded['data'] as Map<String, dynamic>;
      expect(data.containsKey('conversations'), isTrue);
      expect(data.containsKey('notes'), isTrue);
      expect(data.containsKey('progress'), isTrue);
      expect(data.containsKey('achievements'), isTrue);
      expect(data.containsKey('streaks'), isTrue);
      expect(data.containsKey('settings'), isTrue);
      expect(data.containsKey('providerConfigs'), isTrue);
      expect((data['conversations'] as List).isEmpty, isTrue);
      expect((data['providerConfigs'] as List).isEmpty, isTrue);
    });

    test('包含对话与笔记时应正确序列化', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo = ProviderConfigRepository(SecureStorageService(), prefs);
      final exportSvc = DataExportService(db, repo, prefs);
      addTearDown(db.close);

      final convRepo = ConversationRepository(db);
      final msgRepo = MessageRepository(db);
      final noteRepo = NoteRepository(db);

      final conv = await convRepo.createConversation('测试对话');
      await msgRepo.addMessage(conv.id, 'user', '你好', tokens: 5);
      await msgRepo.addMessage(conv.id, 'assistant', '你好！', tokens: 8);
      await noteRepo.createNote(title: '笔记1', content: '内容1');

      final json = await exportSvc.exportAll();
      final decoded = jsonDecode(json) as Map<String, dynamic>;
      final data = decoded['data'] as Map<String, dynamic>;
      final conversations = data['conversations'] as List<dynamic>;

      expect(conversations.length, 1);
      final c = conversations.first as Map<String, dynamic>;
      expect(c['title'], '测试对话');
      expect((c['messages'] as List).length, 2);
      expect((data['notes'] as List).length, 1);
    });
  });

  // ----------------------------------------------------------------------
  // 导入
  // ----------------------------------------------------------------------
  group('DataImportService 导入', () {
    test('previewImport 返回正确条目统计', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo = ProviderConfigRepository(SecureStorageService(), prefs);
      final exportSvc = DataExportService(db, repo, prefs);
      addTearDown(db.close);

      final conv = await ConversationRepository(db).createConversation('C');
      await MessageRepository(db)
          .addMessage(conv.id, 'user', 'hi', tokens: 1);
      await NoteRepository(db).createNote(title: 'N', content: 'n');
      await repo.saveProvider(
        ProviderConfig.defaultFor(ProviderType.ollama)
            .copyWith(apiKey: 'ollama-key'),
      );

      final json = await exportSvc.exportAll();
      final importSvc = DataImportService(db, repo, prefs);
      final preview = importSvc.previewImport(json);

      expect(preview.conversations, 1);
      expect(preview.messages, 1);
      expect(preview.notes, 1);
      expect(preview.providerConfigs, 1);
      expect(preview.total, greaterThan(0));
    });

    test('importAll 往返导入应保持数据一致', () async {
      // 源数据库：写入数据
      final db1 = _createDb();
      final prefs1 = await SharedPreferences.getInstance();
      final repo1 = ProviderConfigRepository(SecureStorageService(), prefs1);
      final exportSvc = DataExportService(db1, repo1, prefs1);
      addTearDown(db1.close);

      final conv = await ConversationRepository(db1)
          .createConversation('往返对话');
      await MessageRepository(db1)
          .addMessage(conv.id, 'user', '测试消息', tokens: 3);
      await NoteRepository(db1)
          .createNote(title: '往返笔记', content: '笔记内容', tags: 'tag1');

      final json = await exportSvc.exportAll();

      // 目标数据库：全新内存库，导入数据
      final db2 = _createDb();
      final prefs2 = await SharedPreferences.getInstance();
      final repo2 = ProviderConfigRepository(SecureStorageService(), prefs2);
      final importSvc = DataImportService(db2, repo2, prefs2);
      addTearDown(db2.close);

      final result = await importSvc.importAll(json);

      expect(result.conversations, 1);
      expect(result.messages, 1);
      expect(result.notes, 1);

      // 验证实际写入到 db2
      final importedConvs = await ConversationRepository(db2)
          .getAllConversations();
      expect(importedConvs.length, 1);
      expect(importedConvs.first.title, '往返对话');

      final importedNotes = await NoteRepository(db2).getAllNotes();
      expect(importedNotes.length, 1);
      expect(importedNotes.first.title, '往返笔记');
      expect(importedNotes.first.tags, 'tag1');

      final importedMsgs = await MessageRepository(db2)
          .getMessages(importedConvs.first.id);
      expect(importedMsgs.length, 1);
      expect(importedMsgs.first.content, '测试消息');
    });

    test('importAll 重复导入同一 JSON 应跳过已存在记录', () async {
      final db1 = _createDb();
      final prefs1 = await SharedPreferences.getInstance();
      final repo1 = ProviderConfigRepository(SecureStorageService(), prefs1);
      final exportSvc = DataExportService(db1, repo1, prefs1);
      addTearDown(db1.close);

      await ConversationRepository(db1).createConversation('去重测试');
      await NoteRepository(db1).createNote(title: 'N', content: 'c');

      final json = await exportSvc.exportAll();

      // 目标库：第一次导入
      final db2 = _createDb();
      final prefs2 = await SharedPreferences.getInstance();
      final repo2 = ProviderConfigRepository(SecureStorageService(), prefs2);
      final importSvc = DataImportService(db2, repo2, prefs2);
      addTearDown(db2.close);

      final first = await importSvc.importAll(json);
      expect(first.conversations, 1);
      expect(first.notes, 1);

      // 第二次导入同一 JSON：已存在 id 应跳过
      final second = await importSvc.importAll(json);
      expect(second.conversations, 0);
      expect(second.notes, 0);
      expect(second.total, 0);
    });

    test('importAll 版本不匹配应抛出 FormatException', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo = ProviderConfigRepository(SecureStorageService(), prefs);
      final importSvc = DataImportService(db, repo, prefs);
      addTearDown(db.close);

      const badJson = '{"version":"9.9","exportedAt":"2024-01-01",'
          '"data":{"conversations":[]}}';

      expect(
        () => importSvc.importAll(badJson),
        throwsA(isA<FormatException>()),
      );
    });

    test('importAll 非法 JSON 应抛出 FormatException', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo = ProviderConfigRepository(SecureStorageService(), prefs);
      final importSvc = DataImportService(db, repo, prefs);
      addTearDown(db.close);

      expect(
        () => importSvc.importAll('not a json'),
        throwsA(isA<FormatException>()),
      );
    });

    test('importAll 导入的 provider 配置不含 apiKey', () async {
      final db1 = _createDb();
      final prefs1 = await SharedPreferences.getInstance();
      final repo1 = ProviderConfigRepository(SecureStorageService(), prefs1);
      final exportSvc = DataExportService(db1, repo1, prefs1);
      addTearDown(db1.close);

      await repo1.saveProvider(
        ProviderConfig.defaultFor(ProviderType.openaiCompatible)
            .copyWith(apiKey: 'sk-original'),
      );

      final json = await exportSvc.exportAll();

      // 目标库导入
      final db2 = _createDb();
      final prefs2 = await SharedPreferences.getInstance();
      final repo2 = ProviderConfigRepository(SecureStorageService(), prefs2);
      final importSvc = DataImportService(db2, repo2, prefs2);
      addTearDown(db2.close);

      await importSvc.importAll(json);

      // 验证导入后的 provider 不含 apiKey（导出文件本身不含）
      final imported = await repo2.getProvider(ProviderType.openaiCompatible);
      expect(imported, isNotNull);
      expect(imported!.apiKey, '',
          reason: '导入的 provider 配置不应包含 apiKey');
      expect(imported.baseUrl, 'https://api.openai.com/v1');
    });

    test('importAll 无效时间字段应使用兜底时间且记录仍被导入', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo =
          ProviderConfigRepository(SecureStorageService(), prefs);
      final importSvc = DataImportService(db, repo, prefs);
      addTearDown(db.close);

      // 构造含非法时间字段的 JSON：
      // - conversation 的 createdAt/updatedAt 为非法字符串或空串
      // - note 的 createdAt 为 null、updatedAt 为非法字符串
      // - progress 的 lastStudiedAt 为非法字符串、completedAt 为 null
      final before = DateTime.now();
      final json = jsonEncode({
        'version': kExportVersion,
        'exportedAt': DateTime.now().toIso8601String(),
        'data': {
          'conversations': [
            {
              'id': 'conv-invalid-date',
              'title': '无效时间对话',
              'createdAt': 'not-a-date',
              'updatedAt': '',
            },
          ],
          'notes': [
            {
              'id': 'note-invalid-date',
              'title': '无效时间笔记',
              'content': '内容',
              'createdAt': null,
              'updatedAt': 'invalid-date',
            },
          ],
          'progress': [
            {
              'id': 'prog-invalid-date',
              'courseId': 'course-1',
              'lessonId': 'lesson-1',
              'knowledgePointId': 'kp-1',
              'status': 'in_progress',
              'score': 0.8,
              'lastStudiedAt': 'bad-date',
              'completedAt': null,
            },
          ],
        },
      });
      final after = DateTime.now();

      final result = await importSvc.importAll(json);
      expect(result.conversations, 1);
      expect(result.notes, 1);
      expect(result.progress, 1);

      // conversation 的非空时间字段无效时，回退到数据库默认值（当前时间）
      final convs = await ConversationRepository(db).getAllConversations();
      expect(convs.length, 1);
      expect(convs.first.title, '无效时间对话');
      expect(
        convs.first.createdAt
            .isAfter(before.subtract(const Duration(seconds: 1))),
        isTrue,
        reason: '无效 createdAt 应回退到当前时间',
      );
      expect(
        convs.first.createdAt
            .isBefore(after.add(const Duration(seconds: 1))),
        isTrue,
      );

      // note 同样回退到默认时间
      final notes = await NoteRepository(db).getAllNotes();
      expect(notes.length, 1);
      expect(notes.first.title, '无效时间笔记');

      // progress 的可空时间字段无效时，存为 null
      final progressList = await db.select(db.progress).get();
      expect(progressList.length, 1);
      expect(progressList.first.lastStudiedAt, isNull,
          reason: '无效 lastStudiedAt 应存为 null');
      expect(progressList.first.completedAt, isNull);
    });

    test('importAll 中途异常应回滚整个事务', () async {
      final db = _createDb();
      final prefs = await SharedPreferences.getInstance();
      final repo =
          ProviderConfigRepository(SecureStorageService(), prefs);
      final importSvc = DataImportService(db, repo, prefs);
      addTearDown(db.close);

      // 构造 JSON：conversations 列表第一个元素有效，第二个元素类型错误
      // （整数而非 Map），遍历时 `as Map<String, dynamic>` 抛 TypeError，
      // 触发事务回滚——包括第一个已插入的有效 conversation。
      final json = jsonEncode({
        'version': kExportVersion,
        'exportedAt': DateTime.now().toIso8601String(),
        'data': {
          'conversations': [
            {
              'id': 'conv-rollback',
              'title': '会回滚的对话',
              'createdAt': '2024-01-01T00:00:00.000',
              'updatedAt': '2024-01-01T00:00:00.000',
            },
            123, // 无效类型，触发 TypeError
          ],
          'notes': [
            {
              'id': 'note-rollback',
              'title': '会回滚的笔记',
              'content': '内容',
              'createdAt': '2024-01-01T00:00:00.000',
              'updatedAt': '2024-01-01T00:00:00.000',
            },
          ],
        },
      });

      // 导入应抛出异常
      await expectLater(
        importSvc.importAll(json),
        throwsA(isA<TypeError>()),
      );

      // 验证事务回滚：已插入的有效 conversation 也应被撤销
      final convs = await ConversationRepository(db).getAllConversations();
      expect(convs, isEmpty, reason: '事务回滚后不应有任何对话被写入');

      // notes 在 conversations 之后导入，conversations 失败后不会执行
      final notes = await NoteRepository(db).getAllNotes();
      expect(notes, isEmpty, reason: '事务回滚后不应有任何笔记被写入');
    });
  });
}

/// 递归搜索 Map/List 结构中是否包含指定键名。
bool _containsKey(dynamic obj, String key) {
  if (obj is Map) {
    if (obj.containsKey(key)) return true;
    for (final v in obj.values) {
      if (_containsKey(v, key)) return true;
    }
  } else if (obj is List) {
    for (final v in obj) {
      if (_containsKey(v, key)) return true;
    }
  }
  return false;
}
