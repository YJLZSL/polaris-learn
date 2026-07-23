// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/features/ai/confusion_detection_service.dart';

void main() {
  group('ConfusionDetectionService 困惑信号识别', () {
    test('识别困惑关键词', () {
      final service = ConfusionDetectionService();
      expect(service.analyzeMessage('c1', '不知道'), isTrue);
      expect(service.analyzeMessage('c1', '我不懂这个'), isTrue);
      expect(service.analyzeMessage('c1', '不明白'), isTrue);
      expect(service.analyzeMessage('c1', '太难了'), isTrue);
      expect(service.analyzeMessage('c1', '什么意思'), isTrue);
    });

    test('识别中英文问号与省略号', () {
      final service = ConfusionDetectionService();
      expect(service.analyzeMessage('c1', '?'), isTrue);
      expect(service.analyzeMessage('c1', '？'), isTrue);
      expect(service.analyzeMessage('c1', '...'), isTrue);
      expect(service.analyzeMessage('c1', '……'), isTrue);
    });

    test('识别极短回复（<=4 字符）', () {
      final service = ConfusionDetectionService();
      expect(service.analyzeMessage('c1', '嗯'), isTrue);
      expect(service.analyzeMessage('c1', '啊'), isTrue);
      expect(service.analyzeMessage('c1', 'abc'), isTrue);
      expect(service.analyzeMessage('c1', 'abcd'), isTrue);
    });

    test('长度恰好 5 字符的回复不视为困惑', () {
      final service = ConfusionDetectionService();
      expect(service.analyzeMessage('c1', 'abcde'), isFalse);
    });

    test('正常回答不视为困惑', () {
      final service = ConfusionDetectionService();
      expect(
        service.analyzeMessage('c1', '我认为变量就像一个装东西的盒子'),
        isFalse,
      );
      expect(
        service.analyzeMessage('c1', '函数是把输入转换成输出的工具'),
        isFalse,
      );
    });

    test('空白消息不视为困惑', () {
      final service = ConfusionDetectionService();
      expect(service.analyzeMessage('c1', ''), isFalse);
      expect(service.analyzeMessage('c1', '   '), isFalse);
    });
  });

  group('ConfusionDetectionService 困惑计数与阈值', () {
    test('连续困惑信号累加计数', () {
      final service = ConfusionDetectionService();
      service.analyzeMessage('c1', '不知道');
      expect(service.getConfusionCount('c1'), 1);
      service.analyzeMessage('c1', '不懂');
      expect(service.getConfusionCount('c1'), 2);
      service.analyzeMessage('c1', '太难了');
      expect(service.getConfusionCount('c1'), 3);
    });

    test('未达阈值时不应降级', () {
      final service = ConfusionDetectionService();
      service.analyzeMessage('c1', '不知道');
      service.analyzeMessage('c1', '不懂');
      expect(service.shouldDegradeToDirectMode('c1'), isFalse);
    });

    test('达到阈值（连续 3 次）时应降级', () {
      final service = ConfusionDetectionService();
      service.analyzeMessage('c1', '不知道');
      service.analyzeMessage('c1', '不懂');
      service.analyzeMessage('c1', '太难了');
      expect(service.getConfusionCount('c1'), 3);
      expect(service.shouldDegradeToDirectMode('c1'), isTrue);
    });

    test('超过阈值仍保持降级状态', () {
      final service = ConfusionDetectionService();
      for (var i = 0; i < 5; i++) {
        service.analyzeMessage('c1', '不知道');
      }
      expect(service.getConfusionCount('c1'), 5);
      expect(service.shouldDegradeToDirectMode('c1'), isTrue);
    });

    test('阈值边界：2 次不降级，3 次降级', () {
      final service = ConfusionDetectionService();
      service.analyzeMessage('c1', '?');
      service.analyzeMessage('c1', '?');
      expect(service.shouldDegradeToDirectMode('c1'), isFalse,
          reason: '2 次未达阈值');
      service.analyzeMessage('c1', '?');
      expect(service.shouldDegradeToDirectMode('c1'), isTrue,
          reason: '3 次达到阈值');
    });
  });

  group('ConfusionDetectionService 重置与降级', () {
    test('正确回答重置困惑计数', () {
      final service = ConfusionDetectionService();
      service.analyzeMessage('c1', '不知道');
      service.analyzeMessage('c1', '不懂');
      expect(service.getConfusionCount('c1'), 2);

      // 用户给出正常回答
      service.analyzeMessage('c1', '变量是用来存储数据的容器');
      expect(service.getConfusionCount('c1'), 0);
      expect(service.shouldDegradeToDirectMode('c1'), isFalse);
    });

    test('resetConfusion 清除指定对话的困惑状态', () {
      final service = ConfusionDetectionService();
      service.analyzeMessage('c1', '不知道');
      service.analyzeMessage('c1', '不懂');
      service.analyzeMessage('c1', '太难了');
      expect(service.shouldDegradeToDirectMode('c1'), isTrue);

      service.resetConfusion('c1');
      expect(service.getConfusionCount('c1'), 0);
      expect(service.shouldDegradeToDirectMode('c1'), isFalse);
    });

    test('重置后再次连续困惑可重新触发降级', () {
      final service = ConfusionDetectionService();
      for (var i = 0; i < 3; i++) {
        service.analyzeMessage('c1', '不知道');
      }
      expect(service.shouldDegradeToDirectMode('c1'), isTrue);

      service.resetConfusion('c1');
      expect(service.shouldDegradeToDirectMode('c1'), isFalse);

      for (var i = 0; i < 3; i++) {
        service.analyzeMessage('c1', '不会');
      }
      expect(service.shouldDegradeToDirectMode('c1'), isTrue);
    });

    test('getDegradationHint 返回非空提示消息', () {
      final service = ConfusionDetectionService();
      final hint = service.getDegradationHint();
      expect(hint, isNotEmpty);
      expect(hint.contains('直接'), isTrue);
    });
  });

  group('ConfusionDetectionService 多对话隔离', () {
    test('不同对话的困惑计数互不影响', () {
      final service = ConfusionDetectionService();
      service.analyzeMessage('c1', '不知道');
      service.analyzeMessage('c1', '不懂');
      service.analyzeMessage('c2', '不知道');

      expect(service.getConfusionCount('c1'), 2);
      expect(service.getConfusionCount('c2'), 1);
      expect(service.shouldDegradeToDirectMode('c1'), isFalse);
      expect(service.shouldDegradeToDirectMode('c2'), isFalse);
    });

    test('重置一个对话不影响其他对话', () {
      final service = ConfusionDetectionService();
      service.analyzeMessage('c1', '不知道');
      service.analyzeMessage('c1', '不懂');
      service.analyzeMessage('c2', '不知道');
      service.analyzeMessage('c2', '不懂');
      service.analyzeMessage('c2', '太难了');

      service.resetConfusion('c1');
      expect(service.getConfusionCount('c1'), 0);
      expect(service.getConfusionCount('c2'), 3);
      expect(service.shouldDegradeToDirectMode('c2'), isTrue);
    });

    test('未知对话的困惑计数为 0 且不降级', () {
      final service = ConfusionDetectionService();
      expect(service.getConfusionCount('unknown'), 0);
      expect(service.shouldDegradeToDirectMode('unknown'), isFalse);
    });
  });
}
