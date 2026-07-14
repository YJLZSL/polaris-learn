// ignore_for_file: lines_longer_than_80_lines

import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/repositories/achievement_repository.dart';
import 'package:lingxi_academy/data/repositories/conversation_repository.dart';
import 'package:lingxi_academy/data/repositories/message_repository.dart';
import 'package:lingxi_academy/data/repositories/note_repository.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';
import 'package:lingxi_academy/data/repositories/settings_repository.dart';

/// 创建一个内存版 [LingxiDatabase]，测试间彼此隔离。
LingxiDatabase _createDb() =>
    LingxiDatabase.forTesting(NativeDatabase.memory());

void main() {
  // ----------------------------------------------------------------------
  // ConversationRepository
  // ----------------------------------------------------------------------
  group('ConversationRepository', () {
    late LingxiDatabase db;
    late ConversationRepository repo;

    setUp(() {
      db = _createDb();
      repo = ConversationRepository(db);
    });

    tearDown(() => db.close());

    test('createConversation 返回带默认值的完整记录', () async {
      final c = await repo.createConversation('第一次对话');
      expect(c.id, isNotEmpty);
      expect(c.title, '第一次对话');
      expect(c.createdAt, isNotNull);
      expect(c.updatedAt, isNotNull);
    });

    test('getAllConversations 返回全部并按 updatedAt 倒序', () async {
      final a = await repo.createConversation('A');
      // 显式延迟，确保 updatedAt 不同。
      await Future<void>.delayed(const Duration(milliseconds: 10));
      final b = await repo.createConversation('B');
      final list = await repo.getAllConversations();
      expect(list.length, 2);
      // B 创建更晚，应排在前面。
      expect(list.first.id, b.id);
      expect(list.last.id, a.id);
    });

    test('updateTitle 修改标题并刷新 updatedAt', () async {
      final c = await repo.createConversation('原标题');
      await Future<void>.delayed(const Duration(milliseconds: 10));
      await repo.updateTitle(c.id, '新标题');
      final list = await repo.getAllConversations();
      final updated = list.firstWhere((e) => e.id == c.id);
      expect(updated.title, '新标题');
      expect(updated.updatedAt.isAfter(c.updatedAt), isTrue);
    });

    test('deleteConversation 删除指定记录', () async {
      final a = await repo.createConversation('A');
      await repo.createConversation('B');
      await repo.deleteConversation(a.id);
      final list = await repo.getAllConversations();
      expect(list.length, 1);
      expect(list.any((e) => e.id == a.id), isFalse);
    });

    test('deleteConversation 级联删除关联消息（无孤儿）', () async {
      final c = await repo.createConversation('C');
      final msgRepo = MessageRepository(db);
      await msgRepo.addMessage(c.id, 'user', 'hello');
      await msgRepo.addMessage(c.id, 'assistant', 'hi');
      // 删除对话前该对话有 2 条消息
      expect(await msgRepo.count(c.id), 2);
      await repo.deleteConversation(c.id);
      // 删除对话后消息也应消失
      expect(await msgRepo.getMessages(c.id), isEmpty);
      expect(await msgRepo.count(c.id), 0);
    });

    test('getConversation 返回正确记录，不存在时返回 null', () async {
      final c = await repo.createConversation('精准查询');
      final found = await repo.getConversation(c.id);
      expect(found, isNotNull);
      expect(found!.id, c.id);
      expect(found.title, '精准查询');

      final missing = await repo.getConversation('non-existent-id');
      expect(missing, isNull);
    });

    test('getAllConversations 支持 limit 分页', () async {
      for (var i = 0; i < 8; i++) {
        await repo.createConversation('C$i');
      }
      final page = await repo.getAllConversations(limit: 5, offset: 0);
      expect(page.length, 5);
    });

    test('getAllConversations 支持 offset 跳过', () async {
      for (var i = 0; i < 6; i++) {
        await repo.createConversation('C$i');
      }
      final firstPage = await repo.getAllConversations(limit: 4, offset: 0);
      final secondPage = await repo.getAllConversations(limit: 4, offset: 4);
      expect(firstPage.length, 4);
      expect(secondPage.length, 2);
      // 两页不应有重叠
      final firstIds = firstPage.map((e) => e.id).toSet();
      for (final e in secondPage) {
        expect(firstIds.contains(e.id), isFalse);
      }
    });

    test('count 返回对话总数', () async {
      expect(await repo.count(), 0);
      await repo.createConversation('A');
      await repo.createConversation('B');
      await repo.createConversation('C');
      expect(await repo.count(), 3);
    });

    test('watchConversations 推送变更', () async {
      final stream = repo.watchConversations();
      final first = await stream.first;
      expect(first, isEmpty);
      await repo.createConversation('A');
      // 重新订阅取最新快照。
      final second = await repo.watchConversations().first;
      expect(second.length, 1);
    });
  });

  // ----------------------------------------------------------------------
  // MessageRepository
  // ----------------------------------------------------------------------
  group('MessageRepository', () {
    late LingxiDatabase db;
    late MessageRepository repo;
    late String conversationId;

    setUp(() async {
      db = _createDb();
      repo = MessageRepository(db);
      final c = await ConversationRepository(db).createConversation('C');
      conversationId = c.id;
    });

    tearDown(() => db.close());

    test('addMessage 写入并返回完整记录', () async {
      final m = await repo.addMessage(
        conversationId,
        'user',
        '你好',
        tokens: 5,
      );
      expect(m.id, isNotEmpty);
      expect(m.conversationId, conversationId);
      expect(m.role, 'user');
      expect(m.content, '你好');
      expect(m.tokens, 5);
    });

    test('getMessages 按 createdAt 正序返回', () async {
      await repo.addMessage(conversationId, 'user', 'A');
      await Future<void>.delayed(const Duration(milliseconds: 10));
      await repo.addMessage(conversationId, 'assistant', 'B');
      final list = await repo.getMessages(conversationId);
      expect(list.length, 2);
      expect(list.first.content, 'A');
      expect(list.last.content, 'B');
    });

    test('deleteMessage 删除指定消息', () async {
      final m = await repo.addMessage(conversationId, 'user', 'X');
      await repo.deleteMessage(m.id);
      final list = await repo.getMessages(conversationId);
      expect(list, isEmpty);
    });

    test('getMessages 仅返回指定对话的消息', () async {
      await repo.addMessage(conversationId, 'user', 'A');
      final other = await ConversationRepository(db).createConversation('O');
      await repo.addMessage(other.id, 'user', 'B');
      final list = await repo.getMessages(conversationId);
      expect(list.length, 1);
      expect(list.first.content, 'A');
    });

    test('count 返回指定对话的消息数量', () async {
      expect(await repo.count(conversationId), 0);
      await repo.addMessage(conversationId, 'user', 'A');
      await repo.addMessage(conversationId, 'assistant', 'B');
      await repo.addMessage(conversationId, 'user', 'C');
      expect(await repo.count(conversationId), 3);

      // 其他对话的消息不应计入
      final other = await ConversationRepository(db).createConversation('O');
      await repo.addMessage(other.id, 'user', 'X');
      expect(await repo.count(conversationId), 3);
      expect(await repo.count(other.id), 1);
    });

    test('getMessages 支持 limit/offset 分页', () async {
      for (var i = 0; i < 5; i++) {
        await repo.addMessage(conversationId, 'user', 'msg$i');
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }
      final firstPage = await repo.getMessages(conversationId, limit: 2);
      expect(firstPage.length, 2);
      expect(firstPage.first.content, 'msg0');

      final secondPage =
          await repo.getMessages(conversationId, limit: 2, offset: 2);
      expect(secondPage.length, 2);
      expect(secondPage.first.content, 'msg2');
    });
  });

  // ----------------------------------------------------------------------
  // NoteRepository
  // ----------------------------------------------------------------------
  group('NoteRepository', () {
    late LingxiDatabase db;
    late NoteRepository repo;

    setUp(() {
      db = _createDb();
      repo = NoteRepository(db);
    });

    tearDown(() => db.close());

    test('createNote 写入完整字段', () async {
      final n = await repo.createNote(
        title: '笔记1',
        content: '内容',
        tags: 'dart,flutter',
      );
      expect(n.id, isNotEmpty);
      expect(n.title, '笔记1');
      expect(n.tags, 'dart,flutter');
      expect(n.createdAt, isNotNull);
    });

    test('getAllNotes 默认按 updatedAt 倒序', () async {
      await repo.createNote(title: 'A', content: 'a');
      await Future<void>.delayed(const Duration(milliseconds: 10));
      final b = await repo.createNote(title: 'B', content: 'b');
      final list = await repo.getAllNotes();
      expect(list.first.id, b.id);
    });

    test('getAllNotes 标签过滤生效', () async {
      await repo.createNote(
        title: 'A',
        content: 'a',
        tags: 'dart,flutter',
      );
      await repo.createNote(
        title: 'B',
        content: 'b',
        tags: 'python',
      );
      final dartOnly = await repo.getAllNotes(tagFilter: 'dart');
      expect(dartOnly.length, 1);
      expect(dartOnly.first.title, 'A');
    });

    test('updateNote 仅更新传入字段', () async {
      final n = await repo.createNote(
        title: '原标题',
        content: '原内容',
        tags: 't1',
      );
      await repo.updateNote(n.id, title: '新标题');
      final list = await repo.getAllNotes();
      final updated = list.firstWhere((e) => e.id == n.id);
      expect(updated.title, '新标题');
      expect(updated.content, '原内容');
      expect(updated.tags, 't1');
    });

    test('deleteNote 删除记录', () async {
      final n = await repo.createNote(title: 'A', content: 'a');
      await repo.deleteNote(n.id);
      expect(await repo.getAllNotes(), isEmpty);
    });

    test('count 返回笔记总数', () async {
      expect(await repo.count(), 0);
      await repo.createNote(title: 'A', content: 'a');
      await repo.createNote(title: 'B', content: 'b');
      expect(await repo.count(), 2);
    });

    test('getAllNotes 支持 limit/offset 分页', () async {
      for (var i = 0; i < 5; i++) {
        await repo.createNote(title: 'N$i', content: 'c$i');
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }
      final page = await repo.getAllNotes(limit: 2);
      expect(page.length, 2);

      final nextPage = await repo.getAllNotes(limit: 2, offset: 2);
      expect(nextPage.length, 2);
    });

    test('getAllNotes 标签过滤与分页可组合', () async {
      // 3 条 dart 标签，2 条 python 标签
      for (var i = 0; i < 3; i++) {
        await repo.createNote(
          title: 'D$i',
          content: 'd$i',
          tags: 'dart,flutter',
        );
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }
      for (var i = 0; i < 2; i++) {
        await repo.createNote(
          title: 'P$i',
          content: 'p$i',
          tags: 'python',
        );
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }
      // 仅 dart 标签下取前 2 条
      final dartPage = await repo.getAllNotes(tagFilter: 'dart', limit: 2);
      expect(dartPage.length, 2);
      for (final n in dartPage) {
        expect(n.tags.contains('dart'), isTrue);
      }
    });
  });

  // ----------------------------------------------------------------------
  // ProgressRepository
  // ----------------------------------------------------------------------
  group('ProgressRepository', () {
    late LingxiDatabase db;
    late ProgressRepository repo;

    setUp(() {
      db = _createDb();
      repo = ProgressRepository(db);
    });

    tearDown(() => db.close());

    test('markInProgress 新建并标记为 in_progress', () async {
      await repo.markInProgress('c1', 'l1', 'k1');
      final p = await repo.getKnowledgePointProgress('c1', 'l1', 'k1');
      expect(p, isNotNull);
      expect(p!.status, 'in_progress');
      expect(p.lastStudiedAt, isNotNull);
    });

    test('markCompleted 设置状态与得分', () async {
      await repo.markCompleted('c1', 'l1', 'k1', score: 0.8);
      final p = await repo.getKnowledgePointProgress('c1', 'l1', 'k1');
      expect(p, isNotNull);
      expect(p!.status, 'completed');
      expect(p.score, 0.8);
      expect(p.completedAt, isNotNull);
    });

    test('markInProgress 不回退已完成的状态', () async {
      await repo.markCompleted('c1', 'l1', 'k1', score: 1.0);
      await repo.markInProgress('c1', 'l1', 'k1');
      final p = await repo.getKnowledgePointProgress('c1', 'l1', 'k1');
      expect(p!.status, 'completed');
    });

    test('markInProgress 在已有 in_progress 记录上保持状态', () async {
      await repo.markInProgress('c1', 'l1', 'k1');
      await repo.markInProgress('c1', 'l1', 'k1');
      final list = await repo.getProgress('c1');
      expect(list.length, 1);
      expect(list.first.status, 'in_progress');
    });

    test('getCompletionRate 计算完成率', () async {
      expect(await repo.getCompletionRate('c1'), 0.0);
      await repo.markCompleted('c1', 'l1', 'k1');
      await repo.markInProgress('c1', 'l1', 'k2');
      // 1/2 = 0.5
      expect(await repo.getCompletionRate('c1'), 0.5);
    });
  });

  // ----------------------------------------------------------------------
  // SettingsRepository
  // ----------------------------------------------------------------------
  group('SettingsRepository', () {
    late LingxiDatabase db;
    late SettingsRepository repo;

    setUp(() {
      db = _createDb();
      repo = SettingsRepository(db);
    });

    tearDown(() => db.close());

    test('不存在的键返回 null', () async {
      expect(await repo.getSetting('missing'), isNull);
    });

    test('setSetting 新建键值', () async {
      await repo.setSetting('theme', 'dark');
      expect(await repo.getSetting('theme'), 'dark');
    });

    test('setSetting 覆盖已有值', () async {
      await repo.setSetting('theme', 'dark');
      await repo.setSetting('theme', 'light');
      expect(await repo.getSetting('theme'), 'light');
    });

    test('getAllSettings 返回全部映射', () async {
      await repo.setSetting('a', '1');
      await repo.setSetting('b', '2');
      final map = await repo.getAllSettings();
      expect(map.length, 2);
      expect(map['a'], '1');
      expect(map['b'], '2');
    });
  });

  // ----------------------------------------------------------------------
  // AchievementRepository
  // ----------------------------------------------------------------------
  group('AchievementRepository', () {
    late LingxiDatabase db;
    late AchievementRepository repo;

    setUp(() async {
      db = _createDb();
      repo = AchievementRepository(db);
      // 预置两条成就记录用于解锁测试。
      // 直接通过数据库插入以避免依赖未实现的 seed 逻辑。
      await db.into(db.achievements).insert(const AchievementsCompanion(
            id: Value('a1'),
            name: Value('初学者'),
            description: Value('完成第一课'),
            icon: Value('star'),
          ));
      await db.into(db.achievements).insert(const AchievementsCompanion(
            id: Value('a2'),
            name: Value('坚持者'),
            description: Value('连续学习 7 天'),
            icon: Value('flame'),
          ));
    });

    tearDown(() => db.close());

    test('getAllAchievements 返回全部', () async {
      final list = await repo.getAllAchievements();
      expect(list.length, 2);
      expect(list[0].id, 'a1');
    });

    test('unlockAchievement 设置 unlocked 与 unlockedAt', () async {
      await repo.unlockAchievement('a1');
      final unlocked = await repo.getUnlockedAchievements();
      expect(unlocked.length, 1);
      expect(unlocked.first.id, 'a1');
      expect(unlocked.first.unlockedAt, isNotNull);
    });

    test('unlockAchievement 幂等：重复解锁不覆盖时间', () async {
      await repo.unlockAchievement('a1');
      final first = (await repo.getUnlockedAchievements()).first;
      await Future<void>.delayed(const Duration(milliseconds: 10));
      await repo.unlockAchievement('a1');
      final second = (await repo.getUnlockedAchievements()).first;
      expect(second.unlockedAt, first.unlockedAt);
    });
  });
}
