import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/ai/ai_provider.dart';
import '../../features/ai/ai_providers.dart';
import 'lingxi_button.dart';

/// 分级探索动作类型。
enum LevelAction {
  /// 简化：用更通俗语言重新解释。
  simplify,

  /// 深入：原理推导与进阶应用。
  deeper,

  /// 图示：图示说明建议。
  image,
}

/// 分级探索三按钮组件。
///
/// 在 AI 回答下方提供"简化 / 深入 / 图示"三个按钮，点击后调用当前
/// AI Provider 基于原回答重新生成内容，并通过 [onNewAnswer] 回调返回。
class LevelExplorationButtons extends ConsumerStatefulWidget {
  const LevelExplorationButtons({
    super.key,
    required this.originalAnswer,
    required this.onNewAnswer,
  });

  /// 原 AI 回答文本。
  final String originalAnswer;

  /// 新答案回调。
  final ValueChanged<String> onNewAnswer;

  @override
  ConsumerState<LevelExplorationButtons> createState() =>
      _LevelExplorationButtonsState();
}

class _LevelExplorationButtonsState
    extends ConsumerState<LevelExplorationButtons> {
  /// 当前正在进行的动作，为 null 表示空闲。
  LevelAction? _loadingAction;

  bool get _isLoading => _loadingAction != null;

  Future<void> _regenerate(LevelAction action) async {
    if (_isLoading) return;
    setState(() => _loadingAction = action);

    try {
      final manager = await ref.read(promptManagerProvider.future);
      final provider = await ref.read(currentAiProviderProvider.future);
      if (provider == null) {
        _notify('暂无可用 AI 服务，请先在设置中配置。');
        return;
      }
      final prompt = switch (action) {
        LevelAction.simplify =>
          manager.getSimplifyPrompt(widget.originalAnswer),
        LevelAction.deeper => manager.getDeeperPrompt(widget.originalAnswer),
        LevelAction.image => manager.getImagePrompt(widget.originalAnswer),
      };
      final result = await provider.chat(
        messages: [ChatMessage.user(prompt)],
        options: const ChatOptions(stream: false),
      );
      widget.onNewAnswer(result);
    } on Object {
      _notify('生成失败，请稍后重试。');
    } finally {
      if (mounted) {
        setState(() => _loadingAction = null);
      }
    }
  }

  void _notify(String message) {
    if (!mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: LingxiButton(
            icon: _loadingAction == LevelAction.simplify
                ? const _LoadingIcon()
                : const Icon(Icons.compress),
            label: const Text('简化'),
            variant: LingxiButtonVariant.text,
            onPressed: _isLoading
                ? null
                : () => _regenerate(LevelAction.simplify),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: LingxiButton(
            icon: _loadingAction == LevelAction.deeper
                ? const _LoadingIcon()
                : const Icon(Icons.unfold_more),
            label: const Text('深入'),
            variant: LingxiButtonVariant.text,
            onPressed: _isLoading
                ? null
                : () => _regenerate(LevelAction.deeper),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: LingxiButton(
            icon: _loadingAction == LevelAction.image
                ? const _LoadingIcon()
                : const Icon(Icons.image_outlined),
            label: const Text('图像'),
            variant: LingxiButtonVariant.text,
            onPressed: _isLoading
                ? null
                : () => _regenerate(LevelAction.image),
          ),
        ),
      ],
    );
  }
}

/// 按钮内的小型加载指示器。
class _LoadingIcon extends StatelessWidget {
  const _LoadingIcon();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 18,
      height: 18,
      child: CircularProgressIndicator(strokeWidth: 2),
    );
  }
}
