// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('SocraticModeNotifier', () {
    test('初始值从 SharedPreferences 读取 (true)', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{
        'socratic_mode': true,
      });
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
      ]);
      addTearDown(container.dispose);

      expect(container.read(socraticModeProvider), isTrue);
    });

    test('初始值从 SharedPreferences 读取 (false)', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{
        'socratic_mode': false,
      });
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
      ]);
      addTearDown(container.dispose);

      expect(container.read(socraticModeProvider), isFalse);
    });

    test('未设置时默认为 true', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
      ]);
      addTearDown(container.dispose);

      expect(container.read(socraticModeProvider), isTrue);
    });

    test('toggle 后值翻转并写入 SharedPreferences', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{
        'socratic_mode': true,
      });
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
      ]);
      addTearDown(container.dispose);

      container.read(socraticModeProvider.notifier).toggle();
      expect(container.read(socraticModeProvider), isFalse);
      expect(prefs.getBool('socratic_mode'), isFalse);
    });

    test('set(true) 后值持久化', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{
        'socratic_mode': false,
      });
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
      ]);
      addTearDown(container.dispose);

      container.read(socraticModeProvider.notifier).set(true);
      expect(container.read(socraticModeProvider), isTrue);
      expect(prefs.getBool('socratic_mode'), isTrue);
    });

    test('set(false) 后值持久化', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{
        'socratic_mode': true,
      });
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(overrides: <Override>[
        sharedPreferencesProvider.overrideWithValue(prefs),
      ]);
      addTearDown(container.dispose);

      container.read(socraticModeProvider.notifier).set(false);
      expect(container.read(socraticModeProvider), isFalse);
      expect(prefs.getBool('socratic_mode'), isFalse);
    });
  });
}
