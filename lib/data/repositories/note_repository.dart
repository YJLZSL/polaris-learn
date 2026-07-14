import 'package:drift/drift.dart';
import 'package:lingxi_academy/data/db/database.dart';

/// 笔记仓库：封装 [Notes] 表的查询、插入、更新、删除操作。
class NoteRepository {
  NoteRepository(this._db);

  final LingxiDatabase _db;

  /// 获取所有笔记，按更新时间倒序。
  ///
  /// 当 [tagFilter] 不为空时，仅返回 tags 列中包含该标签的笔记。
  /// 标签存储为逗号分隔字符串，使用 `LIKE` 做近似匹配。
  ///
  /// 可通过 [limit] 与 [offset] 实现分页：
  /// - [limit] 不为 null 时，限定返回的最大条数。
  /// - [offset] 不为 null 时，跳过前 offset 条记录。
  ///
  /// 分页与 [tagFilter] 可组合使用，对过滤后的结果集分页。
  Future<List<Note>> getAllNotes({
    String? tagFilter,
    int? limit,
    int? offset,
  }) {
    final query = _db.select(_db.notes)
      ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]);
    if (tagFilter != null && tagFilter.isNotEmpty) {
      // 同时匹配 "tag,..." / "...,tag,..." / "...,tag" / "tag" 四种情况。
      final escaped = tagFilter.replaceAll('%', r'\%').replaceAll('_', r'\_');
      query.where(
        (t) => t.tags.like('%$escaped%'),
      );
    }
    if (limit != null) {
      query.limit(limit, offset: offset);
    }
    return query.get();
  }

  /// 监听全部笔记列表，按更新时间倒序。
  Stream<List<Note>> watchNotes() {
    final query = _db.select(_db.notes)
      ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]);
    return query.watch();
  }

  /// 统计笔记总数。
  Future<int> count() async {
    final countExpr = _db.notes.id.count();
    final result = await _db
        .selectOnly(_db.notes)
        .addColumns([countExpr])
        .getSingle();
    return result.read(countExpr) ?? 0;
  }

  /// 创建一条笔记，返回完整记录。
  Future<Note> createNote({
    required String title,
    required String content,
    String tags = '',
    String? conversationId,
    String? courseId,
    String? lessonId,
  }) {
    final companion = NotesCompanion(
      title: Value(title),
      content: Value(content),
      tags: Value(tags),
      conversationId: Value(conversationId),
      courseId: Value(courseId),
      lessonId: Value(lessonId),
      // 显式设置 updatedAt，避免依赖 SQL 端默认值导致排序精度不足。
      updatedAt: Value(DateTime.now()),
    );
    return _db.into(_db.notes).insertReturning(companion);
  }

  /// 更新笔记的可选字段。仅传入非 null 的字段会被更新。
  Future<void> updateNote(
    String id, {
    String? title,
    String? content,
    String? tags,
  }) {
    final companion = NotesCompanion(
      title: title == null ? const Value.absent() : Value(title),
      content: content == null ? const Value.absent() : Value(content),
      tags: tags == null ? const Value.absent() : Value(tags),
      updatedAt: Value(DateTime.now()),
    );
    return (_db.update(_db.notes)..where((t) => t.id.equals(id)))
        .write(companion);
  }

  /// 根据 id 删除笔记。
  Future<void> deleteNote(String id) {
    return (_db.delete(_db.notes)..where((t) => t.id.equals(id))).go();
  }
}
