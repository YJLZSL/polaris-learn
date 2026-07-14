import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/app.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 应用入口。
///
/// 先初始化 [SharedPreferences]，再以 `overrideWithValue` 注入到
/// [ProviderScope]，使全局 provider 可同步读取本地配置。
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const LingxiApp(),
    ),
  );
}
