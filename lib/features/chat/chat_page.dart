import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/core/theme/lingxi_colors.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/features/ai/ai_provider.dart';
import 'package:lingxi_academy/features/chat/chat_controller.dart';
import 'package:lingxi_academy/features/mascot/mascot_widget.dart';
import 'package:lingxi_academy/shared/utils/responsive.dart';
import 'package:lingxi_academy/shared/widgets/level_exploration_buttons.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_chip.dart';
import 'package:lingxi_academy/shared/widgets/markdown_renderer.dart';

/// 自由对话主页。
///
/// 顶部 [LingxiAppBar] 显示当前对话标题并提供切换/新建入口与苏格拉底开关；
/// 主体为消息列表（用户/AI 气泡左右对齐，反向 [ListView.builder]），
/// AI 气泡使用 [MarkdownRenderer] 渲染，流式等待时显示三点脉动打字指示器；
/// 底部为多行输入框 + 发送/停止按钮。桌面端 Ctrl+Enter 发送。
///
/// 消息气泡根据角色从对应方向滑入并弹性缩放到 1.0；Socratic 开关、发送按钮、
/// 输入框聚焦边框均有弹簧/颜色过渡动画；空状态提供快速建议 Chip。
class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key, required this.conversationId});

  /// 当前对话 id。
  final String conversationId;

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _inputFocusNode = FocusNode();

  /// 最近对话列表，供顶部 PopupMenu 切换。
  List<Conversation> _recent = const <Conversation>[];

  @override
  void initState() {
    super.initState();
    // 加载当前对话历史。
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref
          .read(chatControllerProvider.notifier)
          .loadConversation(widget.conversationId);
      _loadRecent();
    });
  }

  @override
  void didUpdateWidget(covariant ChatPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.conversationId != widget.conversationId) {
      ref
          .read(chatControllerProvider.notifier)
          .loadConversation(widget.conversationId);
      _loadRecent();
    }
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _inputFocusNode.dispose();
    super.dispose();
  }

  /// 加载最近对话列表用于切换菜单。
  Future<void> _loadRecent() async {
    final list =
        await ref.read(conversationRepositoryProvider).getAllConversations();
    if (mounted) {
      setState(() => _recent = list);
    }
  }

  /// 新建对话：创建记录后跳转到新对话页。
  Future<void> _createNewConversation() async {
    final conv =
        await ref.read(conversationRepositoryProvider).createConversation('新对话');
    if (!mounted) return;
    context.go('${RouteNames.chatListPath}/${conv.id}');
  }

  /// 发送当前输入。
  Future<void> _send() async {
    final text = _inputController.text;
    if (text.trim().isEmpty) return;
    _inputController.clear();
    setState(() {});
    await ref.read(chatControllerProvider.notifier).sendMessage(text);
  }

  /// 使用预设建议发送（空状态快捷 Chip）。
  Future<void> _sendSuggestion(String text) async {
    if (_inputController.text.trim().isNotEmpty) return;
    _inputController.text = text;
    setState(() {});
    await _send();
  }

  /// 停止流式响应。
  void _stop() {
    ref.read(chatControllerProvider.notifier).stopStreaming();
  }

  /// 保存 AI 消息为笔记并提示。
  Future<void> _saveAsNote(String content) async {
    await ref.read(chatControllerProvider.notifier).saveAsNote(content);
    if (!mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      const SnackBar(content: Text('已保存到笔记')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatControllerProvider);
    final socratic = ref.watch(socraticModeProvider);

    // 监听错误，弹出 SnackBar。
    ref.listen<ChatControllerState>(chatControllerProvider, (previous, next) {
      if (next.error != null && previous?.error != next.error) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(content: Text(next.error!)),
        );
      }
    });

    return Shortcuts(
      shortcuts: const <ShortcutActivator, Intent>{
        SingleActivator(LogicalKeyboardKey.enter, control: true): _SendIntent(),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          _SendIntent: CallbackAction<_SendIntent>(
            onInvoke: (_) {
              _send();
              return null;
            },
          ),
        },
        child: Scaffold(
          appBar: LingxiAppBar(
            title: _TitleButton(
              title: state.conversationTitle,
              onTap: () => _showConversationsMenu(context),
            ),
            actions: [
              _SocraticToggle(
                value: socratic,
                onChanged: (v) =>
                    ref.read(socraticModeProvider.notifier).set(v),
              ),
              IconButton(
                tooltip: '新建对话',
                icon: const Icon(Icons.add_comment_outlined),
                onPressed: _createNewConversation,
              ),
              PopupMenuButton<String>(
                tooltip: '切换对话',
                icon: const Icon(Icons.history),
                onSelected: (id) =>
                    context.go('${RouteNames.chatListPath}/$id'),
                itemBuilder: (context) => [
                  for (final c in _recent)
                    PopupMenuItem<String>(
                      value: c.id,
                      child: Text(
                        c.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
              ),
            ],
          ),
          body: _buildBody(context, state),
        ),
      ),
    );
  }

  /// 构建主体：桌面端居中限宽，移动端全宽。
  Widget _buildBody(BuildContext context, ChatControllerState state) {
    final isDesktop = Responsive.isDesktop(context);
    final content = Column(
      children: [
        Expanded(child: _buildMessageArea(context, state)),
        _buildInputArea(context, state),
      ],
    );
    if (!isDesktop) {
      return SafeArea(child: content);
    }
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 900),
          child: content,
        ),
      ),
    );
  }

  /// 消息区域：空对话显示吉祥物提示 + 建议 Chip，否则反向列表。
  Widget _buildMessageArea(BuildContext context, ChatControllerState state) {
    final hasMessages =
        state.messages.isNotEmpty || state.isStreaming;
    if (!hasMessages) {
      return _buildEmptyState(context);
    }
    final messages = state.messages;
    final showStreaming = state.isStreaming;
    final extra = showStreaming ? 1 : 0;
    return ListView.builder(
      controller: _scrollController,
      reverse: true,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: messages.length + extra,
      itemBuilder: (context, index) {
        // 流式气泡始终位于底部（index 0）。
        if (showStreaming && index == 0) {
          return _MessageBubble(
            key: const ValueKey('__streaming__'),
            role: MessageRole.assistant,
            content: state.currentAssistantText,
            isStreaming: true,
            isWaitingForFirstToken: state.currentAssistantText.isEmpty,
            showExploration: false,
            onSaveAsNote: null,
          );
        }
        final msgIndex = showStreaming
            ? messages.length - index
            : messages.length - 1 - index;
        final msg = messages[msgIndex];
        final isBottomMost = index == (showStreaming ? 1 : 0);
        final showExploration = !showStreaming &&
            isBottomMost &&
            msg.role == MessageRole.assistant;
        return _MessageBubble(
          key: ValueKey('msg_${msgIndex}_${msg.role.name}'),
          role: msg.role,
          content: msg.content,
          isStreaming: false,
          isWaitingForFirstToken: false,
          showExploration: showExploration,
          onSaveAsNote: msg.role == MessageRole.assistant
              ? () => _saveAsNote(msg.content)
              : null,
          onRegenerateAnswer: showExploration
              ? (answer) => ref
                  .read(chatControllerProvider.notifier)
                  .appendAssistantMessage(answer)
              : null,
        );
      },
    );
  }

  /// 空对话状态：吉祥物 + 提示 + 快速建议 Chip。
  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final suggestions = <String>[
      '帮我解释什么是变量',
      'Python 和 JavaScript 有什么区别',
      '写一个 Hello World 程序',
      '什么是递归？举个例子',
      '推荐 AI 学习路线',
    ];

    Widget child = Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const MascotWidget(size: 160, enableTapInteraction: false),
            const SizedBox(height: 24),
            Text('问我任何问题', style: theme.textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              '小犀在这里陪你一起探索',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                for (int i = 0; i < suggestions.length; i++)
                  _SuggestionChip(
                    label: suggestions[i],
                    index: i,
                    onTap: () => _sendSuggestion(suggestions[i]),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
    if (reduceMotion) return child;
    return SpringMotion.slideFadeTransition(
      direction: AxisDirection.up,
      distance: 28,
      duration: SpringMotion.gentleDuration,
      curve: SpringMotion.entranceCurve,
      child: child,
    );
  }

  /// 输入区域：多行输入框（聚焦边框动画）+ 发送/停止按钮（弹性缩放）。
  Widget _buildInputArea(BuildContext context, ChatControllerState state) {
    final theme = Theme.of(context);
    final hasText = _inputController.text.trim().isNotEmpty;
    final canSend = hasText && !state.isStreaming;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: _AnimatedInputField(
              controller: _inputController,
              focusNode: _inputFocusNode,
              enabled: !state.isStreaming,
              onChanged: () => setState(() {}),
            ),
          ),
          const SizedBox(width: 8),
          // 发送/停止按钮：有文本时 spring scale 放大，空文本时缩小置灰。
          if (reduceMotion)
            _buildSendButtonPlain(theme, canSend, state.isStreaming)
          else
            AnimatedScale(
              scale: hasText ? 1.0 : 0.9,
              duration: SpringMotion.fastDuration,
              curve: SpringMotion.fastCurve,
              child: AnimatedOpacity(
                opacity: hasText || state.isStreaming ? 1.0 : 0.6,
                duration: SpringMotion.fastDuration,
                child: _buildSendButtonPlain(theme, canSend, state.isStreaming),
              ),
            ),
        ],
      ),
    );
  }

  /// 构建发送/停止按钮（纯视觉，无动画包装）。
  Widget _buildSendButtonPlain(
      ThemeData theme, bool canSend, bool isStreaming) {
    if (isStreaming) {
      return SpringMotion.pulseBreathing(
        minScale: 0.95,
        maxScale: 1.05,
        period: const Duration(milliseconds: 900),
        child: IconButton.filled(
          tooltip: '停止',
          icon: const Icon(Icons.stop),
          onPressed: _stop,
          style: IconButton.styleFrom(
            backgroundColor: theme.colorScheme.error,
            foregroundColor: theme.colorScheme.onError,
          ),
        ),
      );
    }
    return IconButton.filled(
      tooltip: '发送',
      icon: const Icon(Icons.send),
      onPressed: canSend ? _send : null,
    );
  }

  /// 显示对话切换菜单（底部 Sheet）。
  void _showConversationsMenu(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              ListTile(
                leading: const Icon(Icons.add),
                title: const Text('新建对话'),
                onTap: () {
                  Navigator.of(context).pop();
                  _createNewConversation();
                },
              ),
              const Divider(height: 1),
              for (final c in _recent)
                ListTile(
                  leading: const Icon(Icons.chat_bubble_outline),
                  title: Text(
                    c.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  onTap: () {
                    Navigator.of(context).pop();
                    context.go('${RouteNames.chatListPath}/${c.id}');
                  },
                ),
            ],
          ),
        );
      },
    );
  }
}

// ───────────────────────────────────────────────────────────────
// 消息气泡
// ───────────────────────────────────────────────────────────────

/// 单条消息气泡。
///
/// 用户消息右对齐 + 主色背景；助手消息左对齐 + surfaceContainerHigh 背景。
/// 首次挂载时从对应方向（右→左 / 左→右）滑入 20px，并从 0.95 弹性缩放到 1.0。
/// 流式等待首 token 时显示三点脉动打字指示器；Markdown 内容本身不做额外动画
/// （避免破坏代码块渲染）。
class _MessageBubble extends StatefulWidget {
  const _MessageBubble({
    super.key,
    required this.role,
    required this.content,
    required this.isStreaming,
    required this.isWaitingForFirstToken,
    required this.showExploration,
    this.onSaveAsNote,
    this.onRegenerateAnswer,
  });

  final MessageRole role;
  final String content;
  final bool isStreaming;
  final bool isWaitingForFirstToken;
  final bool showExploration;
  final VoidCallback? onSaveAsNote;
  final ValueChanged<String>? onRegenerateAnswer;

  @override
  State<_MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<_MessageBubble>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<Offset> _slide;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    final reduceMotion = AnimationUtils.platformReduceMotion;
    _controller = AnimationController(
      vsync: this,
      duration: SpringMotion.gentleDuration,
      value: reduceMotion ? 1.0 : 0.0,
    );
    final isUser = widget.role == MessageRole.user;
    // 用户从右侧 20px 滑入，助手从左侧 20px 滑入。
    final beginOffset = isUser
        ? const Offset(20, 0)
        : const Offset(-20, 0);
    final curved = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );
    _scale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.95, end: 1.02)
            .chain(CurveTween(curve: Curves.easeOutBack)),
        weight: 60,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.02, end: 1.0)
            .chain(CurveTween(curve: Curves.easeOutCubic)),
        weight: 40,
      ),
    ]).animate(curved);
    _slide = Tween<Offset>(begin: beginOffset, end: Offset.zero).animate(curved);
    _opacity = Tween<double>(begin: 0.0, end: 1.0).animate(curved);
    if (!reduceMotion) {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _isUser => widget.role == MessageRole.user;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final theme = Theme.of(context);
    final borderRadius = ShapeVariants.roundedLarge.borderRadius;

    // 根据角色定制气泡：用户圆角右下角更小（尾巴感），助手左上角更小。
    final bubbleBorderRadius = _isUser
        ? BorderRadius.only(
            topLeft: Radius.circular(borderRadius.topLeft.x),
            topRight: Radius.circular(borderRadius.topRight.x),
            bottomLeft: Radius.circular(borderRadius.bottomLeft.x),
            bottomRight: const Radius.circular(4),
          )
        : BorderRadius.only(
            topLeft: const Radius.circular(4),
            topRight: Radius.circular(borderRadius.topRight.x),
            bottomLeft: Radius.circular(borderRadius.bottomLeft.x),
            bottomRight: Radius.circular(borderRadius.bottomRight.x),
          );

    final bgColor = _isUser
        ? theme.colorScheme.primary
        : theme.colorScheme.surfaceContainerHighest;
    final fgColor =
        _isUser ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface;

    Widget bubbleContent = Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      constraints: BoxConstraints(
        maxWidth: _isUser ? 420 : 680,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: bubbleBorderRadius,
        boxShadow: _isUser
            ? [
                BoxShadow(
                  color: theme.colorScheme.primary.withValues(alpha: 0.15),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildBubbleBody(theme, fgColor),
          if (widget.showExploration) ...[
            const SizedBox(height: 8),
            LevelExplorationButtons(
              originalAnswer: widget.content,
              onNewAnswer: (answer) =>
                  widget.onRegenerateAnswer?.call(answer),
            ),
          ],
        ],
      ),
    );

    // 外层对齐 + 动画包装。
    Widget result = Align(
      alignment: _isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: bubbleContent,
    );

    if (!reduceMotion) {
      result = AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Opacity(
            opacity: _opacity.value,
            child: Transform.translate(
              offset: _slide.value,
              child: Transform.scale(
                scale: _scale.value,
                alignment:
                    _isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: child,
              ),
            ),
          );
        },
        child: result,
      );
    }

    return result;
  }

  /// 构建气泡内部内容（文本/Markdown/打字指示器/保存按钮）。
  Widget _buildBubbleBody(ThemeData theme, Color fgColor) {
    // 流式等待首 token：显示三点脉动打字指示器。
    if (widget.isStreaming && widget.isWaitingForFirstToken) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _TypingDots(color: fgColor),
          if (widget.onSaveAsNote != null) _buildMoreButton(theme, fgColor),
        ],
      );
    }

    final textStyle = TextStyle(color: fgColor);

    // 用户消息：纯文本 SelectableText（无 Markdown，无动画）。
    if (_isUser) {
      return SelectableText(
        widget.content,
        style: textStyle,
      );
    }

    // 助手消息：MarkdownRenderer（代码块不做动画处理）。
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Flexible(
          child: widget.content.isEmpty
              ? _TypingDots(color: fgColor)
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    MarkdownRenderer(data: widget.content),
                    if (widget.isStreaming) ...[
                      const SizedBox(height: 2),
                      _StreamingPulse(color: theme.colorScheme.primary),
                    ],
                  ],
                ),
        ),
        if (widget.onSaveAsNote != null) _buildMoreButton(theme, fgColor),
      ],
    );
  }

  Widget _buildMoreButton(ThemeData theme, Color fgColor) {
    return PopupMenuButton<String>(
      icon: Icon(Icons.more_horiz, size: 18, color: fgColor.withValues(alpha: 0.7)),
      tooltip: '更多',
      itemBuilder: (context) => const [
        PopupMenuItem<String>(
          value: 'save',
          child: Text('保存为笔记'),
        ),
      ],
      onSelected: (value) {
        if (value == 'save') widget.onSaveAsNote?.call();
      },
    );
  }
}

// ───────────────────────────────────────────────────────────────
// 打字指示器（三点脉动）
// ───────────────────────────────────────────────────────────────

/// 三点脉动打字指示器：三个圆点依次缩放/淡入淡出，每 0.2s 延迟，循环播放。
class _TypingDots extends StatefulWidget {
  const _TypingDots({required this.color});

  final Color color;

  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    if (!AnimationUtils.platformReduceMotion) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (AnimationUtils.reduceMotionOf(context)) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Dot(color: widget.color, scale: 1.0, opacity: 0.6),
            const SizedBox(width: 4),
            _Dot(color: widget.color, scale: 1.0, opacity: 0.6),
            const SizedBox(width: 4),
            _Dot(color: widget.color, scale: 1.0, opacity: 0.6),
          ],
        ),
      );
    }
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDot(0),
              const SizedBox(width: 4),
              _buildDot(1),
              const SizedBox(width: 4),
              _buildDot(2),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDot(int index) {
    // 每个 dot 的动画周期 0.6s，三个 dot 起始相位差 0.2s。
    final phase = (index * 0.2) % 1.0;
    var t = (_controller.value - phase) % 1.0;
    // 映射 t 到 0→1→0 的脉冲（前 60% 上升，后 40% 下降）。
    double pulse;
    if (t < 0.5) {
      pulse = Curves.easeInOut.transform(t / 0.5);
    } else {
      pulse = Curves.easeInOut.transform((1.0 - t) / 0.5);
    }
    final scale = 0.6 + 0.4 * pulse; // 0.6 → 1.0
    final opacity = 0.4 + 0.6 * pulse;
    return _Dot(color: widget.color, scale: scale, opacity: opacity);
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.color, required this.scale, required this.opacity});

  final Color color;
  final double scale;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Transform.scale(
      scale: scale,
      child: Opacity(
        opacity: opacity,
        child: Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}

/// 流式输出过程中跟在文字末尾的小型脉动点（比三点指示器更低调）。
class _StreamingPulse extends StatefulWidget {
  const _StreamingPulse({required this.color});

  final Color color;

  @override
  State<_StreamingPulse> createState() => _StreamingPulseState();
}

class _StreamingPulseState extends State<_StreamingPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    if (!AnimationUtils.platformReduceMotion) {
      _controller.repeat(reverse: true);
    } else {
      _controller.value = 1.0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Opacity(
          opacity: 0.4 + 0.6 * _controller.value,
          child: Container(
            width: 6,
            height: 12,
            margin: const EdgeInsets.only(left: 2, top: 4),
            decoration: BoxDecoration(
              color: widget.color,
              borderRadius: BorderRadius.circular(1),
            ),
          ),
        );
      },
    );
  }
}

// ───────────────────────────────────────────────────────────────
// 空状态建议 Chip（带交错入场）
// ───────────────────────────────────────────────────────────────

class _SuggestionChip extends StatefulWidget {
  const _SuggestionChip({
    required this.label,
    required this.index,
    required this.onTap,
  });

  final String label;
  final int index;
  final VoidCallback onTap;

  @override
  State<_SuggestionChip> createState() => _SuggestionChipState();
}

class _SuggestionChipState extends State<_SuggestionChip>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    final reduceMotion = AnimationUtils.platformReduceMotion;
    _controller = AnimationController(
      vsync: this,
      duration: SpringMotion.gentleDuration,
      value: reduceMotion ? 1.0 : 0.0,
    );
    final curved = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    );
    _scale = Tween<double>(begin: 0.8, end: 1.0).animate(curved);
    _opacity = Tween<double>(begin: 0.0, end: 1.0).animate(curved);
    if (!reduceMotion) {
      Future.delayed(Duration(milliseconds: 200 + widget.index * 60), () {
        if (mounted) _controller.forward();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final chip = LingxiChip(
      label: Text(widget.label),
      variant: LingxiChipVariant.action,
      onPressed: () {
        AnimationUtils.hapticLight();
        widget.onTap();
      },
      avatar: const Icon(Icons.auto_awesome, size: 16),
    );
    if (reduceMotion) return chip;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Opacity(
        opacity: _opacity.value,
        child: Transform.scale(
          scale: _scale.value,
          child: child,
        ),
      ),
      child: chip,
    );
  }
}

// ───────────────────────────────────────────────────────────────
// Socratic 开关（弹簧缩放 + 颜色过渡）
// ───────────────────────────────────────────────────────────────

class _SocraticToggle extends StatelessWidget {
  const _SocraticToggle({required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final lingxi = context.lingxiColors;
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    return _TogglePressWrapper(
      reduceMotion: reduceMotion,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: AnimatedContainer(
          duration: SpringMotion.fastDuration,
          curve: SpringMotion.fastCurve,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: value
                ? lingxi.socraticBlue.withValues(alpha: 0.15)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: value
                  ? lingxi.socraticBlue.withValues(alpha: 0.5)
                  : theme.colorScheme.outlineVariant,
              width: value ? 1.5 : 1.0,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedScale(
                scale: value ? 1.1 : 1.0,
                duration: SpringMotion.fastDuration,
                curve: Curves.easeOutBack,
                child: Icon(
                  value ? Icons.psychology : Icons.psychology_outlined,
                  size: 18,
                  color: value
                      ? lingxi.socraticBlue
                      : theme.colorScheme.onSurfaceVariant,
                ),
              ),
              if (value) ...[
                const SizedBox(width: 6),
                AnimatedDefaultTextStyle(
                  duration: SpringMotion.fastDuration,
                  style: theme.textTheme.labelMedium!.copyWith(
                    color: lingxi.socraticBlue,
                    fontWeight: FontWeight.w600,
                  ),
                  child: const Text('苏格拉底'),
                ),
              ],
              const SizedBox(width: 4),
              SizedBox(
                height: 20,
                child: Transform.scale(
                  scale: reduceMotion ? 1.0 : (value ? 1.05 : 0.95),
                  child: Switch(
                    value: value,
                    onChanged: (v) {
                      AnimationUtils.hapticLight();
                      onChanged(v);
                    },
                    activeTrackColor:
                        lingxi.socraticBlue.withValues(alpha: 0.5),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 为 Socratic 开关提供按下弹性缩放反馈。
///
/// 使用 [Listener] 监听指针事件，不参与手势竞争，避免与内部 [Switch] 冲突。
class _TogglePressWrapper extends StatefulWidget {
  const _TogglePressWrapper({
    required this.child,
    required this.reduceMotion,
  });

  final Widget child;
  final bool reduceMotion;

  @override
  State<_TogglePressWrapper> createState() => _TogglePressWrapperState();
}

class _TogglePressWrapperState extends State<_TogglePressWrapper> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return Listener(
      onPointerDown: (_) => setState(() => _pressed = true),
      onPointerUp: (_) => setState(() => _pressed = false),
      onPointerCancel: (_) => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed && !widget.reduceMotion ? 0.94 : 1.0,
        duration: SpringMotion.microDuration,
        curve: SpringMotion.fastCurve,
        child: widget.child,
      ),
    );
  }
}

// ───────────────────────────────────────────────────────────────
// 输入框：聚焦时边框颜色动画
// ───────────────────────────────────────────────────────────────

class _AnimatedInputField extends StatefulWidget {
  const _AnimatedInputField({
    required this.controller,
    required this.focusNode,
    required this.enabled,
    required this.onChanged,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;
  final VoidCallback onChanged;

  @override
  State<_AnimatedInputField> createState() => _AnimatedInputFieldState();
}

class _AnimatedInputFieldState extends State<_AnimatedInputField> {
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    widget.focusNode.addListener(_handleFocusChange);
  }

  @override
  void dispose() {
    widget.focusNode.removeListener(_handleFocusChange);
    super.dispose();
  }

  void _handleFocusChange() {
    if (widget.focusNode.hasFocus != _focused && mounted) {
      setState(() => _focused = widget.focusNode.hasFocus);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final borderRadius = ShapeVariants.roundedLarge.borderRadius;

    final focusedBorderColor = theme.colorScheme.primary;
    final unfocusedBorderColor = theme.colorScheme.outlineVariant;
    final disabledBorderColor = theme.colorScheme.outlineVariant.withValues(alpha: 0.5);

    final borderColor = !widget.enabled
        ? disabledBorderColor
        : (_focused ? focusedBorderColor : unfocusedBorderColor);
    final borderWidth = _focused ? 2.0 : 1.0;

    return AnimatedContainer(
      duration: reduceMotion
          ? Duration.zero
          : SpringMotion.fastDuration,
      curve: SpringMotion.fastCurve,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        border: Border.all(color: borderColor, width: borderWidth),
        color: widget.enabled
            ? theme.colorScheme.surface
            : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        boxShadow: _focused && widget.enabled
            ? [
                BoxShadow(
                  color: theme.colorScheme.primary.withValues(alpha: 0.12),
                  blurRadius: 8,
                  offset: const Offset(0, 0),
                ),
              ]
            : null,
      ),
      child: TextField(
        controller: widget.controller,
        focusNode: widget.focusNode,
        enabled: widget.enabled,
        minLines: 1,
        maxLines: 5,
        textInputAction: TextInputAction.newline,
        onChanged: (_) => widget.onChanged(),
        decoration: InputDecoration(
          hintText: '输入你的问题…（桌面端 Ctrl+Enter 发送）',
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          disabledBorder: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 12,
          ),
        ),
      ),
    );
  }
}

// ───────────────────────────────────────────────────────────────
// 可点击的标题按钮
// ───────────────────────────────────────────────────────────────

class _TitleButton extends StatelessWidget {
  const _TitleButton({required this.title, required this.onTap});

  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SpringMotion.scalePressFeedback(
      onTap: onTap,
      pressedScale: 0.96,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 2),
            const Icon(Icons.arrow_drop_down, size: 20),
          ],
        ),
      ),
    );
  }
}

// ───────────────────────────────────────────────────────────────
// 发送意图（Ctrl+Enter）
// ───────────────────────────────────────────────────────────────

class _SendIntent extends Intent {
  const _SendIntent();
}
