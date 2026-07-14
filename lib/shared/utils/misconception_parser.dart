/// 从 AI 输出文本中解析 [MISCONCEPTION]...[/MISCONCEPTION] 标签的工具类。
library;

/// 误解解析结果。
class MisconceptionParseResult {
  const MisconceptionParseResult({
    required this.misconceptions,
    required this.cleanText,
  });

  /// 解析出的常见误解内容列表。
  final List<String> misconceptions;

  /// 去除标签后的纯文本。
  final String cleanText;
}

/// 误解标签解析器。
///
/// 从 AI 输出文本中提取所有 `[MISCONCEPTION]...[/MISCONCEPTION]` 标签内容，
/// 并返回去除标签后的纯文本，便于 [MarkdownRenderer] 渲染。
class MisconceptionParser {
  MisconceptionParser._();

  /// 匹配 `[MISCONCEPTION]...[/MISCONCEPTION]` 标签的正则。
  static final RegExp _pattern = RegExp(
    r'\[MISCONCEPTION\](.*?)\[/MISCONCEPTION\]',
    dotAll: true,
    caseSensitive: false,
  );

  /// 解析 [text] 中的误解标签。
  ///
  /// 返回 [MisconceptionParseResult]，其中：
  /// - [MisconceptionParseResult.misconceptions]：按出现顺序的误解内容列表。
  /// - [MisconceptionParseResult.cleanText]：去除所有标签后的纯文本。
  static MisconceptionParseResult parse(String text) {
    final misconceptions = <String>[];
    final cleanText = text.replaceAllMapped(_pattern, (match) {
      final content = match.group(1)?.trim();
      if (content != null && content.isNotEmpty) {
        misconceptions.add(content);
      }
      return '';
    });
    return MisconceptionParseResult(
      misconceptions: misconceptions,
      cleanText: cleanText,
    );
  }
}
