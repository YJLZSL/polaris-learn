import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'spring_motion.dart';

/// 灵犀学院统一页面转场动画
///
/// 为 GoRouter 提供三种转场：
/// - [buildPage]：主转场（淡入 + 上移 + 弹性缩放）
/// - [buildSlidePage]：右滑入（对话子页面等）
/// - [buildModalPage]：底部滑入（编辑器等全屏模态）
///
/// 自动检测 reduceMotion 无障碍设置并降级为简单淡入。
class LingxiPageTransitions {
  const LingxiPageTransitions._();

  /// 主转场：淡入 + 上移 12px + 弹性缩放 0.98→1.0
  ///
  /// 适用于大多数页面切换。
  static CustomTransitionPage<T> buildPage<T>({
    required BuildContext context,
    required GoRouterState state,
    required Widget child,
  }) {
    return CustomTransitionPage<T>(
      key: state.pageKey,
      child: child,
      transitionsBuilder: _buildMainTransition,
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

  static Widget _buildMainTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (SpringMotion.reduceMotionOf(context)) {
      return FadeTransition(opacity: animation, child: child);
    }

    final curved = CurvedAnimation(
      parent: animation,
      curve: SpringMotion.emphasizedDecelerate,
      reverseCurve: SpringMotion.exitCurve,
    );

    return FadeTransition(
      opacity: curved,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, 0.03),
          end: Offset.zero,
        ).animate(curved),
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.98, end: 1.0).animate(curved),
          child: child,
        ),
      ),
    );
  }

  static Widget _buildSlideTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (SpringMotion.reduceMotionOf(context)) {
      return FadeTransition(opacity: animation, child: child);
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
      return FadeTransition(opacity: animation, child: child);
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
}
