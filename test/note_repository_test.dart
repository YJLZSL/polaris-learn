// ignore_for_file: lines_longer_than_80_lines

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/repositories/note_repository.dart';

/// 创建一个内存版 [LingxiDatabase]，测试间彼此隔离。
LingxiDatabase _createDb() =>
    LingxiDatabase.forTesting(NativeDatabase.memory());

void main() {
  group('NoteRepository CRUD', () {
    late LingxiDatabase db;
    late NoteRepository repo;

    setUp(() {
      db = _createDb();
      repo = NoteRepository(db);
    });

    tearDown(() => db.close());

    test('createNote 写入必填字段并返回完整记录', () async {
      final n = await repo.createNote(
        title: '梯度下降',
        content: '一种一阶迭代优化算法。',
        tags: 'math,ai',
      );
      expect(n.id, isNotEmpty);
      expect(n.title, '梯度下降');
      expect(n.content, '一种一阶迭代优化算法。');
      expect(n.tags, 'math,ai');
      expect(n.conversationId, isNull);
      expect(n.courseId, isNull);
      expect(n.lessonId, isNull);
      expect(n.createdAt, isNotNull);
      expect(n.updatedAt, isNotNull);
    });

    test('createNote 可选关联字段写入正确', () async {
      final n = await repo.createNote(
        title: '笔记',
        content: '内容',
        tags: '对话',
        conversationId: 'conv-1',
        courseId: 'course-1',
        lessonId: 'lesson-1',
      );
      expect(n.conversationId, 'conv-1');
      expect(n.courseId, 'course-1');
      expect(n.lessonId, 'lesson-1');
    });

    test('getAllNotes 初始为空', () async {
      final list = await repo.getAllNotes();
      expect(list, isEmpty);
    });

    test('getAllNotes 按 updatedAt 倒序返回', () async {
      final a = await repo.createNote(title: 'A', content: 'a');
      await Future<void>.delayed(const Duration(milliseconds: 10));
      final b = await repo.createNote(title: 'B', content: 'b');
      await Future<void>.delayed(const Duration(milliseconds: 10));
      final c = await repo.createNote(title: 'C', content: 'c');
      final list = await repo.getAllNotes();
      expect(list.length, 3);
      expect(list[0].id, c.id);
      expect(list[1].id, b.id);
      expect(list[2].id, a.id);
    });

    test('getAllNotes tagFilter 命中含该标签的笔记', () async {
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
      await repo.createNote(
        title: 'C',
        content: 'c',
        tags: 'flutter,ai',
      );
      final flutterOnly = await repo.getAllNotes(tagFilter: 'flutter');
      expect(flutterOnly.length, 2);
      expect(flutterOnly.map((n) => n.title).toSet(), {'A', 'C'});
    });

    test('getAllNotes tagFilter 无命中返回空列表', () async {
      await repo.createNote(title: 'A', content: 'a', tags: 'dart');
      final none = await repo.getAllNotes(tagFilter: 'rust');
      expect(none, isEmpty);
    });

    test('updateNote 更新全部字段并刷新 updatedAt', () async {
      final n = await repo.createNote(
        title: '原标题',
        content: '原内容',
        tags: 'old',
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      await repo.updateNote(
        n.id,
        title: '新标题',
        content: '新内容',
        tags: 'new,tag',
      );
      final list = await repo.getAllNotes();
      final updated = list.firstWhere((e) => e.id == n.id);
      expect(updated.title, '新标题');
      expect(updated.content, '新内容');
      expect(updated.tags, 'new,tag');
      expect(updated.updatedAt.isAfter(n.updatedAt), isTrue);
    });

    test('updateNote 仅更新传入字段，其余保持不变', () async {
      final n = await repo.createNote(
        title: '标题',
        content: '内容',
        tags: 't1,t2',
      );
      await repo.updateNote(n.id, tags: 'only-tags');
      final list = await repo.getAllNotes();
      final updated = list.firstWhere((e) => e.id == n.id);
      expect(updated.title, '标题');
      expect(updated.content, '内容');
      expect(updated.tags, 'only-tags');
    });

    test('deleteNote 删除指定记录', () async {
      final a = await repo.createNote(title: 'A', content: 'a');
      await repo.createNote(title: 'B', content: 'b');
      await repo.deleteNote(a.id);
      final list = await repo.getAllNotes();
      expect(list.length, 1);
      expect(list.any((e) => e.id == a.id), isFalse);
    });

    test('deleteNote 对不存在的 id 为空操作', () async {
      await repo.createNote(title: 'A', content: 'a');
      await repo.deleteNote('non-existent-id');
      final list = await repo.getAllNotes();
      expect(list.length, 1);
    });

    test('watchNotes 初始推送空列表，变更后推送新快照', () async {
      final first = await repo.watchNotes().first;
      expect(first, isEmpty);

      await repo.createNote(title: 'A', content: 'a');
      final second = await repo.watchNotes().first;
      expect(second.length, 1);
      expect(second.first.title, 'A');

      await repo.deleteNote(second.first.id);
      final third = await repo.watchNotes().first;
      expect(third, isEmpty);
    });

    test('完整增删改查闭环', () async {
      // 增。
      final created = await repo.createNote(
        title: '初始',
        content: '原始内容',
        tags: 'draft',
      );
      expect((await repo.getAllNotes()).length, 1);

      // 改。
      await repo.updateNote(
        created.id,
        title: '已修订',
        content: '更新后内容',
        tags: 'final',
      );
      final list = await repo.getAllNotes();
      expect(list.length, 1);
      expect(list.first.title, '已修订');
      expect(list.first.content, '更新后内容');
      expect(list.first.tags, 'final');

      // 查（标签过滤）。
      final filtered = await repo.getAllNotes(tagFilter: 'final');
      expect(filtered.length, 1);
      final missing = await repo.getAllNotes(tagFilter: 'draft');
      expect(missing, isEmpty);

      // 删。
      await repo.deleteNote(created.id);
      expect(await repo.getAllNotes(), isEmpty);
    });
  });
}
