import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';

import 'package:lingxi_academy/features/ai/sse_transformer.dart';

void main() {
  group('SseTransformer.parse', () {
    test('应解析标准 data: 帧并返回内容', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('data: hello world\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['hello world']);
    });

    test('应解析多帧 data', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('data: frame1\n\ndata: frame2\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['frame1', 'frame2']);
    });

    test('应识别 [DONE] 结束标记（作为普通 data 输出，由上层判断）', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('data: [DONE]\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['[DONE]']);
    });

    test('应忽略 event: 行', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('event: message\ndata: payload\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['payload']);
    });

    test('应忽略 id: 行', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('id: 123\ndata: payload\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['payload']);
    });

    test('应忽略 retry: 行', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('retry: 5000\ndata: payload\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['payload']);
    });

    test('应忽略注释行（以 : 开头）', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode(': this is a comment\ndata: payload\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['payload']);
    });

    test('应忽略空行（不产生空输出）', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('\n\ndata: payload\n\n\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['payload']);
    });

    test('应拼接同一事件内的多行 data（按 \\n 连接）', () async {
      // SSE 规范：同一事件内多行 data 应以 \n 拼接为一条事件数据
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('data: line1\ndata: line2\ndata: line3\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['line1\nline2\nline3']);
    });

    test('应正确处理 data: 后无空格的情况', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('data:nospace\ndata: with space\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      // data: 后无空格 → 原样取 nospace；有单个空格 → 去掉前导空格
      expect(outputs, ['nospace\nwith space']);
    });

    test('应处理跨 chunk 的不完整行', () async {
      // 将一行拆到两个 chunk 中，验证 LineSplitter 能正确拼接
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('data: chunked'),
        utf8.encode(' message\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['chunked message']);
    });

    test('应处理 \\r\\n 换行符', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('data: crlf\r\n\r\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['crlf']);
    });

    test('应在流结束时 flush 未以空行结尾的 data', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('data: no trailing newline'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['no trailing newline']);
    });

    test('空 data 行应输出空字符串', () async {
      // data: 后无内容（仅前缀）应输出空字符串
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('data:\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['']);
    });

    test('应处理混合 event/id/retry/data 的事件', () async {
      final input = Stream<List<int>>.fromIterable([
        utf8.encode(
          'event: ping\n'
          'id: 42\n'
          'retry: 1000\n'
          'data: mixed event\n'
          '\n',
        ),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['mixed event']);
    });
  });

  group('SseTransformer.parseStringStream', () {
    test('应解析字符串流形式', () async {
      final input = Stream<String>.fromIterable([
        'data: hello\n\n',
      ]);
      final outputs = await SseTransformer.parseStringStream(input).toList();

      expect(outputs, ['hello']);
    });

    test('应处理跨 chunk 字符串', () async {
      final input = Stream<String>.fromIterable([
        'data: part1',
        ' part2\n\n',
      ]);
      final outputs = await SseTransformer.parseStringStream(input).toList();

      expect(outputs, ['part1 part2']);
    });
  });

  group('BOM 处理', () {
    test('首帧带 BOM 时应正确解析 data: 行（parseStringStream）', () async {
      // 首帧开头携带 UTF-8 BOM（\uFEFF），需剥离后才能匹配 data: 前缀
      final input = Stream<String>.fromIterable([
        '\uFEFFdata: hello bom\n\n',
      ]);
      final outputs = await SseTransformer.parseStringStream(input).toList();

      expect(outputs, ['hello bom']);
    });

    test('首帧带 BOM 时应正确解析 data: 行（parse 字节流）', () async {
      // 通过字节流入口验证 BOM 剥离（模拟真实 dio 响应）
      final input = Stream<List<int>>.fromIterable([
        utf8.encode('\uFEFFdata: hello bom bytes\n\n'),
      ]);
      final outputs = await SseTransformer.parse(input).toList();

      expect(outputs, ['hello bom bytes']);
    });

    test('BOM + 多行 data 的组合应正确拼接', () async {
      // 首行带 BOM，后续 data 行不带 BOM，验证多行拼接逻辑不受影响
      final input = Stream<String>.fromIterable([
        '\uFEFFdata: line1\ndata: line2\ndata: line3\n\n',
      ]);
      final outputs = await SseTransformer.parseStringStream(input).toList();

      expect(outputs, ['line1\nline2\nline3']);
    });

    test('每条 data: 行开头均带 BOM 时应全部剥离', () async {
      // 某些异常服务端可能在每条 data: 行开头插入 BOM
      final input = Stream<String>.fromIterable([
        '\uFEFFdata: a\n\uFEFFdata: b\n\n',
      ]);
      final outputs = await SseTransformer.parseStringStream(input).toList();

      expect(outputs, ['a\nb']);
    });

    test('无 BOM 时应正常工作（回归测试）', () async {
      // 确保剥离逻辑不影响无 BOM 的正常数据
      final input = Stream<String>.fromIterable([
        'data: no bom here\n\n',
      ]);
      final outputs = await SseTransformer.parseStringStream(input).toList();

      expect(outputs, ['no bom here']);
    });

    test('无 BOM 多帧数据应正常工作（回归测试）', () async {
      // 确保多帧 + 无 BOM 场景下剥离逻辑不引入回归
      final input = Stream<String>.fromIterable([
        'data: frame1\n\ndata: frame2\n\n',
      ]);
      final outputs = await SseTransformer.parseStringStream(input).toList();

      expect(outputs, ['frame1', 'frame2']);
    });

    test('BOM 后紧跟空行不应产生异常输出', () async {
      // BOM 出现在空行开头时，剥离后变为空行，应作为事件分隔符处理
      final input = Stream<String>.fromIterable([
        'data: before\n\uFEFF\ndata: after\n\n',
      ]);
      final outputs = await SseTransformer.parseStringStream(input).toList();

      expect(outputs, ['before', 'after']);
    });
  });
}
