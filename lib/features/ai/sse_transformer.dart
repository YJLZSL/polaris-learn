import 'dart:async';
import 'dart:convert';

/// SSE（Server-Sent Events）解析工具。
///
/// 将 HTTP 响应字节流（或字符串流）解析为若干 `data:` 字段内容，遵循
/// [W3C SSE 规范](https://html.spec.whatwg.org/multipage/server-sent-events.html)
/// 的核心解析规则：
///
/// - 按行分割（兼容 `\n` 与 `\r\n`）。
/// - 以 `data:` 开头的行：提取冒号后的内容（去除单个前导空格）。
///   多行 `data:` 在同一事件内出现时，按规范以 `\n` 拼接为一条事件数据。
/// - 空行：事件分隔符，触发当前事件数据 emit（若有）。
/// - 以 `:` 开头的行：注释，忽略。
/// - `event:`、`id:`、`retry:` 行：忽略其内容，但仍是事件的一部分
///   （不触发 emit，仅作为元信息）。
/// - `data: [DONE]`：作为普通 data 内容输出（由上层判断是否结束）。
///
/// 输出：`Stream<String>`，每个元素是完整的一个事件 `data` 字段内容
/// （多个 data 行已按 `\n` 拼接）。
class SseTransformer {
  SseTransformer._();

  /// 解析字节流形式的 SSE 响应。
  ///
  /// 内部使用 [utf8] 解码 + [LineSplitter] 切行，处理跨 chunk 的不完整行。
  ///
  /// 注意：调用方传入的流可能是 `Stream<Uint8List>`（dio 的 ResponseBody.stream），
  /// 此处通过 `.cast<List<int>>()` 转换为 `Stream<List<int>>` 以匹配
  /// `utf8.decoder` 的输入类型（StreamTransformer 是类型不变的）。
  static Stream<String> parse(Stream<List<int>> byteStream) {
    return _parseString(
      byteStream.cast<List<int>>().transform(utf8.decoder),
    );
  }

  /// 解析字符串流形式的 SSE 响应。
  ///
  /// 暴露此方法便于测试直接构造字符串流。
  static Stream<String> parseStringStream(Stream<String> stringStream) {
    return _parseString(stringStream);
  }

  static Stream<String> _parseString(Stream<String> stringStream) async* {
    // 使用 LineSplitter 处理跨 chunk 的行边界
    final lineStream = stringStream.transform(
      const LineSplitter(), // emits 完整的每一行
    );

    // 当前事件累积的 data 行
    final dataBuffer = <String>[];

    await for (final rawLine in lineStream) {
      // 剥离可能存在的 UTF-8 BOM（\uFEFF）。
      // BOM 可能出现在首帧数据开头，或某些异常服务端在每条 data: 行开头插入。
      final line = _stripBom(rawLine);

      if (line.isEmpty) {
        // 空行 = 事件分隔符；若缓冲区有数据则 emit 并清空
        if (dataBuffer.isNotEmpty) {
          yield dataBuffer.join('\n');
          dataBuffer.clear();
        }
        continue;
      }

      if (line.startsWith(':')) {
        // 注释行，忽略
        continue;
      }

      if (line.startsWith('data:')) {
        // data: 字段，提取冒号后的内容（去除单个前导空格）
        var value = line.substring(5);
        if (value.startsWith(' ')) {
          value = value.substring(1);
        }
        dataBuffer.add(value);
        continue;
      }

      // event: / id: / retry: 等其它字段，按规范忽略内容但保留在事件内
      // 此处不做处理（不影响 data 累积）
    }

    // 流结束时若仍有未 emit 的 data（未以空行结尾的情况），flush 出来
    if (dataBuffer.isNotEmpty) {
      yield dataBuffer.join('\n');
    }
  }

  /// 剥离 UTF-8 BOM（`\uFEFF`）。
  ///
  /// 仅剥离行首的单个 BOM 字符，不影响行内其它内容。BOM 可能由部分
  /// 服务端在首帧或每条 `data:` 行开头插入，会导致 `data:` 前缀匹配失败。
  static String _stripBom(String input) {
    if (input.startsWith('\uFEFF')) {
      return input.substring(1);
    }
    return input;
  }
}
