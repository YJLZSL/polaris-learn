// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/features/mascot/mascot_controller.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';

/// MascotController 单元测试。
///
/// 覆盖 6 种情绪切换、triggerTap 彩蛋触发（连续 5 次）、setAiThinking 联动、
/// celebrate 3 秒恢复、triggerTap 1.5 秒恢复、mounted 检查（dispose 后
/// Future.delayed 回调安全性）、reset 重置。
///
/// 时间相关用例使用 [FakeAsync] 控制 Future.delayed 定时器。
void main() {
  group('MascotController', () {
    group('setMood', () {
      test('正确切换 6 种情绪并标记 isAnimating', () {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        final controller = container.read(mascotControllerProvider.notifier);

        for (final mood in MascotMood.values) {
          controller.setMood(mood);
          expect(
            controller.state.mood,
            mood,
            reason: 'setMood($mood) 后 state.mood 应为 $mood',
          );
          expect(
            controller.state.isAnimating,
            isTrue,
            reason: 'setMood 后 isAnimating 应为 true',
          );
        }
      });
    });

    group('triggerTap', () {
      test('单次点击后 mood 变为 happy 且 tapCount 递增为 1', () {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        final controller = container.read(mascotControllerProvider.notifier);

        expect(controller.state.tapCount, 0);

        controller.triggerTap();

        expect(controller.state.mood, MascotMood.happy);
        expect(controller.state.tapCount, 1);
      });

      test('连续 4 次点击每次 mood 为 happy 且 tapCount 递增', () {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        final controller = container.read(mascotControllerProvider.notifier);

        for (var i = 1; i <= 4; i++) {
          controller.triggerTap();
          expect(
            controller.state.mood,
            MascotMood.happy,
            reason: '第 $i 次点击后 mood 应为 happy',
          );
          expect(
            controller.state.tapCount,
            i,
            reason: '第 $i 次点击后 tapCount 应为 $i',
          );
        }
      });

      test('连续 5 次点击触发 celebrate 彩蛋并重置 tapCount 为 0', () {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        final controller = container.read(mascotControllerProvider.notifier);

        // 前 4 次
        for (var i = 0; i < 4; i++) {
          controller.triggerTap();
        }
        expect(controller.state.tapCount, 4);
        expect(controller.state.mood, MascotMood.happy);

        // 第 5 次：触发彩蛋
        controller.triggerTap();
        expect(
          controller.state.mood,
          MascotMood.celebrate,
          reason: '第 5 次点击应触发 celebrate 彩蛋',
        );
        expect(
          controller.state.tapCount,
          0,
          reason: '彩蛋触发后 tapCount 应重置为 0',
        );
      });

      test('单次点击 1.5 秒后自动恢复 idle', () {
        final container = ProviderContainer();
        final controller = container.read(mascotControllerProvider.notifier);

        FakeAsync().run((async) {
          controller.triggerTap();
          expect(controller.state.mood, MascotMood.happy);

          // 1.4 秒时仍为 happy
          async.elapse(const Duration(milliseconds: 1400));
          expect(controller.state.mood, MascotMood.happy);

          // 再过 0.1 秒（共 1.5 秒）恢复 idle
          async.elapse(const Duration(milliseconds: 100));
          expect(controller.state.mood, MascotMood.idle);
        });

        container.dispose();
      });

      test('tapCount 在时间流逝后仍保持（controller 不基于时间重置）', () {
        final container = ProviderContainer();
        final controller = container.read(mascotControllerProvider.notifier);

        FakeAsync().run((async) {
          // 点击 3 次
          controller.triggerTap();
          controller.triggerTap();
          controller.triggerTap();
          expect(controller.state.tapCount, 3);

          // 等待 1.5 秒，mood 从 happy 恢复为 idle
          async.elapse(const Duration(milliseconds: 1500));
          expect(controller.state.mood, MascotMood.idle);

          // controller 不实现时间窗口重置，tapCount 持久保留
          // （2 秒时间窗口重置逻辑在 MascotWidget._handleTap 中实现）
          expect(
            controller.state.tapCount,
            3,
            reason: 'controller 不基于时间重置 tapCount',
          );
        });

        container.dispose();
      });

      test('happy 状态被其他情绪覆盖后不因定时器恢复为 idle', () {
        final container = ProviderContainer();
        final controller = container.read(mascotControllerProvider.notifier);

        FakeAsync().run((async) {
          // 点击触发 happy + 1.5s 恢复定时器
          controller.triggerTap();
          expect(controller.state.mood, MascotMood.happy);

          // 手动切换为 celebrate（覆盖 happy）
          controller.setMood(MascotMood.celebrate);
          expect(controller.state.mood, MascotMood.celebrate);

          // 1.5 秒后，因 mood 不再是 happy，定时器回调不恢复 idle
          async.elapse(const Duration(milliseconds: 1500));
          expect(
            controller.state.mood,
            MascotMood.celebrate,
            reason: 'mood 已被覆盖为 celebrate，1.5s 定时器不应恢复 idle',
          );
        });

        container.dispose();
      });
    });

    group('setAiThinking', () {
      test('setAiThinking(true) 切换为 thinking', () {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        final controller = container.read(mascotControllerProvider.notifier);

        controller.setAiThinking(true);
        expect(controller.state.mood, MascotMood.thinking);
        expect(controller.state.isAnimating, isTrue);
      });

      test('setAiThinking(false) 切换为 idle', () {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        final controller = container.read(mascotControllerProvider.notifier);

        // 先切换为 thinking
        controller.setAiThinking(true);
        expect(controller.state.mood, MascotMood.thinking);

        // 再切换回 idle
        controller.setAiThinking(false);
        expect(controller.state.mood, MascotMood.idle);
      });
    });

    group('celebrate', () {
      test('celebrate 后 mood 切换为 celebrate 且 isAnimating 为 true', () {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        final controller = container.read(mascotControllerProvider.notifier);

        controller.celebrate();
        expect(controller.state.mood, MascotMood.celebrate);
        expect(controller.state.isAnimating, isTrue);
      });

      test('celebrate 后 3 秒自动恢复 idle', () {
        final container = ProviderContainer();
        final controller = container.read(mascotControllerProvider.notifier);

        FakeAsync().run((async) {
          controller.celebrate();
          expect(controller.state.mood, MascotMood.celebrate);

          // 2.9 秒时仍为 celebrate
          async.elapse(const Duration(milliseconds: 2900));
          expect(controller.state.mood, MascotMood.celebrate);

          // 再过 0.1 秒（共 3 秒）恢复 idle
          async.elapse(const Duration(milliseconds: 100));
          expect(controller.state.mood, MascotMood.idle);
        });

        container.dispose();
      });

      test('celebrate 在 3 秒内不提前恢复', () {
        final container = ProviderContainer();
        final controller = container.read(mascotControllerProvider.notifier);

        FakeAsync().run((async) {
          controller.celebrate();
          expect(controller.state.mood, MascotMood.celebrate);

          // 1 秒时仍为 celebrate
          async.elapse(const Duration(seconds: 1));
          expect(controller.state.mood, MascotMood.celebrate);

          // 2 秒时仍为 celebrate（共 2 秒）
          async.elapse(const Duration(seconds: 1));
          expect(controller.state.mood, MascotMood.celebrate);
        });

        container.dispose();
      });
    });

    group('mounted 检查', () {
      test('dispose 后 celebrate 的 Future.delayed 回调不修改 state', () {
        final container = ProviderContainer();
        final controller = container.read(mascotControllerProvider.notifier);

        FakeAsync().run((async) {
          controller.celebrate();
          expect(controller.state.mood, MascotMood.celebrate);

          // 在 3 秒定时器触发前 dispose，mounted 变为 false
          controller.dispose();

          // 触发 3 秒定时器：回调中 mounted 检查应阻止 setMood 调用。
          // 若 mounted 检查失效，setMood 在已 dispose 的 StateNotifier 上
          // 调用会触发 assert 异常。
          async.elapse(const Duration(seconds: 3));

          // 无异常抛出即表示 mounted 检查生效
        });

        container.dispose();
      });

      test('dispose 后 triggerTap 的 Future.delayed 回调不修改 state', () {
        final container = ProviderContainer();
        final controller = container.read(mascotControllerProvider.notifier);

        FakeAsync().run((async) {
          // 点击触发 happy + 1.5s 恢复定时器
          controller.triggerTap();
          expect(controller.state.mood, MascotMood.happy);

          // 在 1.5 秒定时器触发前 dispose
          controller.dispose();

          // 触发 1.5 秒定时器：mounted 检查应阻止 setMood 调用
          async.elapse(const Duration(milliseconds: 1500));

          // 无异常抛出即表示 mounted 检查生效
        });

        container.dispose();
      });
    });

    group('reset', () {
      test('reset 重置为初始待机状态', () {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        final controller = container.read(mascotControllerProvider.notifier);

        // 修改状态
        controller.setMood(MascotMood.celebrate);
        expect(controller.state.mood, MascotMood.celebrate);
        expect(controller.state.isAnimating, isTrue);

        controller.reset();
        expect(controller.state.mood, MascotMood.idle);
        expect(controller.state.isAnimating, isFalse);
        expect(controller.state.tapCount, 0);
      });

      test('reset 后 triggerTap 从 tapCount=0 开始计数', () {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        final controller = container.read(mascotControllerProvider.notifier);

        // 点击 3 次
        controller.triggerTap();
        controller.triggerTap();
        controller.triggerTap();
        expect(controller.state.tapCount, 3);

        // 重置后 tapCount 归零
        controller.reset();
        expect(controller.state.tapCount, 0);

        // 再次点击应从 1 开始
        controller.triggerTap();
        expect(controller.state.tapCount, 1);
      });
    });
  });
}
