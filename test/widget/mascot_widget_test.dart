// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:lingxi_academy/features/mascot/mascot_widget.dart';

/// MascotWidget 组件测试。
///
/// 覆盖 6 种情绪下的 CustomPaint 渲染、点击 onTap 回调、enableTapInteraction
/// 开关、不同 size 下 SizedBox 尺寸、speechBubble 对话气泡渲染、
/// showAura 光晕开关。
///
/// 使用语义化断言（find.byType / find.descendant / tester.getSize），
/// 不依赖 golden test 环境。
void main() {
  /// 将被测组件包装为可测试的 MaterialApp + ProviderScope 子树。
  Widget wrapWidget(Widget child) {
    return MaterialApp(
      home: ProviderScope(
        child: Scaffold(
          body: Center(child: child),
        ),
      ),
    );
  }

  group('MascotWidget 情绪渲染', () {
    for (final mood in MascotMood.values) {
      testWidgets('情绪 $mood 下正确渲染 CustomPaint', (tester) async {
        await tester.pumpWidget(wrapWidget(
          MascotWidget(mood: mood, showAura: false),
        ));
        await tester.pump(const Duration(milliseconds: 100));

        // MascotWidget 本身存在
        expect(find.byType(MascotWidget), findsOneWidget);

        // 内部有 CustomPaint（_MascotPainter 的载体）
        final customPaintFinder = find.descendant(
          of: find.byType(MascotWidget),
          matching: find.byType(CustomPaint),
        );
        expect(
          customPaintFinder,
          findsWidgets,
          reason: '情绪 $mood 下应渲染至少一个 CustomPaint',
        );
      });
    }

    testWidgets('所有情绪渲染时不抛异常', (tester) async {
      for (final mood in MascotMood.values) {
        await tester.pumpWidget(wrapWidget(
          MascotWidget(mood: mood),
        ));
        await tester.pump(const Duration(milliseconds: 100));
        expect(tester.takeException(), isNull);
      }
    });
  });

  group('MascotWidget 点击交互', () {
    testWidgets('点击触发 onTap 回调', (tester) async {
      var tapped = 0;
      await tester.pumpWidget(wrapWidget(
        MascotWidget(
          mood: MascotMood.idle,
          onTap: () => tapped++,
        ),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      // 点击吉祥物中心
      await tester.tap(find.byType(MascotWidget));
      await tester.pump(const Duration(milliseconds: 100));

      expect(tapped, 1, reason: '点击后 onTap 回调应被调用一次');
    });

    testWidgets('enableTapInteraction 为 false 时不响应点击', (tester) async {
      var tapped = 0;
      await tester.pumpWidget(wrapWidget(
        MascotWidget(
          mood: MascotMood.idle,
          enableTapInteraction: false,
          onTap: () => tapped++,
        ),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      // 尝试点击
      await tester.tap(
        find.byType(MascotWidget),
        warnIfMissed: false,
      );
      await tester.pump(const Duration(milliseconds: 100));

      // 无 GestureDetector 时 onTap 不被调用
      expect(tapped, 0, reason: 'enableTapInteraction=false 时不应触发 onTap');

      // 确认没有 GestureDetector（enableTapInteraction=false 时不添加）
      final gestureFinder = find.descendant(
        of: find.byType(MascotWidget),
        matching: find.byType(GestureDetector),
      );
      expect(
        gestureFinder,
        findsNothing,
        reason: 'enableTapInteraction=false 时不应有 GestureDetector',
      );
    });

    testWidgets('enableTapInteraction 为 true 时存在 GestureDetector',
        (tester) async {
      await tester.pumpWidget(wrapWidget(
        const MascotWidget(mood: MascotMood.idle),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      final gestureFinder = find.descendant(
        of: find.byType(MascotWidget),
        matching: find.byType(GestureDetector),
      );
      expect(
        gestureFinder,
        findsWidgets,
        reason: 'enableTapInteraction=true（默认）时应有 GestureDetector',
      );
    });

    testWidgets('连续点击 5 次不崩溃且持续触发 onTap', (tester) async {
      var tapped = 0;
      await tester.pumpWidget(wrapWidget(
        MascotWidget(
          mood: MascotMood.idle,
          onTap: () => tapped++,
        ),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      // 连续点击 5 次（彩蛋触发点）
      for (var i = 0; i < 5; i++) {
        await tester.tap(find.byType(MascotWidget));
        await tester.pump(const Duration(milliseconds: 100));
      }

      // 每次点击都应触发 onTap
      expect(tapped, 5);
      expect(tester.takeException(), isNull);
    });
  });

  group('MascotWidget 尺寸', () {
    testWidgets('默认 size=120 下 SizedBox 尺寸正确', (tester) async {
      await tester.pumpWidget(wrapWidget(
        const MascotWidget(mood: MascotMood.idle, showAura: false),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      final sizedBoxFinder = find.descendant(
        of: find.byType(MascotWidget),
        matching: find.byType(SizedBox),
      );
      expect(sizedBoxFinder, findsWidgets);

      final sizedBox = tester.widget<SizedBox>(sizedBoxFinder.first);
      expect(sizedBox.width, 120);
      expect(sizedBox.height, 120);
    });

    testWidgets('自定义 size=80 下 SizedBox 尺寸正确', (tester) async {
      const size = 80.0;
      await tester.pumpWidget(wrapWidget(
        MascotWidget(mood: MascotMood.idle, size: size, showAura: false),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      final sizedBoxFinder = find.descendant(
        of: find.byType(MascotWidget),
        matching: find.byType(SizedBox),
      );
      expect(sizedBoxFinder, findsWidgets);

      final sizedBox = tester.widget<SizedBox>(sizedBoxFinder.first);
      expect(sizedBox.width, size);
      expect(sizedBox.height, size);
    });

    testWidgets('自定义 size=200 下 SizedBox 尺寸正确', (tester) async {
      const size = 200.0;
      await tester.pumpWidget(wrapWidget(
        MascotWidget(mood: MascotMood.idle, size: size, showAura: false),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      final sizedBoxFinder = find.descendant(
        of: find.byType(MascotWidget),
        matching: find.byType(SizedBox),
      );
      expect(sizedBoxFinder, findsWidgets);

      final sizedBox = tester.widget<SizedBox>(sizedBoxFinder.first);
      expect(sizedBox.width, size);
      expect(sizedBox.height, size);
    });

    testWidgets('不同 size 下整体渲染尺寸跟随变化', (tester) async {
      const smallSize = 80.0;
      const largeSize = 200.0;

      // 小尺寸
      await tester.pumpWidget(wrapWidget(
        MascotWidget(
          mood: MascotMood.idle,
          size: smallSize,
          showAura: false,
          enableTapInteraction: false,
        ),
      ));
      await tester.pump(const Duration(milliseconds: 100));
      final smallWidgetSize = tester.getSize(find.byType(MascotWidget));

      // 大尺寸
      await tester.pumpWidget(wrapWidget(
        MascotWidget(
          mood: MascotMood.idle,
          size: largeSize,
          showAura: false,
          enableTapInteraction: false,
        ),
      ));
      await tester.pump(const Duration(milliseconds: 100));
      final largeWidgetSize = tester.getSize(find.byType(MascotWidget));

      // 大尺寸 widget 应比小尺寸 widget 更大
      expect(
        largeWidgetSize.width > smallWidgetSize.width,
        isTrue,
        reason: 'size=200 的 widget 宽度应大于 size=80',
      );
      expect(
        largeWidgetSize.height > smallWidgetSize.height,
        isTrue,
        reason: 'size=200 的 widget 高度应大于 size=80',
      );
    });
  });

  group('MascotWidget 光晕与气泡', () {
    testWidgets('showAura 为 true 时渲染 Stack（含光晕层）', (tester) async {
      await tester.pumpWidget(wrapWidget(
        const MascotWidget(mood: MascotMood.idle, showAura: true),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      // showAura=true 时外层应有 Stack（光晕 + 吉祥物）
      final stackFinder = find.descendant(
        of: find.byType(MascotWidget),
        matching: find.byType(Stack),
      );
      expect(
        stackFinder,
        findsWidgets,
        reason: 'showAura=true 时应有 Stack 包裹光晕与吉祥物',
      );
    });

    testWidgets('showAura 为 false 时不渲染光晕 Stack', (tester) async {
      await tester.pumpWidget(wrapWidget(
        const MascotWidget(
          mood: MascotMood.idle,
          showAura: false,
          enableTapInteraction: false,
        ),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      // showAura=false 且无 speechBubble 且无 tapInteraction 时，
      // 不应有额外的 Stack（直接是 SizedBox）
      final stackFinder = find.descendant(
        of: find.byType(MascotWidget),
        matching: find.byType(Stack),
      );
      expect(
        stackFinder,
        findsNothing,
        reason: 'showAura=false 且无气泡无交互时不应有 Stack',
      );
    });

    testWidgets('speechBubble 非空时渲染对话气泡文字', (tester) async {
      const bubbleText = '欢迎来到灵犀学院';
      await tester.pumpWidget(wrapWidget(
        const MascotWidget(
          mood: MascotMood.happy,
          speechBubble: bubbleText,
        ),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      // 对话气泡文字应可见
      expect(
        find.text(bubbleText),
        findsOneWidget,
        reason: 'speechBubble 非空时应渲染气泡文字',
      );
    });

    testWidgets('speechBubble 为空时不渲染对话气泡', (tester) async {
      await tester.pumpWidget(wrapWidget(
        const MascotWidget(mood: MascotMood.idle),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      // 不应找到 _SpeechBubble 的 Text（无气泡文字）
      // 验证：MascotWidget 内不应有 maxLines=3 的 Text（气泡专属样式）
      final textWidgets = find.descendant(
        of: find.byType(MascotWidget),
        matching: find.byType(Text),
      );
      expect(
        textWidgets,
        findsNothing,
        reason: 'speechBubble 为空时不应渲染 Text',
      );
    });
  });

  group('MascotWidget 情绪切换', () {
    testWidgets('mood 变化后 CustomPaint 仍正确渲染', (tester) async {
      await tester.pumpWidget(wrapWidget(
        const MascotWidget(mood: MascotMood.idle, showAura: false),
      ));
      await tester.pump(const Duration(milliseconds: 100));

      // 初始：idle
      expect(find.byType(MascotWidget), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);

      // 切换为 happy
      await tester.pumpWidget(wrapWidget(
        const MascotWidget(mood: MascotMood.happy, showAura: false),
      ));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(MascotWidget), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);

      // 切换为 celebrate
      await tester.pumpWidget(wrapWidget(
        const MascotWidget(mood: MascotMood.celebrate, showAura: false),
      ));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(MascotWidget), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);

      expect(tester.takeException(), isNull);
    });
  });
}
