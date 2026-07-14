import 'package:flutter/widgets.dart';

/// 响应式布局工具
///
/// 根据屏幕宽度判断设备类型，用于在桌面三栏、平板双栏、移动单栏之间切换。
class Responsive {
  const Responsive._();

  /// 移动端：宽度 < 600
  static bool isMobile(BuildContext context) {
    return MediaQuery.sizeOf(context).width < 600;
  }

  /// 平板：600 ≤ 宽度 < 1024
  static bool isTablet(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return width >= 600 && width < 1024;
  }

  /// 桌面端：宽度 ≥ 1024
  static bool isDesktop(BuildContext context) {
    return MediaQuery.sizeOf(context).width >= 1024;
  }

  /// 按设备返回不同值
  ///
  /// 优先级：桌面 > 平板 > 移动。
  static T valueByDevice<T>(
    BuildContext context, {
    required T mobile,
    required T tablet,
    required T desktop,
  }) {
    if (isDesktop(context)) {
      return desktop;
    }
    if (isTablet(context)) {
      return tablet;
    }
    return mobile;
  }
}
