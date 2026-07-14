import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/features/onboarding/onboarding_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{
      'onboarding_completed': false,
    });
  });

  /// 包装 OnboardingPage 为可测试的 ProviderScope 子树。
  Widget wrapOnboarding(SharedPreferences prefs) {
    return MaterialApp(
      home: ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
        ],
        child: const OnboardingPage(),
      ),
    );
  }

  group('OnboardingPage', () {
    testWidgets('应渲染 5 步引导内容的第一步', (tester) async {
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(wrapOnboarding(prefs));
      await tester.pump(const Duration(milliseconds: 500));

      // 第一步标题应可见
      expect(find.text('欢迎来到灵犀学院'), findsOneWidget);
      // 第一步 CTA "下一步" 应可见（在内容区与底部栏各一个）
      expect(find.text('下一步'), findsNWidgets(2));
      // 跳过按钮应可见
      expect(find.text('跳过'), findsOneWidget);
    });

    testWidgets('点击下一步应切换到第二步', (tester) async {
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(wrapOnboarding(prefs));
      await tester.pump(const Duration(milliseconds: 500));

      // 点击底部"下一步"按钮
      await tester.tap(find.text('下一步').last);
      await tester.pump(const Duration(milliseconds: 500));

      // 第二步标题应可见
      expect(find.text('自备 API，安全无忧'), findsOneWidget);
      expect(find.text('去设置 API'), findsOneWidget);
    });

    testWidgets('点击跳过应设置 onboarding_completed 为 true', (tester) async {
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(wrapOnboarding(prefs));
      await tester.pump(const Duration(milliseconds: 500));

      // 点击跳过
      await tester.tap(find.text('跳过'));
      await tester.pump(const Duration(milliseconds: 500));

      // SharedPreferences 中 onboarding_completed 应为 true
      expect(prefs.getBool('onboarding_completed'), isTrue);
    });

    testWidgets('应包含 PageView 且可滑动切换', (tester) async {
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(wrapOnboarding(prefs));
      await tester.pump(const Duration(milliseconds: 500));

      // 验证有 PageView
      expect(find.byType(PageView), findsOneWidget);

      // 向左滑动切换到下一页
      await tester.fling(find.byType(PageView), const Offset(-300, 0), 1000);
      await tester.pump(const Duration(milliseconds: 500));

      // 第二步标题应可见
      expect(find.text('自备 API，安全无忧'), findsOneWidget);
    });

    testWidgets('从第一步导航到最后一步应显示"开始学习"', (tester) async {
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(wrapOnboarding(prefs));
      await tester.pump(const Duration(milliseconds: 500));

      // 逐步点击"下一步"4 次，从第 1 步到第 5 步
      for (var i = 0; i < 4; i++) {
        await tester.tap(find.text('下一步').last);
        await tester.pump(const Duration(milliseconds: 500));
      }

      // 最后一步标题应可见
      expect(find.text('苏格拉底式引导'), findsOneWidget);
      // "开始学习" 按钮应出现（内容区 + 底部栏各一个）
      expect(find.text('开始学习'), findsNWidgets(2));
    });

    testWidgets('上一步按钮在第一步不显示，第二步开始显示', (tester) async {
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(wrapOnboarding(prefs));
      await tester.pump(const Duration(milliseconds: 500));

      // 第一步：无"上一步"
      expect(find.text('上一步'), findsNothing);

      // 点击下一步
      await tester.tap(find.text('下一步').last);
      await tester.pump(const Duration(milliseconds: 500));

      // 第二步：应显示"上一步"
      expect(find.text('上一步'), findsOneWidget);
    });

    testWidgets('点击"开始学习"应完成引导', (tester) async {
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(wrapOnboarding(prefs));
      await tester.pump(const Duration(milliseconds: 500));

      // 导航到最后一步
      for (var i = 0; i < 4; i++) {
        await tester.tap(find.text('下一步').last);
        await tester.pump(const Duration(milliseconds: 500));
      }

      // 点击"开始学习"
      await tester.tap(find.text('开始学习').last);
      await tester.pump(const Duration(milliseconds: 500));

      // SharedPreferences 中 onboarding_completed 应为 true
      expect(prefs.getBool('onboarding_completed'), isTrue);
    });

    testWidgets('点击上一步可回到前一页', (tester) async {
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(wrapOnboarding(prefs));
      await tester.pump(const Duration(milliseconds: 500));

      // 前进到第二步
      await tester.tap(find.text('下一步').last);
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.text('自备 API，安全无忧'), findsOneWidget);

      // 点击上一步
      await tester.tap(find.text('上一步'));
      await tester.pump(const Duration(milliseconds: 500));

      // 应回到第一步
      expect(find.text('欢迎来到灵犀学院'), findsOneWidget);
    });
  });
}
