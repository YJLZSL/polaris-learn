import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/shared/utils/misconception_parser.dart';

void main() {
  group('MisconceptionParser.parse', () {
    test('应解析单个误解标签并返回去除标签的纯文本', () {
      const input = '光合作用 [MISCONCEPTION]植物不需要光也能生长[/MISCONCEPTION] 哦';
      final result = MisconceptionParser.parse(input);

      expect(result.misconceptions, ['植物不需要光也能生长']);
      expect(result.cleanText, contains('光合作用'));
      expect(result.cleanText, isNot(contains('[MISCONCEPTION]')));
    });

    test('应解析多个误解标签', () {
      const input =
          '[MISCONCEPTION]误解一[/MISCONCEPTION] 中间文本 [MISCONCEPTION]误解二[/MISCONCEPTION]';
      final result = MisconceptionParser.parse(input);

      expect(result.misconceptions, ['误解一', '误解二']);
      expect(result.cleanText, contains('中间文本'));
    });

    test('无标签时返回空列表与原文本', () {
      const input = '这是一段普通文本，没有任何标签。';
      final result = MisconceptionParser.parse(input);

      expect(result.misconceptions, isEmpty);
      expect(result.cleanText, input);
    });

    test('应支持跨行误解内容', () {
      const input = '[MISCONCEPTION]第一行\n第二行[/MISCONCEPTION]';
      final result = MisconceptionParser.parse(input);

      expect(result.misconceptions, ['第一行\n第二行']);
    });

    test('应忽略空误解标签', () {
      const input = '文本 [MISCONCEPTION]   [/MISCONCEPTION] 结束';
      final result = MisconceptionParser.parse(input);

      expect(result.misconceptions, isEmpty);
      expect(result.cleanText, isNot(contains('MISCONCEPTION')));
    });

    test('标签大小写不敏感', () {
      const input = '[misconception]小写标签也生效[/MISCONCEPTION]';
      final result = MisconceptionParser.parse(input);

      expect(result.misconceptions, ['小写标签也生效']);
    });
  });
}
