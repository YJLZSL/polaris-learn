import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:markdown/markdown.dart' as md;

/// Markdown 渲染组件。
///
/// 基于 [flutter_markdown] 实现，支持：
/// - 代码块（等宽字体 + 主题背景色）
/// - LaTeX 数学公式（`$inline$` 与 `$$block$$`，基于 [flutter_math_fork]）
/// - 可点击链接（复制到剪贴板并提示）
/// - 适配明暗主题
class MarkdownRenderer extends StatelessWidget {
  const MarkdownRenderer({
    super.key,
    required this.data,
    this.selectable = true,
  });

  /// Markdown 文本。
  final String data;

  /// 是否支持长按选择文本。
  final bool selectable;

  @override
  Widget build(BuildContext context) {
    return MarkdownBody(
      data: data,
      selectable: selectable,
      inlineSyntaxes: [_MathBlockSyntax(), _MathInlineSyntax()],
      builders: {
        'math_block': _MathBuilder(),
        'math_inline': _MathBuilder(),
      },
      styleSheet: _buildStyleSheet(context),
      onTapLink: (text, href, title) => _onTapLink(context, href ?? ''),
    );
  }

  /// 构建适配主题的 Markdown 样式表。
  MarkdownStyleSheet _buildStyleSheet(BuildContext context) {
    final theme = Theme.of(context);
    return MarkdownStyleSheet(
      p: theme.textTheme.bodyMedium,
      h1: theme.textTheme.headlineMedium?.copyWith(
        fontWeight: FontWeight.bold,
      ),
      h2: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
      h3: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
      h4: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
      a: TextStyle(
        color: theme.colorScheme.primary,
        decoration: TextDecoration.underline,
      ),
      code: theme.textTheme.bodySmall?.copyWith(
        fontFamily: 'monospace',
        backgroundColor: theme.colorScheme.surfaceContainerHighest,
      ),
      codeblockDecoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(8),
      ),
      blockquoteDecoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }

  /// 链接点击：复制到剪贴板并提示。
  void _onTapLink(BuildContext context, String href) {
    Clipboard.setData(ClipboardData(text: href));
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text('已复制链接：$href'),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}

/// 数学块语法（`$$...$$`）。
///
/// 需在 [_MathInlineSyntax] 之前注册，优先匹配双 `$`。
class _MathBlockSyntax extends md.InlineSyntax {
  _MathBlockSyntax() : super(r'\$\$([^$]+)\$\$');

  @override
  bool onMatch(md.InlineParser parser, Match match) {
    parser.addNode(md.Element.text('math_block', match[1]!));
    return true;
  }
}

/// 内联数学语法（`$...$`）。
class _MathInlineSyntax extends md.InlineSyntax {
  _MathInlineSyntax() : super(r'\$([^$]+)\$');

  @override
  bool onMatch(md.InlineParser parser, Match match) {
    parser.addNode(md.Element.text('math_inline', match[1]!));
    return true;
  }
}

/// 数学公式构建器，使用 [flutter_math_fork] 渲染 TeX。
///
/// TeX 解析失败时回退为等宽纯文本，避免渲染崩溃。
class _MathBuilder extends MarkdownElementBuilder {
  @override
  Widget? visitElementAfterWithContext(
    BuildContext context,
    md.Element element,
    TextStyle? preferredStyle,
    TextStyle? parentStyle,
  ) {
    final tex = element.textContent;
    try {
      return Math.tex(tex);
    } on Object {
      return Text(tex, style: const TextStyle(fontFamily: 'monospace'));
    }
  }
}
