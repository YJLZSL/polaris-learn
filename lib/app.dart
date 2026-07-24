import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/core/router/app_router.dart';
import 'package:lingxi_academy/core/theme/app_theme.dart';
import 'package:lingxi_academy/features/progress/celebration_service.dart';
import 'package:lingxi_academy/features/update/update_controller.dart';
import 'package:lingxi_academy/features/update/update_dialog.dart';
import 'package:lingxi_academy/features/update/update_state.dart';

/// 灵犀学院应用根 Widget。
///
/// 使用 `MaterialApp.router`，路由配置由 [goRouterProvider] 提供，
/// 主题由 `AppTheme` 提供。外层包裹 [GlobalCelebrationLayer] 支持全局粒子庆祝。
class LingxiApp extends ConsumerStatefulWidget {
  const LingxiApp({super.key});

  @override
  ConsumerState<LingxiApp> createState() => _LingxiAppState();
}

class _LingxiAppState extends ConsumerState<LingxiApp> {
  /// 防止更新弹窗重复弹出（同一会话只弹一次）。
  bool _updateDialogShown = false;

  @override
  void initState() {
    super.initState();
    // 启动后延迟 3 秒静默检查更新（避免与首屏渲染争抢资源）。
    // 节流逻辑由 UpdateController 内部处理（24 小时窗口）。
    Future.delayed(const Duration(seconds: 3), () {
      if (!mounted) return;
      ref.read(updateControllerProvider.notifier).checkForUpdates(
            force: false,
            silent: true,
          );
    });
  }

  void _maybeShowUpdateDialog(UpdateState state) {
    // 仅在后台静默检查发现新版本时自动弹窗（同一会话只弹一次）
    if (state.status == UpdateStatus.available &&
        state.fromBackground &&
        !_updateDialogShown) {
      _updateDialogShown = true;
      final context = this.context;
      if (context.mounted) {
        UpdateDialog.show(context, force: false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // 监听更新状态：后台检查发现新版本时自动弹窗
    ref.listen<UpdateState>(updateControllerProvider, (previous, next) {
      _maybeShowUpdateDialog(next);
    });

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
