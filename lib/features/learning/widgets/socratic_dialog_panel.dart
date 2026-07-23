import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/features/ai/ai_provider.dart';
import 'package:lingxi_academy/features/ai/ai_providers.dart';
import 'package:lingxi_academy/features/mascot/mascot_controller.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 苏格拉底对话面板（简化版）。
///
/// 测验通过后唤起。用户可点击"开始对话"发送种子问题，AI 流式响应。
/// 至少完成 1 轮对话后显示"完成"按钮。如果 AI Provider 不可用，
/// 显示"请先在设置中配置 API"提示。
class SocraticDialogPanel extends ConsumerStatefulWidget {
  const SocraticDialogPanel({
    super.key,
    required this.seedQuestion,
    this.onCompleted,
  });

  /// 苏格拉底种子问题。
  final String seedQuestion;

  /// 完成对话回调。
  final VoidCallback? onCompleted;

  @override
  ConsumerState<SocraticDialogPanel> createState() =>
      _SocraticDialogPanelState();
}

class _SocraticDialogPanelState extends ConsumerState<SocraticDialogPanel> {
  final List<ChatMessage> _messages = <ChatMessage>[];
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  /// 是否正在等待 AI 响应。
  bool _isResponding = false;

  /// 是否已完成至少 1 轮对话。
  bool _hasCompletedOnce = false;

  /// 错误信息（null 表示无错误）。
  String? _errorMessage;

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// 发送一条消息。
  Future<void> _send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isResponding) return;

    // 读取 AI Provider（同步快照）。
    final aiProvider = ref.read(currentAiProviderProvider).maybeWhen(
          data: (provider) => provider,
          orElse: () => null,
        );
    if (aiProvider == null) {
      setState(() {
        _errorMessage = '请先在设置中配置 API';
      });
      return;
    }

    // 提前捕获吉祥物控制器，确保卸载后仍可重置。
    final mascotNotifier = ref.read(mascotControllerProvider.notifier);

    setState(() {
      _messages.add(ChatMessage.user(trimmed));
      _isResponding = true;
      _errorMessage = null;
      _inputController.clear();
    });
    mascotNotifier.setAiThinking(true);

    final assistantBuffer = StringBuffer();
    setState(() {
      _messages.add(ChatMessage.assistant(''));
    });
    final assistantIndex = _messages.length - 1;
    var hadError = false;

    try {
      final stream = aiProvider.chatStream(
        // 排除末尾的占位助手消息。
        messages: List<ChatMessage>.from(
          _messages.sublist(0, assistantIndex),
        ),
        options: const ChatOptions(
          systemPrompt: '你是灵犀学院的苏格拉底式导师。请用引导式提问启发学生'
              '思考，而不是直接给出答案。鼓励学生自己推理。',
          temperature: 0.7,
        ),
      );
      await for (final event in stream) {
        if (!mounted) break;
        if (event is TextDeltaEvent) {
          assistantBuffer.write(event.delta);
          setState(() {
            _messages[assistantIndex] = ChatMessage.assistant(
              assistantBuffer.toString(),
            );
          });
        } else if (event is ErrorEvent) {
          hadError = true;
          setState(() {
            _errorMessage = event.message;
          });
          break;
        }
      }
    } catch (e) {
      hadError = true;
      if (mounted) {
        setState(() {
          _errorMessage = '对话出错：$e';
        });
      }
    }

    if (mounted) {
      setState(() {
        _isResponding = false;
        if (!hadError) _hasCompletedOnce = true;
      });
    }
    // 无论是否卸载都重置吉祥物（全局单例状态）。
    mascotNotifier.setAiThinking(false);
    _scrollToBottom();
  }

  /// 滚动到消息列表底部。
  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final aiProviderAsync = ref.watch(currentAiProviderProvider);

    return LingxiCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Icon(Icons.forum, size: 22),
              const SizedBox(width: 8),
              Text(
                '苏格拉底对话',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.help_outline, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '种子问题：${widget.seedQuestion}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          aiProviderAsync.when(
            data: (provider) =>
                provider == null ? _buildNoProvider(theme) : _buildConversation(theme),
            loading: () => const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => Text('加载 AI Provider 失败：$error'),
          ),
        ],
      ),
    );
  }

  /// AI Provider 不可用时的提示。
  Widget _buildNoProvider(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.warning, color: theme.colorScheme.error),
          const SizedBox(width: 8),
          const Expanded(child: Text('请先在设置中配置 API')),
        ],
      ),
    );
  }

  /// 构建对话区域。
  Widget _buildConversation(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_messages.isEmpty)
          LingxiButton(
            label: const Text('开始对话'),
            icon: const Icon(Icons.play_arrow),
            onPressed: () => _send(widget.seedQuestion),
          )
        else ...[
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 240),
            child: ListView.builder(
              controller: _scrollController,
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(vertical: 4),
              itemCount: _messages.length,
              itemBuilder: (context, index) =>
                  _buildBubble(_messages[index], theme),
            ),
          ),
          const SizedBox(height: 8),
          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _errorMessage!,
                style: TextStyle(
                  color: theme.colorScheme.error,
                  fontSize: 12,
                ),
              ),
            ),
          if (_isResponding)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 4),
              child: Center(
                child: SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _inputController,
                  enabled: !_isResponding,
                  decoration: const InputDecoration(
                    hintText: '输入你的想法...',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                  onSubmitted: _send,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _isResponding
                    ? null
                    : () => _send(_inputController.text),
                icon: const Icon(Icons.send),
                tooltip: '发送',
              ),
            ],
          ),
          if (_hasCompletedOnce && !_isResponding) ...[
            const SizedBox(height: 8),
            LingxiButton(
              label: const Text('完成对话'),
              icon: const Icon(Icons.check),
              onPressed: widget.onCompleted,
            ),
          ],
        ],
      ],
    );
  }

  /// 构建单条消息气泡。
  Widget _buildBubble(ChatMessage message, ThemeData theme) {
    final isUser = message.role == MessageRole.user;
    final bgColor = isUser
        ? theme.colorScheme.primary
        : theme.colorScheme.surfaceContainerHighest;
    final fgColor = isUser
        ? theme.colorScheme.onPrimary
        : theme.colorScheme.onSurface;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: const BoxConstraints(maxWidth: 280),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(message.content, style: TextStyle(color: fgColor)),
      ),
    );
  }
}
