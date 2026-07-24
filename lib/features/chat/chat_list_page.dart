import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/features/mascot/mascot_widget.dart';
import 'package:lingxi_academy/shared/utils/responsive.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 对话列表页。
///
/// 列出全部历史对话（按更新时间倒序），点击进入对应 [ChatPage]，
/// 右上角与列表项支持新建/删除。无对话时展示吉祥物空状态与
/// "开始第一次对话" CTA。列表项使用 [LingxiCard] 带交错入场动画，
/// 新建对话 FAB 带弹性缩放入场。
class ChatListPage extends ConsumerStatefulWidget {
  const ChatListPage({super.key});

  @override
  ConsumerState<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends ConsumerState<ChatListPage> {
  late final Stream<List<Conversation>> _stream;

  @override
  void initState() {
    super.initState();
    _stream = ref.read(conversationRepositoryProvider).watchConversations();
  }

  /// 新建对话并跳转。
  Future<void> _createConversation() async {
    final conv =
        await ref.read(conversationRepositoryProvider).createConversation('新对话');
    if (!mounted) return;
    context.go('${RouteNames.chatListPath}/${conv.id}');
  }

  /// 删除对话。
  Future<void> _deleteConversation(Conversation conv) async {
    await ref.read(conversationRepositoryProvider).deleteConversation(conv.id);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const LingxiAppBar(title: Text('对话')),
      floatingActionButton: _AnimatedFAB(onPressed: _createConversation),
      body: StreamBuilder<List<Conversation>>(
        stream: _stream,
        builder: (context, snapshot) {
          final list = snapshot.data ?? const <Conversation>[];
          if (!snapshot.hasData &&
              snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (list.isEmpty) {
            return _buildEmpty(context);
          }
          return _buildList(context, list);
        },
      ),
    );
  }

  /// 空状态：吉祥物 + CTA（带入场动画）。
  Widget _buildEmpty(BuildContext context) {
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final child = Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const MascotWidget(size: 160, enableTapInteraction: false),
          const SizedBox(height: 24),
          Text('还没有对话', style: theme.textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            '和小犀开始第一次对话吧',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          LingxiButton(
            icon: const Icon(Icons.chat_bubble_outline),
            label: const Text('开始第一次对话'),
            onPressed: _createConversation,
            pulse: true,
          ),
        ],
      ),
    );
    if (reduceMotion) return child;
    return SpringMotion.slideFadeTransition(
      direction: AxisDirection.up,
      distance: 24,
      duration: SpringMotion.gentleDuration,
      curve: SpringMotion.entranceCurve,
      child: child,
    );
  }

  /// 对话列表：桌面端双列网格，移动端单列。
  /// 列表项使用 LingxiCard(animateEntrance: true) 配合 40ms 交错延迟。
  Widget _buildList(BuildContext context, List<Conversation> list) {
    final isDesktop = Responsive.isDesktop(context);
    if (isDesktop) {
      return GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 360,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 2.4,
        ),
        itemCount: list.length,
        itemBuilder: (context, index) => _buildTile(context, list[index], index),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      scrollCacheExtent: const ScrollCacheExtent.pixels(500),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 4),
      itemBuilder: (context, index) => _buildTile(context, list[index], index),
    );
  }

  /// 单个对话卡片：LingxiCard 带交错入场动画（每项延迟 40ms）。
  Widget _buildTile(BuildContext context, Conversation conv, int index) {
    final theme = Theme.of(context);
    return LingxiCard(
      animateEntrance: true,
      entranceDelay: Duration(milliseconds: 40 * index),
      onTap: () => context.go('${RouteNames.chatListPath}/${conv.id}'),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.chat_bubble_outline,
              size: 22,
              color: theme.colorScheme.onPrimaryContainer,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  conv.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      size: 14,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '更新于 ${_formatTime(conv.updatedAt)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          SpringMotion.scalePressFeedback(
            onTap: () => _confirmDelete(conv),
            pressedScale: 0.9,
            child: Tooltip(
              message: '删除',
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Icon(
                  Icons.delete_outline,
                  size: 20,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 确认删除对话框。
  Future<void> _confirmDelete(Conversation conv) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除对话'),
        content: Text('确定删除「${conv.title}」吗？关联的消息将一并删除。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      AnimationUtils.hapticMedium();
      await _deleteConversation(conv);
    }
  }

  /// 格式化时间为简短中文。
  String _formatTime(DateTime t) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${t.year}-${two(t.month)}-${two(t.day)} ${two(t.hour)}:${two(t.minute)}';
  }
}

/// 新建对话 FAB：挂载时弹性缩放入场。
class _AnimatedFAB extends StatefulWidget {
  const _AnimatedFAB({required this.onPressed});

  final VoidCallback onPressed;

  @override
  State<_AnimatedFAB> createState() => _AnimatedFABState();
}

class _AnimatedFABState extends State<_AnimatedFAB>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    if (AnimationUtils.platformReduceMotion) {
      _controller = AnimationController(vsync: this, value: 1.0);
      _scale = const AlwaysStoppedAnimation(1.0);
      return;
    }
    _controller = AnimationController(
      vsync: this,
      duration: SpringMotion.gentleDuration,
    );
    _scale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 1.15)
            .chain(CurveTween(curve: Curves.easeOutBack)),
        weight: 70,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.15, end: 1.0)
            .chain(CurveTween(curve: Curves.easeOutCubic)),
        weight: 30,
      ),
    ]).animate(_controller);
    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final fab = FloatingActionButton.extended(
      onPressed: () {
        AnimationUtils.hapticLight();
        widget.onPressed();
      },
      icon: const Icon(Icons.add),
      label: const Text('新建对话'),
    );
    if (reduceMotion) return fab;
    return AnimatedBuilder(
      animation: _scale,
      builder: (context, child) => Transform.scale(
        scale: _scale.value,
        child: child,
      ),
      child: fab,
    );
  }
}
