import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/core/router/app_router.dart';
import 'package:lingxi_academy/core/theme/app_theme.dart';
import 'package:lingxi_academy/features/progress/celebration_service.dart';

/// 灵犀学院应用根 Widget。
///
/// 使用 `MaterialApp.router`，路由配置由 [goRouterProvider] 提供，
/// 主题由 `AppTheme` 提供。外层包裹 [GlobalCelebrationLayer] 支持全局粒子庆祝。
class LingxiApp extends ConsumerWidget {
  const LingxiApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeProvider);
    final router = ref.watch(goRouterProvider);

    return GlobalCelebrationLayer(
      child: MaterialApp.router(
        title: '灵犀学院',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: themeMode,
        locale: locale,
        supportedLocales: const [
          Locale('zh', 'CN'),
          Locale('en', 'US'),
        ],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        routerConfig: router,
      ),
    );
  }
}
