// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/core/theme/lingxi_elevations.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';

/// LingxiButton 组件测试。
///
/// 覆盖 onPressed 回调、禁用态不响应点击、按压时 AnimatedScale scale=0.96、
/// 释放后 scale 回到 1.0、按压阴影从 subtle 抬升至 elevated、
/// child Widget 正确渲染。
void main() {
  Widget wrapWidget(Widget child) {
    return MaterialApp(
      home: Scaffold(
        body: Center(child: child),
      ),
    );
  }

  group('LingxiButton 回调', () {
    testWidgets('按压时触发 onPressed 回调', (tester) async {
      var pressed = false;
      await tester.pumpWidget(wrapWidget(
        LingxiButton(
          label: const Text('测试按钮'),
          onPressed: () => pressed = true,
        ),
      ));
      await tester.pump();

      await tester.tap(find.byType(LingxiButton));
      await tester.pump();

      expect(pressed, isTrue, reason: '点击后 onPressed 应被触发');
    });

    testWidgets('禁用态（onPressed: null）不响应点击且 scale 保持 1.0',
        (tester) async {
      await tester.pumpWidget(wrapWidget(
        const LingxiButton(
          label: Text('禁用按钮'),
          onPressed: null,
        ),
      ));
      await tester.pump();

      // 点击禁用按钮
      await tester.tap(find.byType(LingxiButton), warnIfMissed: false);
      await tester.pump();

      // 无异常
      expect(tester.takeException(), isNull);

      // 禁用态 scale 应保持 1.0
      final animatedScale = tester.widget<AnimatedScale>(
        find.descendant(
          of: find.byType(LingxiButton),
          matching: find.byType(AnimatedScale),
        ),
      );
      expect(
        animatedScale.scale,
        1.0,
        reason: '禁用态 scale 应为 1.0',
      );
    });
  });

  group('LingxiButton 按压动画', () {
    testWidgets('初始状态 AnimatedScale scale 为 1.0', (tester) async {
      await tester.pumpWidget(wrapWidget(
        LingxiButton(
          label: const Text('按钮'),
          onPressed: () {},
        ),
      ));
      await tester.pump();

      // AnimatedScale 存在
      expect(
        find.descendant(
          of: find.byType(LingxiButton),
          matching: find.byType(AnimatedScale),
        ),
        findsOneWidget,
        reason: 'LingxiButton 内应有 AnimatedScale',
      );

      final animatedScale = tester.widget<AnimatedScale>(
        find.descendant(
          of: find.byType(LingxiButton),
          matching: find.byType(AnimatedScale),
        ),
      );
      expect(animatedScale.scale, 1.0, reason: '初始状态 scale 应为 1.0');
    });

    testWidgets('按压时 AnimatedScale scale 值为 0.96', (tester) async {
      await tester.pumpWidget(wrapWidget(
        LingxiButton(
          label: const Text('按钮'),
          onPressed: () {},
        ),
      ));
      await tester.pump();

      // 按下
      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(LingxiButton)),
      );
      await tester.pump();

      final animatedScale = tester.widget<AnimatedScale>(
        find.descendant(
          of: find.byType(LingxiButton),
          matching: find.byType(AnimatedScale),
        ),
      );
      expect(
        animatedScale.scale,
        0.96,
        reason: '按压时 scale 应为 0.96',
      );

      await gesture.up();
      await tester.pump();
    });

    testWidgets('释放后 scale 回到 1.0', (tester) async {
      await tester.pumpWidget(wrapWidget(
        LingxiButton(
          label: const Text('按钮'),
          onPressed: () {},
        ),
      ));
      await tester.pump();

      // 按下
      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(LingxiButton)),
      );
      await tester.pump();

      // 释放
      await gesture.up();
      await tester.pump();

      final animatedScale = tester.widget<AnimatedScale>(
        find.descendant(
          of: find.byType(LingxiButton),
          matching: find.byType(AnimatedScale),
        ),
      );
      expect(
        animatedScale.scale,
        1.0,
        reason: '释放后 scale 应回到 1.0',
      );
    });
  });

  group('LingxiButton 阴影层级切换', () {
    testWidgets('初始状态阴影为 subtle', (tester) async {
      await tester.pumpWidget(wrapWidget(
        LingxiButton(
          label: const Text('按钮'),
          onPressed: () {},
        ),
      ));
      await tester.pump();

      final container = tester.widget<AnimatedContainer>(
        find.descendant(
          of: find.byType(LingxiButton),
          matching: find.byType(AnimatedContainer),
        ),
      );
      final decoration = container.decoration as BoxDecoration;
      expect(
        decoration.boxShadow,
        equals(LingxiElevations.light.subtle),
        reason: '初始状态阴影应为 subtle',
      );
    });

    testWidgets('按压时阴影从 subtle 抬升至 elevated', (tester) async {
      await tester.pumpWidget(wrapWidget(
        LingxiButton(
          label: const Text('按钮'),
          onPressed: () {},
        ),
      ));
      await tester.pump();

      // 初始状态：subtle 阴影
      var container = tester.widget<AnimatedContainer>(
        find.descendant(
          of: find.byType(LingxiButton),
          matching: find.byType(AnimatedContainer),
        ),
      );
      var decoration = container.decoration as BoxDecoration;
      expect(
        decoration.boxShadow,
        equals(LingxiElevations.light.subtle),
        reason: '初始状态阴影应为 subtle',
      );

      // 按下
      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(LingxiButton)),
      );
      await tester.pump();

      // 按压状态：elevated 阴影
      container = tester.widget<AnimatedContainer>(
        find.descendant(
          of: find.byType(LingxiButton),
          matching: find.byType(AnimatedContainer),
        ),
      );
      decoration = container.decoration as BoxDecoration;
      expect(
        decoration.boxShadow,
        equals(LingxiElevations.light.elevated),
        reason: '按压时阴影应抬升至 elevated',
      );

      await gesture.up();
      await tester.pump();
    });
  });

  group('LingxiButton 渲染', () {
    testWidgets('child Widget（label）正确渲染', (tester) async {
      await tester.pumpWidget(wrapWidget(
        LingxiButton(
          label: const Text('渲染测试'),
          onPressed: () {},
        ),
      ));
      await tester.pump();

      expect(find.text('渲染测试'), findsOneWidget);
    });

    testWidgets('带 icon 的按钮正确渲染图标和文字', (tester) async {
      await tester.pumpWidget(wrapWidget(
        LingxiButton(
          label: const Text('带图标'),
          icon: const Icon(Icons.add),
          onPressed: () {},
        ),
      ));
      await tester.pump();

      expect(find.text('带图标'), findsOneWidget);
      expect(find.byIcon(Icons.add), findsOneWidget);
    });
  });
}
