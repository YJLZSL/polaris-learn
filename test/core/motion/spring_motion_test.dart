// ignore_for_file: lines_longer_than_80_lines

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart' as physics;
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';

/// SpringMotion 单元测试。
///
/// 覆盖 6 档弹簧参数存在性、M3 规范参数检查、fastSpeed settle time ≤ 150ms、
/// 各档 settle time 单调递增、reduceMotion 降级逻辑、
/// entranceCurve / exitCurve 曲线类型。
void main() {
  group('SpringMotion 弹簧参数存在性', () {
    test('6 档弹簧参数存在且为 SpringDescription', () {
      expect(SpringMotion.microSpeed, isA<physics.SpringDescription>());
      expect(SpringMotion.fastSpeed, isA<physics.SpringDescription>());
      expect(SpringMotion.defaultSpeed, isA<physics.SpringDescription>());
      expect(SpringMotion.gentleSpeed, isA<physics.SpringDescription>());
      expect(SpringMotion.slowSpeed, isA<physics.SpringDescription>());
      expect(SpringMotion.bouncySpeed, isA<physics.SpringDescription>());
    });
  });

  group('SpringMotion M3 规范参数检查', () {
    test('所有弹簧参数 damping > 0, stiffness > 0, mass > 0', () {
      final springs = [
        SpringMotion.microSpeed,
        SpringMotion.fastSpeed,
        SpringMotion.defaultSpeed,
        SpringMotion.gentleSpeed,
        SpringMotion.slowSpeed,
        SpringMotion.bouncySpeed,
      ];
      for (final spring in springs) {
        expect(
          spring.damping,
          greaterThan(0),
          reason: 'damping 应 > 0',
        );
        expect(
          spring.stiffness,
          greaterThan(0),
          reason: 'stiffness 应 > 0',
        );
        expect(
          spring.mass,
          greaterThan(0),
          reason: 'mass 应 > 0',
        );
      }
    });
  });

  group('SpringMotion settlingTime', () {
    /// 项目文档使用的 settle time 估算公式：T_s ≈ 8·m/c
    double estimateSettleMs(physics.SpringDescription s) =>
        8.0 * s.mass / s.damping * 1000;

    test('fastSpeed 的 settlingTime ≤ 150ms（v0.3.0 已修复为 148ms）', () {
      final settleMs = estimateSettleMs(SpringMotion.fastSpeed);
      expect(
        settleMs,
        lessThanOrEqualTo(150.0),
        reason: 'fastSpeed settle time 应 ≤ 150ms，实际: ${settleMs}ms',
      );
    });

    test('各档 settlingTime 单调递增（micro < fast < default < gentle < slow）',
        () {
      final micro = estimateSettleMs(SpringMotion.microSpeed);
      final fast = estimateSettleMs(SpringMotion.fastSpeed);
      final def = estimateSettleMs(SpringMotion.defaultSpeed);
      final gentle = estimateSettleMs(SpringMotion.gentleSpeed);
      final slow = estimateSettleMs(SpringMotion.slowSpeed);

      expect(micro, lessThan(fast), reason: 'micro($micro) < fast($fast)');
      expect(fast, lessThan(def), reason: 'fast($fast) < default($def)');
      expect(def, lessThan(gentle), reason: 'default($def) < gentle($gentle)');
      expect(gentle, lessThan(slow), reason: 'gentle($gentle) < slow($slow)');
    });

    test('fastSpeed 通过 SpringSimulation 仿真 settle time 合理', () {
      // 使用实际 SpringSimulation 验证 settle time（1% 容差）
      final sim = physics.SpringSimulation(
        SpringMotion.fastSpeed,
        0.0,
        1.0,
        0.0,
      );
      sim.tolerance = const physics.Tolerance(
        distance: 0.01,
        velocity: 0.01,
      );
      double t = 0.0;
      const dt = 0.0005; // 0.5ms 步长
      while (!sim.isDone(t) && t < 5.0) {
        t += dt;
      }
      // 仿真 settle time 应在合理范围（≤ 200ms，留余量）
      expect(
        t * 1000,
        lessThanOrEqualTo(200.0),
        reason: 'SpringSimulation 仿真 fastSpeed settle time: ${t * 1000}ms',
      );
    });

    test('bouncySpeed 为欠阻尼弹簧（damping ratio < 1）', () {
      // bouncySpeed 应允许超调，damping ratio ζ = c / (2·sqrt(k·m))
      final spring = SpringMotion.bouncySpeed;
      final zeta =
          spring.damping / (2 * math.sqrt(spring.stiffness * spring.mass));
      expect(
        zeta,
        lessThan(1.0),
        reason: 'bouncySpeed 应为欠阻尼（ζ < 1），实际 ζ = $zeta',
      );
    });
  });

  group('SpringMotion 曲线', () {
    test('entranceCurve 存在且为 Curve 类型', () {
      expect(SpringMotion.entranceCurve, isA<Curve>());
    });

    test('exitCurve 存在且为 Curve 类型', () {
      expect(SpringMotion.exitCurve, isA<Curve>());
    });

    test('entranceCurve 与 exitCurve 行为不同', () {
      // entranceCurve = Curves.easeOutCubic, exitCurve = Curves.easeInCubic
      // 在 t=0.5 时应有不同值
      expect(
        SpringMotion.entranceCurve.transform(0.5),
        isNot(equals(SpringMotion.exitCurve.transform(0.5))),
        reason: 'entranceCurve 与 exitCurve 在 t=0.5 应有不同值',
      );
    });
  });

  group('SpringMotion reduceMotion 降级', () {
    testWidgets('reduceMotionOf 在 disableAnimations=true 时返回 true',
        (tester) async {
      late BuildContext capturedContext;
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(disableAnimations: true),
            child: Builder(
              builder: (context) {
                capturedContext = context;
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      );

      expect(
        SpringMotion.reduceMotionOf(capturedContext),
        isTrue,
        reason: 'disableAnimations=true 时 reduceMotionOf 应返回 true',
      );
    });

    testWidgets('reduceMotionOf 在 disableAnimations=false 时返回 false',
        (tester) async {
      late BuildContext capturedContext;
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(disableAnimations: false),
            child: Builder(
              builder: (context) {
                capturedContext = context;
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      );

      expect(
        SpringMotion.reduceMotionOf(capturedContext),
        isFalse,
        reason: 'disableAnimations=false 时 reduceMotionOf 应返回 false',
      );
    });

    testWidgets(
        'resolveDuration 在 reduceMotion=true 时返回 kInstantDuration',
        (tester) async {
      late BuildContext capturedContext;
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(disableAnimations: true),
            child: Builder(
              builder: (context) {
                capturedContext = context;
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      );

      final result = SpringMotion.resolveDuration(
        SpringMotion.defaultDuration,
        capturedContext,
      );
      expect(
        result,
        SpringMotion.kInstantDuration,
        reason: 'reduceMotion=true 时应返回 kInstantDuration',
      );
      expect(
        result.inMilliseconds,
        0,
        reason: 'kInstantDuration 应为 0ms',
      );
    });

    testWidgets(
        'resolveDuration 在 reduceMotion=false 时返回传入的 normal 时长',
        (tester) async {
      late BuildContext capturedContext;
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(disableAnimations: false),
            child: Builder(
              builder: (context) {
                capturedContext = context;
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      );

      final result = SpringMotion.resolveDuration(
        SpringMotion.defaultDuration,
        capturedContext,
      );
      expect(
        result,
        SpringMotion.defaultDuration,
        reason: 'reduceMotion=false 时应返回传入的 normal 时长',
      );
    });
  });

  group('SpringMotion 时长常量', () {
    test('kInstantDuration 为 Duration.zero', () {
      expect(SpringMotion.kInstantDuration, Duration.zero);
    });

    test('各档时长常量存在且符合 M3 上限', () {
      expect(
        SpringMotion.microDuration.inMilliseconds,
        lessThanOrEqualTo(100),
        reason: 'microDuration 应 ≤ 100ms',
      );
      expect(
        SpringMotion.fastDuration.inMilliseconds,
        lessThanOrEqualTo(150),
        reason: 'fastDuration 应 ≤ 150ms',
      );
      expect(
        SpringMotion.defaultDuration.inMilliseconds,
        lessThanOrEqualTo(200),
        reason: 'defaultDuration 应 ≤ 200ms',
      );
      expect(
        SpringMotion.gentleDuration.inMilliseconds,
        lessThanOrEqualTo(250),
        reason: 'gentleDuration 应 ≤ 250ms',
      );
      expect(
        SpringMotion.slowDuration.inMilliseconds,
        lessThanOrEqualTo(300),
        reason: 'slowDuration 应 ≤ 300ms',
      );
      expect(
        SpringMotion.bouncyDuration.inMilliseconds,
        lessThanOrEqualTo(350),
        reason: 'bouncyDuration 应 ≤ 350ms',
      );
    });
  });
}
