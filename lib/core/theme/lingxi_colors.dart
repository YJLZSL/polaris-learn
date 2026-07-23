import 'package:flutter/material.dart';

/// 灵犀学院自定义颜色扩展
///
/// 通过 [ThemeExtension] 注册到主题中，用于扩展 Material 3 [ColorScheme]，
/// 提供吉祥物、Streak、成就等场景的语义化颜色。
class LingxiColors extends ThemeExtension<LingxiColors> {
  const LingxiColors({
    required this.mascotPrimary,
    required this.mascotSecondary,
    required this.streakFire,
    required this.achievementGold,
    required this.socraticBlue,
    required this.misconceptionRed,
  });

  /// 吉祥物主色 - 星空紫
  final Color mascotPrimary;

  /// 吉祥物辅色 - 温暖橙
  final Color mascotSecondary;

  /// Streak 火焰红
  final Color streakFire;

  /// 成就金
  final Color achievementGold;

  /// 苏格拉底引导蓝
  final Color socraticBlue;

  /// 常见误解红
  final Color misconceptionRed;

  /// 亮色模式实例
  static const LingxiColors light = LingxiColors(
    mascotPrimary: Color(0xFF7C4DFF),
    mascotSecondary: Color(0xFFFFB74D),
    streakFire: Color(0xFFFF5722),
    achievementGold: Color(0xFFFFD700),
    socraticBlue: Color(0xFF42A5F5),
    misconceptionRed: Color(0xFFEF5350),
  );

  /// 暗色模式实例
  ///
  /// 在 OLED trueBlack 背景（`0xFF000000`，参见 [AppTheme.darkTrueBlack]）下，
  /// 配合 Material 3 自动生成的深紫灰 surface（典型 #141218）：
  /// - streakFire 使用更亮的深橙 `0xFFFF8A65` 以提升对比度
  /// - achievementGold 使用更饱和的金色 `0xFFFFD54F` 以提升对比度
  /// - mascotPrimary / socraticBlue 均为高亮色调，在纯黑背景上具备良好可读性
  static const LingxiColors dark = LingxiColors(
    mascotPrimary: Color(0xFF9D7CFF),
    mascotSecondary: Color(0xFFFFCC80),
    streakFire: Color(0xFFFF8A65),
    achievementGold: Color(0xFFFFD54F),
    socraticBlue: Color(0xFF64B5F6),
    misconceptionRed: Color(0xFFEF9A9A),
  );

  @override
  LingxiColors copyWith({
    Color? mascotPrimary,
    Color? mascotSecondary,
    Color? streakFire,
    Color? achievementGold,
    Color? socraticBlue,
    Color? misconceptionRed,
  }) {
    return LingxiColors(
      mascotPrimary: mascotPrimary ?? this.mascotPrimary,
      mascotSecondary: mascotSecondary ?? this.mascotSecondary,
      streakFire: streakFire ?? this.streakFire,
      achievementGold: achievementGold ?? this.achievementGold,
      socraticBlue: socraticBlue ?? this.socraticBlue,
      misconceptionRed: misconceptionRed ?? this.misconceptionRed,
    );
  }

  @override
  LingxiColors lerp(LingxiColors? other, double t) {
    if (other == null) {
      return this;
    }
    return LingxiColors(
      mascotPrimary: Color.lerp(mascotPrimary, other.mascotPrimary, t)!,
      mascotSecondary: Color.lerp(mascotSecondary, other.mascotSecondary, t)!,
      streakFire: Color.lerp(streakFire, other.streakFire, t)!,
      achievementGold: Color.lerp(achievementGold, other.achievementGold, t)!,
      socraticBlue: Color.lerp(socraticBlue, other.socraticBlue, t)!,
      misconceptionRed: Color.lerp(misconceptionRed, other.misconceptionRed, t)!,
    );
  }
}

/// 便捷扩展：从 [BuildContext] 获取 [LingxiColors]
extension LingxiColorsX on BuildContext {
  /// 获取当前主题中注册的灵犀自定义颜色
  LingxiColors get lingxiColors =>
      Theme.of(this).extension<LingxiColors>() ?? LingxiColors.light;
}
