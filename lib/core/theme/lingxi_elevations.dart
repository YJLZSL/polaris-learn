import 'package:flutter/material.dart';

/// 灵犀学院阴影层级
///
/// 提供两套阴影定义：
/// 1. **语义阴影（subtle/elevated/highlighted）**：通过 [ThemeExtension]
///    注册到主题中，用于 [LingxiCard] 等组件的语义化阴影：
///    - [subtle]：平铺卡片（1px blur，opacity 0.04，offset (0,1)）
///    - [elevated]：悬浮卡片（6px blur，opacity 0.08，offset (0,2)）
///    - [highlighted]：强调卡片/对话框（12px blur，opacity 0.12，offset (0,4)）
/// 2. **静态层级（level0~level4）**：5 个层级 [BoxShadow] 静态常量，
///    遵循 Material 3 海拔规范，保留以向下兼容。
///
/// 亮色模式使用黑色阴影，暗色模式下使用更高 opacity 的黑色阴影
/// （颜色更深、opacity 略高）以保证在深色表面上可见。
///
/// 典型用法：
/// ```dart
/// // 方式 1：通过 ThemeExtension 读取语义阴影
/// final elevations = Theme.of(context).extension<LingxiElevations>()!;
/// BoxDecoration(boxShadow: elevations.elevated)
///
/// // 方式 2：使用静态层级（向下兼容）
/// BoxDecoration(boxShadow: LingxiElevations.level2BoxShadow(context))
/// ```
class LingxiElevations extends ThemeExtension<LingxiElevations> {
  const LingxiElevations({
    required this.subtle,
    required this.elevated,
    required this.highlighted,
  });

  // ============== 语义阴影：实例字段 ==============

  /// Subtle：平铺卡片（1px blur，opacity 0.04，offset (0,1)）
  ///
  /// 用于扁平、静态的卡片，提供极轻微的深度暗示。
  final List<BoxShadow> subtle;

  /// Elevated：悬浮卡片（6px blur，opacity 0.08，offset (0,2)）
  ///
  /// 用于悬浮或可交互的卡片，是 [LingxiCard] 的默认阴影档位。
  final List<BoxShadow> elevated;

  /// Highlighted：强调卡片/对话框（12px blur，opacity 0.12，offset (0,4)）
  ///
  /// 用于强调卡片、对话框、模态浮层等需要突出展示的元素。
  final List<BoxShadow> highlighted;

  // ============== light / dark 实例 ==============

  /// 亮色模式实例
  ///
  /// 使用标准 opacity 的黑色阴影：
  /// - subtle: 4% opacity (0x0A)
  /// - elevated: 8% opacity (0x14)
  /// - highlighted: 12% opacity (0x1F)
  static const LingxiElevations light = LingxiElevations(
    subtle: <BoxShadow>[
      BoxShadow(
        color: Color(0x0A000000), // 黑色 4% 透明度
        blurRadius: 1,
        offset: Offset(0, 1),
      ),
    ],
    elevated: <BoxShadow>[
      BoxShadow(
        color: Color(0x14000000), // 黑色 8% 透明度
        blurRadius: 6,
        offset: Offset(0, 2),
      ),
    ],
    highlighted: <BoxShadow>[
      BoxShadow(
        color: Color(0x1F000000), // 黑色 12% 透明度
        blurRadius: 12,
        offset: Offset(0, 4),
      ),
    ],
  );

  /// 暗色模式实例
  ///
  /// 在深色表面上，阴影需更高 opacity 才可见，统一使用更深（更不透明）的
  /// 黑色阴影以呈现"下沉"效果：
  /// - subtle: 10% opacity (0x1A)
  /// - elevated: 14% opacity (0x24)
  /// - highlighted: 18% opacity (0x2E)
  static const LingxiElevations dark = LingxiElevations(
    subtle: <BoxShadow>[
      BoxShadow(
        color: Color(0x1A000000), // 黑色 10% 透明度
        blurRadius: 1,
        offset: Offset(0, 1),
      ),
    ],
    elevated: <BoxShadow>[
      BoxShadow(
        color: Color(0x24000000), // 黑色 14% 透明度
        blurRadius: 6,
        offset: Offset(0, 2),
      ),
    ],
    highlighted: <BoxShadow>[
      BoxShadow(
        color: Color(0x2E000000), // 黑色 18% 透明度
        blurRadius: 12,
        offset: Offset(0, 4),
      ),
    ],
  );

  // ============== ThemeExtension 实现 ==============

  @override
  LingxiElevations copyWith({
    List<BoxShadow>? subtle,
    List<BoxShadow>? elevated,
    List<BoxShadow>? highlighted,
  }) {
    return LingxiElevations(
      subtle: subtle ?? this.subtle,
      elevated: elevated ?? this.elevated,
      highlighted: highlighted ?? this.highlighted,
    );
  }

  @override
  LingxiElevations lerp(LingxiElevations? other, double t) {
    if (other == null) {
      return this;
    }
    return LingxiElevations(
      subtle: BoxShadow.lerpList(subtle, other.subtle, t)!,
      elevated: BoxShadow.lerpList(elevated, other.elevated, t)!,
      highlighted: BoxShadow.lerpList(highlighted, other.highlighted, t)!,
    );
  }

  // ============== 静态层级（向下兼容）==============
  //
  // 以下为原有的 5 个层级 [BoxShadow] 静态常量与辅助方法，保留以向下兼容
  // 现有调用方。新代码请优先使用上述语义阴影字段或 [BuildContext] 扩展。

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
            color: Colors.white.withValues(alpha: darkOpacity),
            blurRadius: s.blurRadius,
            spreadRadius: s.spreadRadius,
            offset: s.offset,
            blurStyle: s.blurStyle,
          ),
        )
        .toList(growable: false);
  }
}

/// 便捷扩展：从 [BuildContext] 获取 [LingxiElevations]
extension LingxiElevationsX on BuildContext {
  /// 获取当前主题中注册的灵犀阴影扩展；未注册时回退到亮色实例
  LingxiElevations get lingxiElevations =>
      Theme.of(this).extension<LingxiElevations>() ?? LingxiElevations.light;
}
