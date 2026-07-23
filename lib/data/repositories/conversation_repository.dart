import 'package:drift/drift.dart';
import 'package:lingxi_academy/data/db/database.dart';

/// 对话仓库：封装 [Conversations] 表的查询、插入、更新、删除操作。
class ConversationRepository {
  ConversationRepository(this._db);

  final LingxiDatabase _db;

  /// 获取所有对话，按更新时间倒序排列（最近使用的在前）。
  ///
  /// 可通过 [limit] 与 [offset] 实现分页：
  /// - [limit] 不为 null 时，限定返回的最大条数。
  /// - [offset] 不为 null 时，跳过前 offset 条记录。
  Future<List<Conversation>> getAllConversations({
    int? limit,
    int? offset,
  }) {
    final query = _db.select(_db.conversations)
      ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]);
    if (limit != null) {
      query.limit(limit, offset: offset);
    }
    return query.get();
  }

  /// 监听所有对话列表，按更新时间倒序。
  Stream<List<Conversation>> watchConversations() {
    final query = _db.select(_db.conversations)
      ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]);
    return query.watch();
  }

  /// 根据 id 精确查询单条对话。
  ///
  /// 不存在时返回 null。
  Future<Conversation?> getConversation(String id) async {
    final result = await (_db.select(_db.conversations)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    return result;
  }

  /// 统计对话总数。
  Future<int> count() async {
    final countExpr = _db.conversations.id.count();
    final query = _db.selectOnly(_db.conversations)
      ..addColumns([countExpr]);
    final result = await query.getSingle();
    return result.read(countExpr) ?? 0;
  }

  /// 创建一条新对话，返回完整记录（包含自动生成的 id 与默认时间戳）。
  ///
  /// 可选参数 [provider] 与 [model] 用于记录该对话使用的 AI 服务商与模型，
  /// 便于后续在对话列表中展示与区分。
  Future<Conversation> createConversation(
    String title, {
    String? provider,
    String? model,
  }) {
    final companion = ConversationsCompanion(
      title: Value(title),
      provider: provider == null ? const Value.absent() : Value(provider),
      model: model == null ? const Value.absent() : Value(model),
      updatedAt: Value(DateTime.now()),
    );
    return _db.into(_db.conversations).insertReturning(companion);
  }

  /// 根据 id 删除对话，并在同一事务中删除其关联消息。
  ///
  /// 使用事务保证两步操作的原子性：任一步骤抛出异常都会回滚，
  /// 避免出现对话已删但消息残留（孤儿数据）的情况。
  Future<void> deleteConversation(String id) {
    return _db.transaction(() async {
      await (_db.delete(_db.messages)
            ..where((t) => t.conversationId.equals(id)))
          .go();
      await (_db.delete(_db.conversations)..where((t) => t.id.equals(id)))
          .go();
    });
  }

  /// 更新对话标题，并刷新 [Conversations.updatedAt]。
  Future<void> updateTitle(String id, String title) {
    return (_db.update(_db.conversations)
          ..where((t) => t.id.equals(id)))
        .write(ConversationsCompanion(
      title: Value(title),
      updatedAt: Value(DateTime.now()),
    ));
  }
}
