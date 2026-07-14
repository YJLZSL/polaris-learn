import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lingxi_academy/features/ai/prompt_manager.dart';

/// 设置 assets 平台通道的 mock 处理器。
///
/// [assets] 为 asset 路径 → 内容的映射。未在映射中的路径返回 null，
/// 模拟 `rootBundle.loadString` 抛 `FlutterError` 的情况。
void setMockAssets(Map<String, String> assets) {
  ServicesBinding.instance.defaultBinaryMessenger.setMockMessageHandler(
    'flutter/assets',
    (ByteData? message) async {
      // PlatformAssetBundle 将 key 经过 Uri.encodeFull + UTF-8 编码后发送。
      // 对于不含特殊字符的路径，解码后即原始 key。
      final String key = utf8.decode(message!.buffer.asUint8List());
      final String? value = assets[key];
      if (value == null) {
        return null;
      }
      final Uint8List encoded = utf8.encode(value);
      return ByteData.sublistView(encoded);
    },
  );
}

/// 清除 assets 平台通道的 mock 处理器。
void clearMockAssets() {
  ServicesBinding.instance.defaultBinaryMessenger.setMockMessageHandler(
    'flutter/assets',
    null,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(clearMockAssets);

  group('PromptManager 兜底逻辑', () {
    test('未调用 loadPrompts 时 getSocraticPrompt 返回非空兜底提示词', () {
      final manager = PromptManager();
      final prompt = manager.getSocraticPrompt();

      expect(prompt, isNotEmpty);
      expect(prompt, contains('苏格拉底'));
    });

    test('未调用 loadPrompts 时 getDirectPrompt 返回非空兜底提示词', () {
      final manager = PromptManager();
      final prompt = manager.getDirectPrompt();

      expect(prompt, isNotEmpty);
      expect(prompt, contains('学习助手'));
    });

    test('未调用 loadPrompts 时 getSystemPrompt 在苏格拉底模式下返回兜底', () {
      final manager = PromptManager();
      final prompt = manager.getSystemPrompt(socraticMode: true);

      expect(prompt, isNotEmpty);
      expect(prompt, contains('苏格拉底'));
    });

    test('未调用 loadPrompts 时 getSystemPrompt 在直接模式下返回兜底', () {
      final manager = PromptManager();
      final prompt = manager.getSystemPrompt(socraticMode: false);

      expect(prompt, isNotEmpty);
      expect(prompt, contains('学习助手'));
    });
  });

  group('PromptManager 正常加载', () {
    test('rootBundle 有文件时应返回正确内容', () async {
      const socraticContent = '# 测试苏格拉底提示词\n你是一位测试导师。';
      const directContent = '# 测试直接提示词\n你是一位测试助手。';
      setMockAssets({
        'assets/prompts/socratic_system_prompt.md': socraticContent,
        'assets/prompts/direct_answer_prompt.md': directContent,
      });

      final manager = PromptManager();
      await manager.loadPrompts();

      expect(manager.getSocraticPrompt(), socraticContent);
      expect(manager.getDirectPrompt(), directContent);
      expect(manager.getSystemPrompt(socraticMode: true), socraticContent);
      expect(manager.getSystemPrompt(socraticMode: false), directContent);
    });

    test('加载成功后 socraticMode 切换返回对应提示词', () async {
      const socraticContent = '苏格拉底模式内容';
      const directContent = '直接模式内容';
      setMockAssets({
        'assets/prompts/socratic_system_prompt.md': socraticContent,
        'assets/prompts/direct_answer_prompt.md': directContent,
      });

      final manager = PromptManager();
      await manager.loadPrompts();

      expect(manager.getSystemPrompt(socraticMode: true), socraticContent);
      expect(manager.getSystemPrompt(socraticMode: false), directContent);
    });
  });

  group('PromptManager 加载失败兜底', () {
    test('rootBundle 抛异常时使用内置兜底提示词', () async {
      // 不设置任何 mock asset，rootBundle.loadString 会抛 FlutterError
      clearMockAssets();

      final manager = PromptManager();
      // 不应抛异常
      await manager.loadPrompts();

      // 兜底提示词应非空
      expect(manager.getSocraticPrompt(), isNotEmpty);
      expect(manager.getDirectPrompt(), isNotEmpty);
    });

    test('仅苏格拉底提示词加载失败时使用其兜底，直接提示词正常', () async {
      const directContent = '直接模式正常内容';
      setMockAssets({
        'assets/prompts/direct_answer_prompt.md': directContent,
        // 故意不提供苏格拉底提示词
      });

      final manager = PromptManager();
      await manager.loadPrompts();

      // 苏格拉底走兜底
      expect(manager.getSocraticPrompt(), isNotEmpty);
      expect(manager.getSocraticPrompt(), contains('苏格拉底'));
      // 直接模式正常加载
      expect(manager.getDirectPrompt(), directContent);
    });

    test('仅直接提示词加载失败时使用其兜底，苏格拉底提示词正常', () async {
      const socraticContent = '苏格拉底模式正常内容';
      setMockAssets({
        'assets/prompts/socratic_system_prompt.md': socraticContent,
        // 故意不提供直接提示词
      });

      final manager = PromptManager();
      await manager.loadPrompts();

      // 苏格拉底正常加载
      expect(manager.getSocraticPrompt(), socraticContent);
      // 直接模式走兜底
      expect(manager.getDirectPrompt(), isNotEmpty);
      expect(manager.getDirectPrompt(), contains('学习助手'));
    });

    test('兜底提示词内容有意义（非空字符串）', () async {
      clearMockAssets();

      final manager = PromptManager();
      await manager.loadPrompts();

      final socratic = manager.getSocraticPrompt();
      final direct = manager.getDirectPrompt();

      // 兜底内容应包含实质性的引导指令，而非占位符
      expect(socratic.length, greaterThan(20));
      expect(direct.length, greaterThan(10));
      expect(socratic, contains('提问'));
      expect(direct, contains('解释'));
    });
  });

  group('PromptManager 分级探索提示词', () {
    test('getSimplifyPrompt 应包含原始回答', () {
      final manager = PromptManager();
      final prompt = manager.getSimplifyPrompt('原始答案内容');

      expect(prompt, contains('原始答案内容'));
      expect(prompt, contains('通俗'));
    });

    test('getDeeperPrompt 应包含原始回答', () {
      final manager = PromptManager();
      final prompt = manager.getDeeperPrompt('原始答案内容');

      expect(prompt, contains('原始答案内容'));
      expect(prompt, contains('深入'));
    });

    test('getImagePrompt 应包含原始回答', () {
      final manager = PromptManager();
      final prompt = manager.getImagePrompt('原始答案内容');

      expect(prompt, contains('原始答案内容'));
      expect(prompt, contains('图示'));
    });
  });
}
