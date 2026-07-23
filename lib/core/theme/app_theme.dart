import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'lingxi_colors.dart';
import 'lingxi_elevations.dart';
import 'lingxi_gradients.dart';
import 'shape_variants.dart';

/// 灵犀学院 Material 3 Expressive 主题
///
/// 以紫色调种子色生成动态配色，结合 Noto Sans SC（正文中文优先）与
/// Quicksand（标题圆润字体）字体，并注册 [LingxiColors] 自定义颜色扩展、
/// [LingxiGradients] 渐变扩展、[LingxiElevations] 语义阴影扩展。
class AppTheme {
  const AppTheme._();

  /// 主题种子色 - 紫色调，契合"灵犀"意境（Material 3 默认种子色）
  static const Color seedColor = Color(0xFF6750A4);

  /// 暗色模式 OLED trueBlack 背景
  ///
  /// 在 OLED 屏幕上使用纯黑（0xFF000000）作为 scaffold 背景可关闭像素发光，
  /// 提升对比度并降低功耗。配合 Material 3 自动生成的 surface（#141218 系列）
  /// 形成"纯黑底 + 深紫灰卡片"的视觉层级。
  static const Color darkTrueBlack = Color(0xFF000000);

  /// 亮色主题
  static ThemeData get lightTheme => _buildTheme(Brightness.light);

  /// 暗色主题
  static ThemeData get darkTheme => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: seedColor,
      brightness: brightness,
    );

    final baseTextTheme = GoogleFonts.notoSansScTextTheme(
      ThemeData(brightness: brightness, useMaterial3: true).textTheme,
    );
    final textTheme = _applyQuicksandTitles(baseTextTheme);

    final cardRadius = ShapeVariants.roundedLarge.borderRadius;
    final buttonRadius = ShapeVariants.roundedLarge.borderRadius;
    final chipRadius = ShapeVariants.roundedMedium.borderRadius;
    final inputRadius = ShapeVariants.roundedLarge.borderRadius;
    final dialogRadius = ShapeVariants.roundedExtraLarge.borderRadius;

    // 暗色模式使用 OLED trueBlack 作为 scaffold 背景，提升对比度与降低功耗；
    // colorScheme.surface 等仍由 Material 3 自动生成，保持卡片与背景的层级关系。
    final scaffoldColor = brightness == Brightness.dark
        ? darkTrueBlack
        : colorScheme.surface;

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: scaffoldColor,
      appBarTheme: AppBarThemeData(
        centerTitle: true,
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: GoogleFonts.quicksand(
          textStyle: textTheme.titleLarge,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: colorScheme.surfaceContainerLow,
        surfaceTintColor: colorScheme.surfaceTint.withValues(alpha: 0.03),
        shape: RoundedRectangleBorder(borderRadius: cardRadius),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: chipRadius),
        side: BorderSide.none,
      ),
      inputDecorationTheme: InputDecorationThemeData(
        border: OutlineInputBorder(borderRadius: inputRadius),
        enabledBorder: OutlineInputBorder(
          borderRadius: inputRadius,
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: inputRadius,
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        backgroundColor: colorScheme.surface,
        surfaceTintColor: colorScheme.surfaceTint,
      ),
      navigationRailTheme: NavigationRailThemeData(
        indicatorShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        backgroundColor: colorScheme.surface,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        shape: RoundedRectangleBorder(borderRadius: buttonRadius),
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: dialogRadius),
      ),
      snackBarTheme: SnackBarThemeData(
        shape: RoundedRectangleBorder(borderRadius: chipRadius),
        behavior: SnackBarBehavior.floating,
      ),
      buttonTheme: ButtonThemeData(
        shape: RoundedRectangleBorder(borderRadius: buttonRadius),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.windows: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.linux: ZoomPageTransitionsBuilder(),
        },
      ),
      extensions: <ThemeExtension<dynamic>>[
        brightness == Brightness.dark ? LingxiColors.dark : LingxiColors.light,
        brightness == Brightness.dark
            ? LingxiGradients.dark
            : LingxiGradients.light,
        brightness == Brightness.dark
            ? LingxiElevations.dark
            : LingxiElevations.light,
      ],
    );
  }

  /// 在正文（Noto Sans SC）基础上，将标题相关样式覆盖为 Quicksand 圆润字体
  static TextTheme _applyQuicksandTitles(TextTheme base) {
    return base.copyWith(
      displayLarge: GoogleFonts.quicksand(textStyle: base.displayLarge),
      displayMedium: GoogleFonts.quicksand(textStyle: base.displayMedium),
      displaySmall: GoogleFonts.quicksand(textStyle: base.displaySmall),
      headlineLarge: GoogleFonts.quicksand(textStyle: base.headlineLarge),
      headlineMedium: GoogleFonts.quicksand(textStyle: base.headlineMedium),
      headlineSmall: GoogleFonts.quicksand(textStyle: base.headlineSmall),
      titleLarge: GoogleFonts.quicksand(textStyle: base.titleLarge),
      titleMedium: GoogleFonts.quicksand(textStyle: base.titleMedium),
      titleSmall: GoogleFonts.quicksand(textStyle: base.titleSmall),
    );
  }
}
