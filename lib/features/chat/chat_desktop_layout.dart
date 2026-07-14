import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/shared/utils/responsive.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 桌面端对话双栏布局。
///
/// 左侧显示对话列表，右侧显示选中对话的内容。
/// 仅在桌面端（宽度 >= 1024）使用，移动端继续使用独立的列表/详情页。
///
/// 此组件用作桌面端的增强体验，通过路由参数传入选中的 conversationId。
class ChatDesktopLayout extends ConsumerStatefulWidget {
  const ChatDesktopLayout({
    super.key,
    this.selectedConversationId,
    required this.chatContent,
  });

  /// 当前选中的对话 ID（从路由参数中获取）。
  final String? selectedConversationId;

  /// 右侧对话内容 Widget（ChatPage）。
  final Widget chatContent;

  @override
  ConsumerState<ChatDesktopLayout> createState() => _ChatDesktopLayoutState();
}

class _ChatDesktopLayoutState extends ConsumerState<ChatDesktopLayout> {
  late final Stream<List<Conversation>> _stream;

  @override
  void initState() {
    super.initState();
    _stream = ref.read(conversationRepositoryProvider).watchConversations();
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = Responsive.isDesktop(context);

    // 移动端不使用双栏布局
    if (!isDesktop) {
      return widget.chatContent;
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: const LingxiAppBar(title: Text('对话')),
      body: Row(
        children: [
          // 左栏：对话列表
          SizedBox(
            width: 320,
            child: Column(
              children: [
                // 新建对话按钮
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _createConversation,
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('新建对话'),
                    ),
                  ),
                ),
                const Divider(height: 1),
                // 对话列表
                Expanded(
                  child: StreamBuilder<List<Conversation>>(
                    stream: _stream,
                    builder: (context, snapshot) {
                      final list = snapshot.data ?? const <Conversation>[];
                      if (list.isEmpty) {
                        return Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.chat_bubble_outline_rounded,
                                size: 48,
                                color: colorScheme.onSurfaceVariant
                                    .withValues(alpha: 0.4),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                '暂无对话',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        );
                      }
                      return ListView.builder(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 8,
                        ),
                        itemCount: list.length,
                        itemBuilder: (context, index) {
                          final conv = list[index];
                          final isSelected =
                              conv.id == widget.selectedConversationId;
                          return _ConversationTile(
                            conversation: conv,
                            isSelected: isSelected,
                            onTap: () => _selectConversation(conv.id),
                            onDelete: () => _deleteConversation(conv),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          // 分隔线
          const VerticalDivider(width: 1, thickness: 1),
          // 右栏：对话内容
          Expanded(
            child: widget.selectedConversationId != null
                ? widget.chatContent
                : _EmptyChatPanel(colorScheme: colorScheme, theme: theme),
          ),
        ],
      ),
    );
  }

  Future<void> _createConversation() async {
    final conv = await ref
        .read(conversationRepositoryProvider)
        .createConversation('新对话');
    if (!mounted) return;
    _selectConversation(conv.id);
  }

  void _selectConversation(String id) {
    // 通过路由导航到选中对话
    // ignore: use_build_context_synchronously
    Navigator.of(context).pushReplacementNamed(
      '${RouteNames.chatListPath}/$id',
    );
  }

  Future<void> _deleteConversation(Conversation conv) async {
    await ref.read(conversationRepositoryProvider).deleteConversation(conv.id);
  }
}

/// 对话列表项。
class _ConversationTile extends StatelessWidget {
  const _ConversationTile({
    required this.conversation,
    required this.isSelected,
    required this.onTap,
    required this.onDelete,
  });

  final Conversation conversation;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: LingxiCard(
        color: isSelected ? colorScheme.primaryContainer : null,
        onTap: () {
          AnimationUtils.hapticLight();
          onTap();
        },
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.chat : Icons.chat_outlined,
              size: 18,
              color: isSelected
                  ? colorScheme.onPrimaryContainer
                  : colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    conversation.title,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight:
                          isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: isSelected
                          ? colorScheme.onPrimaryContainer
                          : null,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (conversation.model != null)
                    Text(
                      conversation.model!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant
                            .withValues(alpha: 0.7),
                        fontSize: 11,
                      ),
                      maxLines: 1,
                    ),
                ],
              ),
            ),
            IconButton(
              icon: Icon(
                Icons.delete_outline_rounded,
                size: 16,
                color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
              ),
              onPressed: onDelete,
              tooltip: '删除对话',
              iconSize: 16,
              constraints: const BoxConstraints(
                minWidth: 28,
                minHeight: 28,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 未选中对话时的空面板。
class _EmptyChatPanel extends StatelessWidget {
  const _EmptyChatPanel({
    required this.colorScheme,
    required this.theme,
  });

  final ColorScheme colorScheme;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.forum_outlined,
            size: 64,
            color: colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
          ),
          const SizedBox(height: 16),
          Text(
            '选择或创建一个对话',
            style: theme.textTheme.titleMedium?.copyWith(
              color: colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '在左侧选择已有对话，或点击"新建对话"开始',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }
}
