import 'dart:math' as math;

import 'package:flutter/animation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

/// 动画工具方法集
///
/// 提供交错动画 Interval 计算、触觉反馈包装、reduceMotion 检测等通用方法。
class AnimationUtils {
  const AnimationUtils._();

  // ── 交错动画 ────────────────────────────────────────────

  /// 计算交错动画中指定索引项的 Interval
  ///
  /// [index] 当前项索引（从 0 开始）
  /// [total] 总项数
  /// [overlap] 重叠比例（0.0~1.0），越大越紧凑。默认 0.3 表示前后项有 30% 重叠
  /// [startDelay] 整体起始延迟比例（0.0~1.0）
  static Interval staggerInterval(
    int index,
    int total, {
    double overlap = 0.3,
    double startDelay = 0.0,
  }) {
    if (total <= 1) {
      return Interval(startDelay, 1.0, curve: Curves.easeOutCubic);
    }
    final itemDuration = (1.0 - startDelay) / (total * (1 - overlap) + overlap);
    final begin = startDelay + index * itemDuration * (1 - overlap);
    final end = (begin + itemDuration).clamp(0.0, 1.0);
    return Interval(begin, end, curve: Curves.easeOutCubic);
  }

  // ── Reduce Motion 检测 ─────────────────────────────────

  /// 检测当前是否启用了 "减少动画" 无障碍设置
  static bool reduceMotionOf(BuildContext context) {
    return MediaQuery.of(context).disableAnimations;
  }

  /// 检测平台级 reduceMotion（无需 context）
  static bool get platformReduceMotion {
    return SchedulerBinding
        .instance.platformDispatcher.accessibilityFeatures.disableAnimations;
  }

  // ── 触觉反馈 ────────────────────────────────────────────

  /// 轻微触觉反馈（按钮点击、选项切换）
  static void hapticLight() {
    HapticFeedback.selectionClick();
  }

  /// 中等触觉反馈（卡片点击、页面切换）
  static void hapticMedium() {
    HapticFeedback.mediumImpact();
  }

  /// 成功触觉反馈（中震 + 延迟轻震）
  static void hapticSuccess() {
    HapticFeedback.mediumImpact();
    Future.delayed(const Duration(milliseconds: 100), () {
      HapticFeedback.lightImpact();
    });
  }

  /// 错误触觉反馈
  static void hapticError() {
    HapticFeedback.heavyImpact();
  }

  // ── 动画值工具 ──────────────────────────────────────────

  /// 将值从一个范围映射到另一个范围
  static double map(
    double value,
    double fromLow,
    double fromHigh,
    double toLow,
    double toHigh,
  ) {
    return toLow +
        (value - fromLow) / (fromHigh - fromLow) * (toHigh - toLow);
  }

  /// 夹紧到 0.0~1.0
  static double clamp01(double value) => value.clamp(0.0, 1.0);

  /// 弹性阻尼曲线计算（easeOutElastic）
  static double elasticEaseOut(double t) {
    if (t == 0 || t == 1) return t;
    return math.pow(2, -10 * t) *
            math.sin((t - 0.075) * (2 * math.pi) / 0.3) +
        1;
  }
}
