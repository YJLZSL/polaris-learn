import 'package:flutter/material.dart';

/// 灵犀学院阴影层级常量
///
/// 提供 5 个层级的 [BoxShadow] 定义，遵循 Material 3 海拔规范。
/// 亮色模式使用黑色阴影，暗色模式自动切换为白色低透明度阴影，
/// 以避免在深色表面上出现脏污感。
///
/// 典型用法：
/// ```dart
/// BoxDecoration(
///   boxShadow: LingxiElevations.level2BoxShadow(context),
/// )
/// ```
class LingxiElevations {
  const LingxiElevations._();

  /// Level 0：无阴影（0dp）
  ///
  /// 用于完全扁平的表面，如输入框默认态、分割线等。
  static const List<BoxShadow> level0 = <BoxShadow>[];

  /// Level 1：轻微阴影（1dp）
  ///
  /// 用于卡片默认态、Chip、低强调按钮等。
  static const List<BoxShadow> level1 = <BoxShadow>[
    BoxShadow(
      color: Color(0x0F000000), // 黑色 6% 透明度
      blurRadius: 4,
      offset: Offset(0, 1),
    ),
  ];

  /// Level 2：低海拔阴影（3dp）
  ///
  /// 用于悬浮卡片、下拉菜单、快速选择器等。
  static const List<BoxShadow> level2 = <BoxShadow>[
    BoxShadow(
      color: Color(0x14000000), // 黑色 8% 透明度
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];

  /// Level 3：中海拔阴影（6dp）
  ///
  /// 用于浮动操作按钮、对话框背景、底部弹窗等。
  static const List<BoxShadow> level3 = <BoxShadow>[
    BoxShadow(
      color: Color(0x1A000000), // 黑色 10% 透明度
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
  ];

  /// Level 4：高海拔阴影（12dp）
  ///
  /// 用于模态对话框、抽屉、Snackbar 等高亮浮层。
  static const List<BoxShadow> level4 = <BoxShadow>[
    BoxShadow(
      color: Color(0x1F000000), // 黑色 12% 透明度
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  /// 解析 Level 0 阴影（始终返回空列表）
  static List<BoxShadow> level0BoxShadow(BuildContext context) => level0;

  /// 解析 Level 1 阴影（暗色模式下使用白色阴影）
  static List<BoxShadow> level1BoxShadow(BuildContext context) {
    return _resolveShadows(context, level1, 0.06);
  }

  /// 解析 Level 2 阴影（暗色模式下使用白色阴影）
  static List<BoxShadow> level2BoxShadow(BuildContext context) {
    return _resolveShadows(context, level2, 0.08);
  }

  /// 解析 Level 3 阴影（暗色模式下使用白色阴影）
  static List<BoxShadow> level3BoxShadow(BuildContext context) {
    return _resolveShadows(context, level3, 0.10);
  }

  /// 解析 Level 4 阴影（暗色模式下使用白色阴影）
  static List<BoxShadow> level4BoxShadow(BuildContext context) {
    return _resolveShadows(context, level4, 0.12);
  }

  /// 便捷方法：根据 [level] 返回对应层级的阴影
  ///
  /// [level] 取值范围 0-4，超出范围时返回 Level 1。
  /// 自动根据当前主题亮度切换阴影颜色。
  static List<BoxShadow> of(BuildContext context, {int level = 1}) {
    switch (level) {
      case 0:
        return level0BoxShadow(context);
      case 1:
        return level1BoxShadow(context);
      case 2:
        return level2BoxShadow(context);
      case 3:
        return level3BoxShadow(context);
      case 4:
        return level4BoxShadow(context);
      default:
        return level1BoxShadow(context);
    }
  }

  /// 根据主题亮度将预定义黑色阴影转换为适配当前模式的阴影
  ///
  /// 暗色模式下将黑色替换为白色，保留相同的透明度比例，
  /// 使阴影在深色表面上呈现柔和的发光感而非脏污感。
  static List<BoxShadow> _resolveShadows(
    BuildContext context,
    List<BoxShadow> shadows,
    double darkOpacity,
  ) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    if (!isDark) {
      return shadows;
    }
    return shadows
        .map(
          (BoxShadow s) => BoxShadow(
            color: Colors.white.withOpacity(darkOpacity),
            blurRadius: s.blurRadius,
            spreadRadius: s.spreadRadius,
            offset: s.offset,
            blurStyle: s.blurStyle,
          ),
        )
        .toList(growable: false);
  }
}
