import 'package:drift/drift.dart';
import 'package:lingxi_academy/data/db/database.dart';

/// 消息仓库：封装 [Messages] 表的查询与插入操作。
class MessageRepository {
  MessageRepository(this._db);

  final LingxiDatabase _db;

  /// 获取指定对话下的全部消息，按创建时间正序（最早在前）。
  ///
  /// 可通过 [limit] 与 [offset] 实现分页：
  /// - [limit] 不为 null 时，限定返回的最大条数。
  /// - [offset] 不为 null 时，跳过前 offset 条记录。
  Future<List<Message>> getMessages(
    String conversationId, {
    int? limit,
    int? offset,
  }) {
    final query = _db.select(_db.messages)
      ..where((t) => t.conversationId.equals(conversationId))
      ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]);
    if (limit != null) {
      query.limit(limit, offset: offset);
    }
    return query.get();
  }

  /// 监听指定对话的消息流，按创建时间正序。
  Stream<List<Message>> watchMessages(String conversationId) {
    final query = _db.select(_db.messages)
      ..where((t) => t.conversationId.equals(conversationId))
      ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]);
    return query.watch();
  }

  /// 统计指定对话下的消息总数。
  Future<int> count(String conversationId) async {
    final countExpr = _db.messages.id.count();
    final result = await (_db.selectOnly(_db.messages)
          ..where(_db.messages.conversationId.equals(conversationId))
          ..addColumns([countExpr]))
        .getSingle();
    return result.read(countExpr) ?? 0;
  }

  /// 在指定对话中追加一条消息，返回完整记录。
  Future<Message> addMessage(
    String conversationId,
    String role,
    String content, {
    int tokens = 0,
  }) {
    final companion = MessagesCompanion(
      conversationId: Value(conversationId),
      role: Value(role),
      content: Value(content),
      tokens: Value(tokens),
    );
    return _db.into(_db.messages).insertReturning(companion);
  }

  /// 根据 id 删除单条消息。
  Future<void> deleteMessage(String id) {
    return (_db.delete(_db.messages)..where((t) => t.id.equals(id))).go();
  }
}
