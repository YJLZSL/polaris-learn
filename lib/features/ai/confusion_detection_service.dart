import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 困惑检测服务。
///
/// 分析用户在苏格拉底对话中的回复模式，检测困惑信号。
/// 当检测到连续困惑时，建议自动降级为"直接解答"模式。
///
/// 困惑信号包括：
/// - 连续回复"不知道"、"不懂"、"？"等
/// - 连续回复长度极短（<5 字）
/// - 连续 3 次以上未能正确回答引导问题
class ConfusionDetectionService {
  ConfusionDetectionService();

  /// 困惑信号关键词。
  static const _confusionKeywords = [
    '不知道',
    '不懂',
    '不明白',
    '不理解',
    '不会',
    '看不懂',
    '太难了',
    '什么意思',
    '听不懂',
    '?',
    '？',
    '...',
    '……',
  ];

  /// 每个对话的困惑计数器（conversationId → count）。
  final Map<String, int> _confusionCounts = {};

  /// 降级阈值：连续 3 次困惑信号。
  static const int confusionThreshold = 3;

  /// 分析用户消息，返回是否检测到困惑。
  ///
  /// [conversationId] 对话标识。
  /// [userMessage] 用户的回复内容。
  ///
  /// 返回 `true` 表示检测到困惑信号。
  bool analyzeMessage(String conversationId, String userMessage) {
    final trimmed = userMessage.trim();
    final isConfused = _isConfusionSignal(trimmed);

    if (isConfused) {
      _confusionCounts[conversationId] =
          (_confusionCounts[conversationId] ?? 0) + 1;
    } else {
      // 用户正常回答，重置计数器
      _confusionCounts[conversationId] = 0;
    }

    return isConfused;
  }

  /// 检查是否应该降级为直接解答模式。
  ///
  /// 当连续困惑次数达到 [confusionThreshold] 时建议降级。
  bool shouldDegradeToDirectMode(String conversationId) {
    return (_confusionCounts[conversationId] ?? 0) >= confusionThreshold;
  }

  /// 获取当前连续困惑次数。
  int getConfusionCount(String conversationId) {
    return _confusionCounts[conversationId] ?? 0;
  }

  /// 重置某对话的困惑状态（切换模式后调用）。
  void resetConfusion(String conversationId) {
    _confusionCounts.remove(conversationId);
  }

  /// 生成困惑降级提示消息。
  String getDegradationHint() {
    return '我注意到你可能对这个知识点有些困惑，让我直接为你解释一下吧！'
        '如果你想继续通过问答方式学习，随时告诉我。';
  }

  /// 判断消息是否为困惑信号。
  bool _isConfusionSignal(String message) {
    // 极短回复（排除空消息）
    if (message.isNotEmpty && message.length <= 4) {
      return true;
    }

    // 关键词匹配
    final lower = message.toLowerCase();
    for (final keyword in _confusionKeywords) {
      if (lower.contains(keyword)) {
        return true;
      }
    }

    return false;
  }
}

/// 困惑检测服务 Provider（全局单例）。
final confusionDetectionProvider = Provider<ConfusionDetectionService>((ref) {
  return ConfusionDetectionService();
});
