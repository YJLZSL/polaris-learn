import 'package:flutter/material.dart';

/// 灵犀学院自定义渐变扩展
///
/// 通过 [ThemeExtension] 注册到主题中，提供吉祥物区域、Streak 火焰、
/// 成就徽章、庆祝动画、成功状态等场景的语义化渐变。
class LingxiGradients extends ThemeExtension<LingxiGradients> {
  const LingxiGradients({
    required this.mascotHero,
    required this.streakFire,
    required this.achievementGold,
    required this.primarySurface,
    required this.celebration,
    required this.success,
  });

  /// 吉祥物区域的径向辉光渐变（紫色 8% 透明度 → 透明）
  ///
  /// 用于首页吉祥物背后的柔和光晕，营造星空紫氛围。
  final RadialGradient mascotHero;

  /// Streak 连续学习火焰渐变（橙 → 红），对角线方向
  ///
  /// 用于连续学习天数徽章、火焰图标等激励元素。
  final LinearGradient streakFire;

  /// 成就金色渐变（金 → 琥珀）
  ///
  /// 用于成就徽章、解锁提示等金色高光场景。
  final LinearGradient achievementGold;

  /// 主色表面渐变（主色 5% 透明度 → 透明），从上到下
  ///
  /// 用于卡片顶部、AppBar 背景等需要主色氛围的表面区域。
  final LinearGradient primarySurface;

  /// 庆祝渐变（紫 → 粉 → 橙）
  ///
  /// 用于完成回复、解锁成就等庆祝场景的彩带或背景。
  final LinearGradient celebration;

  /// 成功绿色渐变（绿 → 深绿）
  ///
  /// 用于完成课时、提交成功等正向反馈场景。
  final LinearGradient success;

  /// 亮色模式渐变实例
  static const LingxiGradients light = LingxiGradients(
    mascotHero: RadialGradient(
      center: Alignment.center,
      radius: 0.8,
      colors: <Color>[
        Color(0x147C4DFF), // 紫色 8% 透明度
        Color(0x007C4DFF), // 透明
      ],
      stops: <double>[0.0, 1.0],
    ),
    streakFire: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: <Color>[
        Color(0xFFFFB74D), // 橙
        Color(0xFFFF5722), // 红
      ],
    ),
    achievementGold: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: <Color>[
        Color(0xFFFFD700), // 金
        Color(0xFFFFAB00), // 琥珀
      ],
    ),
    primarySurface: LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: <Color>[
        Color(0x0D6750A4), // 主色（种子紫）5% 透明度
        Color(0x006750A4), // 透明
      ],
    ),
    celebration: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: <Color>[
        Color(0xFF7C4DFF), // 紫
        Color(0xFFFF4081), // 粉
        Color(0xFFFFB74D), // 橙
      ],
      stops: <double>[0.0, 0.5, 1.0],
    ),
    success: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: <Color>[
        Color(0xFF66BB6A), // 绿
        Color(0xFF43A047), // 深绿
      ],
    ),
  );

  @override
  LingxiGradients copyWith({
    RadialGradient? mascotHero,
    LinearGradient? streakFire,
    LinearGradient? achievementGold,
    LinearGradient? primarySurface,
    LinearGradient? celebration,
    LinearGradient? success,
  }) {
    return LingxiGradients(
      mascotHero: mascotHero ?? this.mascotHero,
      streakFire: streakFire ?? this.streakFire,
      achievementGold: achievementGold ?? this.achievementGold,
      primarySurface: primarySurface ?? this.primarySurface,
      celebration: celebration ?? this.celebration,
      success: success ?? this.success,
    );
  }

  @override
  LingxiGradients lerp(LingxiGradients? other, double t) {
    if (other == null) {
      return this;
    }
    return LingxiGradients(
      mascotHero: _lerpRadialGradient(mascotHero, other.mascotHero, t),
      streakFire: _lerpLinearGradient(streakFire, other.streakFire, t),
      achievementGold:
          _lerpLinearGradient(achievementGold, other.achievementGold, t),
      primarySurface:
          _lerpLinearGradient(primarySurface, other.primarySurface, t),
      celebration: _lerpLinearGradient(celebration, other.celebration, t),
      success: _lerpLinearGradient(success, other.success, t),
    );
  }

  /// 在两个 [RadialGradient] 之间线性插值
  static RadialGradient _lerpRadialGradient(
    RadialGradient a,
    RadialGradient b,
    double t,
  ) {
    return RadialGradient(
      center: Alignment.lerp(a.center as Alignment, b.center as Alignment, t)!,
      radius: a.radius + (b.radius - a.radius) * t,
      colors: _lerpColorList(a.colors, b.colors, t),
      stops: _lerpStops(a.stops, b.stops, t),
      tileMode: t < 0.5 ? a.tileMode : b.tileMode,
      focal: t < 0.5 ? a.focal : b.focal,
      focalRadius:
          a.focalRadius + (b.focalRadius - a.focalRadius) * t,
    );
  }

  /// 在两个 [LinearGradient] 之间线性插值
  static LinearGradient _lerpLinearGradient(
    LinearGradient a,
    LinearGradient b,
    double t,
  ) {
    return LinearGradient(
      begin: Alignment.lerp(a.begin as Alignment, b.begin as Alignment, t)!,
      end: Alignment.lerp(a.end as Alignment, b.end as Alignment, t)!,
      colors: _lerpColorList(a.colors, b.colors, t),
      stops: _lerpStops(a.stops, b.stops, t),
      tileMode: t < 0.5 ? a.tileMode : b.tileMode,
    );
  }

  /// 对颜色列表逐色插值
  static List<Color> _lerpColorList(List<Color> a, List<Color> b, double t) {
    assert(a.length == b.length, '渐变颜色列表长度必须一致才能插值');
    return <Color>[
      for (int i = 0; i < a.length; i++) Color.lerp(a[i], b[i], t)!,
    ];
  }

  /// 对 stops 列表逐值插值
  static List<double>? _lerpStops(List<double>? a, List<double>? b, double t) {
    if (a == null || b == null) {
      return a ?? b;
    }
    assert(a.length == b.length, '渐变 stops 列表长度必须一致才能插值');
    return <double>[
      for (int i = 0; i < a.length; i++) a[i] + (b[i] - a[i]) * t,
    ];
  }
}

/// 便捷扩展：从 [BuildContext] 获取 [LingxiGradients]
extension LingxiGradientsX on BuildContext {
  /// 获取当前主题中注册的灵犀自定义渐变；未注册时回退到亮色实例
  LingxiGradients get lingxiGradients =>
      Theme.of(this).extension<LingxiGradients>() ?? LingxiGradients.light;
}
