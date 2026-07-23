import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'spring_motion.dart';

/// 灵犀学院统一页面转场动画
///
/// 为 GoRouter 提供三种转场：
/// - [buildPage]：主转场（淡入 + 上移，基于 [slideFadeTransitionBuilder]）
/// - [buildSlidePage]：右滑入（对话子页面等）
/// - [buildModalPage]：底部滑入（编辑器等全屏模态）
///
/// 自动检测 reduceMotion 无障碍设置并降级为即时切换（直接返回 child）。
class LingxiPageTransitions {
  const LingxiPageTransitions._();

  /// 统一的 slide + fade 过渡构建器。
  ///
  /// 作为 [CustomTransitionPage.transitionsBuilder] 使用，双端（Android /
  /// Windows）共享同一曲线与时长，确保视觉一致。
  ///
  /// - 入场曲线：[SpringMotion.entranceCurve]（easeOutCubic）
  /// - 位移：从下方 5% 滑入（[Offset] `(0.0, 0.05)` → `Offset.zero`）
  /// - 透明度：跟随 [animation] 完整淡入
  ///
  /// 当 `MediaQuery.disableAnimationsOf(context)` 为 true（reduceMotion）
  /// 时直接返回 [child]，降级为即时切换，无任何动画。
  static Widget slideFadeTransitionBuilder(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    if (reduceMotion) {
      return child;
    }
    final curved = CurvedAnimation(
      parent: animation,
      curve: SpringMotion.entranceCurve,
    );
    return FadeTransition(
      opacity: curved,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0.0, 0.05),
          end: Offset.zero,
        ).animate(curved),
        child: child,
      ),
    );
  }

  /// 主转场：淡入 + 上移，基于 [slideFadeTransitionBuilder]。
  ///
  /// 适用于大多数页面切换。三端共享同一过渡曲线，reduceMotion 时即时切换。
  static CustomTransitionPage<T> buildPage<T>({
    required BuildContext context,
    required GoRouterState state,
    required Widget child,
  }) {
    return CustomTransitionPage<T>(
      key: state.pageKey,
      child: child,
      transitionsBuilder: slideFadeTransitionBuilder,
      transitionDuration: SpringMotion.slowDuration,
      reverseTransitionDuration: SpringMotion.defaultDuration,
    );
  }

  /// 滑动转场：从右侧滑入（类似 iOS 页面推进）
  ///
  /// 适用于对话详情、笔记编辑器等子页面。
  static CustomTransitionPage<T> buildSlidePage<T>({
    required BuildContext context,
    required GoRouterState state,
    required Widget child,
  }) {
    return CustomTransitionPage<T>(
      key: state.pageKey,
      child: child,
      transitionsBuilder: _buildSlideTransition,
      transitionDuration: SpringMotion.gentleDuration,
      reverseTransitionDuration: SpringMotion.defaultDuration,
    );
  }

  /// 模态转场：从底部滑入
  ///
  /// 适用于全屏模态页面。
  static CustomTransitionPage<T> buildModalPage<T>({
    required BuildContext context,
    required GoRouterState state,
    required Widget child,
    bool fullscreenDialog = true,
  }) {
    return CustomTransitionPage<T>(
      key: state.pageKey,
      child: child,
      fullscreenDialog: fullscreenDialog,
      transitionsBuilder: _buildModalTransition,
      transitionDuration: SpringMotion.gentleDuration,
      reverseTransitionDuration: SpringMotion.defaultDuration,
    );
  }

  // ── 私有转场构建器 ──────────────────────────────────────

  static Widget _buildSlideTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (SpringMotion.reduceMotionOf(context)) {
      return child;
    }

    final curved = CurvedAnimation(
      parent: animation,
      curve: SpringMotion.entranceCurve,
      reverseCurve: SpringMotion.exitCurve,
    );

    // 新页面从右滑入，旧页面向左微移（视差效果）
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0.08, 0),
        end: Offset.zero,
      ).animate(curved),
      child: FadeTransition(
        opacity: curved,
        child: child,
      ),
    );
  }

  static Widget _buildModalTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (SpringMotion.reduceMotionOf(context)) {
      return child;
    }

    final curved = CurvedAnimation(
      parent: animation,
      curve: SpringMotion.entranceCurve,
      reverseCurve: SpringMotion.exitCurve,
    );

    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, 0.08),
        end: Offset.zero,
      ).animate(curved),
      child: FadeTransition(
        opacity: curved,
        child: child,
      ),
    );
  }

  // ── Hero 共享元素过渡 ────────────────────────────────────

  /// 吉祥物 Hero 飞行过渡的 [Hero.flightShuttleBuilder] 实现。
  ///
  /// 使用 [SpringMotion.gentleSpeed] 对应的 [SpringMotion.entranceCurve]
  /// （≈250ms 柔和过渡），在飞行过程中叠加淡入 + 0.88→1.0 缩放，
  /// 让吉祥物在首页、学习路径 AppBar、对话页空状态间切换时呈现柔和弹性。
  ///
  /// reduceMotion 下 [MascotHero] 会跳过 [Hero] 包裹，此 builder 不会被调用。
  static Widget mascotHeroFlightShuttleBuilder(
    BuildContext flightContext,
    Animation<double> animation,
    HeroFlightDirection flightDirection,
    BuildContext fromHeroContext,
    BuildContext toHeroContext,
  ) {
    // 飞行中的视觉内容使用目标 Hero 的子组件
    final Hero toHero = toHeroContext.widget as Hero;
    final curved = CurvedAnimation(
      parent: animation,
      curve: SpringMotion.entranceCurve,
      reverseCurve: SpringMotion.exitCurve,
    );
    return AnimatedBuilder(
      animation: curved,
      builder: (context, child) {
        return Opacity(
          opacity: curved.value,
          child: Transform.scale(
            scale: 0.88 + 0.12 * curved.value,
            child: child,
          ),
        );
      },
      child: toHero.child,
    );
  }
}

/// 吉祥物 Hero 共享元素动画包装器。
///
/// 在首页 hero 区、学习路径 AppBar、对话页空状态三处的 [MascotWidget] 外层
/// 包裹统一的 `mascot-hero` tag [Hero]，实现页面切换时吉祥物的共享元素过渡。
///
/// 当 `MediaQuery.disableAnimationsOf(context)` 为 true（reduceMotion）时
/// 跳过 [Hero] 包裹，直接返回 [child]，降级为即时切换。
class MascotHero extends StatelessWidget {
  const MascotHero({super.key, required this.child});

  /// 共享元素 tag：所有页面吉祥物使用同一 tag 才能联动
  static const String tag = 'mascot-hero';

  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) {
      return child;
    }
    return Hero(
      tag: tag,
      flightShuttleBuilder:
          LingxiPageTransitions.mascotHeroFlightShuttleBuilder,
      child: child,
    );
  }
}
