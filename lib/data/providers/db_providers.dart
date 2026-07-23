import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/repositories/achievement_repository.dart';
import 'package:lingxi_academy/data/repositories/conversation_repository.dart';
import 'package:lingxi_academy/data/repositories/learner_profile_repository.dart';
import 'package:lingxi_academy/data/repositories/learning_event_repository.dart';
import 'package:lingxi_academy/data/repositories/message_repository.dart';
import 'package:lingxi_academy/data/repositories/note_repository.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';
import 'package:lingxi_academy/data/repositories/settings_repository.dart';

/// 数据库单例 Provider。
///
/// 应用启动时通过 [LingxiDatabase.open] 创建跨端连接，全局共享同一实例。
/// 测试时可通过 `overrideWith` 注入内存数据库。
final databaseProvider = Provider<LingxiDatabase>((ref) {
  final db = LingxiDatabase.open();
  ref.onDispose(db.close);
  return db;
});

/// 对话仓库 Provider。
final conversationRepositoryProvider =
    Provider<ConversationRepository>((ref) {
  return ConversationRepository(ref.watch(databaseProvider));
});

/// 消息仓库 Provider。
final messageRepositoryProvider = Provider<MessageRepository>((ref) {
  return MessageRepository(ref.watch(databaseProvider));
});

/// 笔记仓库 Provider。
final noteRepositoryProvider = Provider<NoteRepository>((ref) {
  return NoteRepository(ref.watch(databaseProvider));
});

/// 学习进度仓库 Provider。
final progressRepositoryProvider = Provider<ProgressRepository>((ref) {
  return ProgressRepository(ref.watch(databaseProvider));
});

/// 设置仓库 Provider。
final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository(ref.watch(databaseProvider));
});

/// 成就仓库 Provider。
final achievementRepositoryProvider =
    Provider<AchievementRepository>((ref) {
  return AchievementRepository(ref.watch(databaseProvider));
});

/// 学习者画像仓库 Provider。
final learnerProfileRepositoryProvider =
    Provider<LearnerProfileRepository>((ref) {
  return LearnerProfileRepository(ref.watch(databaseProvider));
});
