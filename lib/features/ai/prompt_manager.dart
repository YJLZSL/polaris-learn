import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// 提示词管理器。
///
/// 负责从 assets 加载苏格拉底式与直接解答两套系统提示词，并生成
/// 分级探索（简化/深入/图示）所需的辅助提示词。应用启动时通过
/// [loadPrompts] 预加载，运行期通过 [getSystemPrompt] 取用。
///
/// 加载失败时（如 assets 缺失或读取异常）会自动回退到内置兜底提示词，
/// 保证调用方拿到的提示词一定非空。
class PromptManager {
  static const _socraticPath = 'assets/prompts/socratic_system_prompt.md';
  static const _directPath = 'assets/prompts/direct_answer_prompt.md';

  /// 苏格拉底模式兜底提示词（assets 加载失败时使用）。
  static const _fallbackSocraticPrompt = '''你是一位苏格拉底式学习引导者。请遵循以下原则：
1. 不直接给出答案，而是通过提问引导学生思考
2. 鼓励学生分解问题
3. 提供适度的提示而非完整解答
4. 肯定学生的正确思路
5. 当学生多次尝试后仍困惑时，可逐步给出更多提示''';

  /// 直接解答模式兜底提示词（assets 加载失败时使用）。
  static const _fallbackDirectPrompt = '''你是一位知识渊博的学习助手。请直接回答用户的问题，提供清晰、准确的解释。''';

  String? _socraticPrompt;
  String? _directPrompt;

  /// 加载提示词文件（可在应用启动时调用）。
  ///
  /// 加载失败时使用内置兜底提示词，确保 [_socraticPrompt] 与
  /// [_directPrompt] 调用后一定非空。
  Future<void> loadPrompts() async {
    _socraticPrompt = await _loadOrDefault(_socraticPath, _fallbackSocraticPrompt);
    _directPrompt = await _loadOrDefault(_directPath, _fallbackDirectPrompt);
  }

  /// 读取指定 asset，失败时返回 [fallback]。
  ///
  /// 使用 [debugPrint] 记录失败原因（不输出敏感信息），保证返回值非空。
  Future<String> _loadOrDefault(String path, String fallback) async {
    try {
      final content = await rootBundle.loadString(path);
      if (content.isEmpty) {
        debugPrint('PromptManager: asset $path 内容为空，使用兜底提示词');
        return fallback;
      }
      return content;
    } catch (e) {
      debugPrint('PromptManager: 加载 $path 失败，使用兜底提示词: $e');
      return fallback;
    }
  }

  /// 根据是否开启苏格拉底模式返回对应系统提示词。
  ///
  /// 若提示词尚未加载，返回兜底默认提示词，保证调用方安全。
  String getSystemPrompt({required bool socraticMode}) {
    if (socraticMode) {
      return _socraticPrompt ?? _fallbackSocraticPrompt;
    }
    return _directPrompt ?? _fallbackDirectPrompt;
  }

  /// 返回苏格拉底模式系统提示词（加载后一定非空）。
  String getSocraticPrompt() => _socraticPrompt ?? _fallbackSocraticPrompt;

  /// 返回直接解答模式系统提示词（加载后一定非空）。
  String getDirectPrompt() => _directPrompt ?? _fallbackDirectPrompt;

  /// 生成"简化"分级探索提示词。
  String getSimplifyPrompt(String originalAnswer) {
    return '请用更通俗的语言、生活化的类比重新解释以下内容，适合初学者理解：\n\n$originalAnswer';
  }

  /// 生成"深入"分级探索提示词。
  String getDeeperPrompt(String originalAnswer) {
    return '请对以下内容进行更深入的讲解，包含原理推导、进阶应用和扩展知识：\n\n$originalAnswer';
  }

  /// 生成"图示"分级探索提示词。
  String getImagePrompt(String originalAnswer) {
    return '请为以下内容提供图示说明建议（用文字描述应该画什么样的图来辅助理解）：\n\n$originalAnswer';
  }
}
