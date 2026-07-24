import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:lingxi_academy/shared/utils/responsive.dart';
import 'package:lingxi_academy/shared/widgets/empty_state_widget.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_chip.dart';

/// 笔记列表页。
///
/// 顶部按标签多选筛选（[LingxiChip] filter 变体），桌面端 2-3 列网格、
/// 移动端单列。笔记卡片展示标题、内容预览（前 80 字）、标签与创建时间。
/// 右下角 FAB 新建笔记，跳转到 [NoteEditorPage]。
class NotesPage extends ConsumerStatefulWidget {
  const NotesPage({super.key});

  @override
  ConsumerState<NotesPage> createState() => _NotesPageState();
}

class _NotesPageState extends ConsumerState<NotesPage> {
  late final Stream<List<Note>> _stream;
  bool _fabVisible = false;

  /// 当前选中的筛选标签集合。
  final Set<String> _selectedTags = <String>{};

  @override
  void initState() {
    super.initState();
    _stream = ref.read(noteRepositoryProvider).watchNotes();
    if (AnimationUtils.platformReduceMotion) {
      _fabVisible = true;
    } else {
      // FAB 弹簧入场延迟
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) setState(() => _fabVisible = true);
      });
    }
  }

  /// 从全部笔记中提取去重后的标签列表。
  List<String> _collectTags(List<Note> notes) {
    final set = <String>{};
    for (final n in notes) {
      for (final t in n.tags.split(',')) {
        final trimmed = t.trim();
        if (trimmed.isNotEmpty) set.add(trimmed);
      }
    }
    return set.toList()..sort();
  }

  /// 判断笔记是否命中任一选中标签（无选中则全部通过）。
  bool _matches(Note n) {
    if (_selectedTags.isEmpty) return true;
    final tags = n.tags
        .split(',')
        .map((t) => t.trim())
        .where((t) => t.isNotEmpty)
        .toSet();
    return tags.intersection(_selectedTags).isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    return Scaffold(
      appBar: const LingxiAppBar(title: Text('笔记')),
      floatingActionButton: _buildFab(reduceMotion),
      body: StreamBuilder<List<Note>>(
        stream: _stream,
        builder: (context, snapshot) {
          final all = snapshot.data ?? const <Note>[];
          if (!snapshot.hasData &&
              snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (all.isEmpty) {
            return _buildEmpty(context);
          }
          final tags = _collectTags(all);
          final filtered = all.where(_matches).toList(growable: false);
          return Column(
            children: [
              if (tags.isNotEmpty) _buildTagBar(tags),
              Expanded(child: _buildContent(context, filtered)),
            ],
          );
        },
      ),
    );
  }

  /// FAB 带弹簧缩放入场。
  Widget _buildFab(bool reduceMotion) {
    final fab = FloatingActionButton.extended(
      onPressed: () => context.go('${RouteNames.notesPath}/new'),
      icon: const Icon(Icons.add),
      label: const Text('新建笔记'),
    );
    if (reduceMotion) return fab;
    return AnimatedOpacity(
      opacity: _fabVisible ? 1.0 : 0.0,
      duration: SpringMotion.gentleDuration,
      curve: SpringMotion.entranceCurve,
      child: AnimatedScale(
        scale: _fabVisible ? 1.0 : 0.0,
        duration: SpringMotion.bouncyDuration,
        curve: SpringMotion.bouncyCurve,
        alignment: Alignment.bottomRight,
        child: fab,
      ),
    );
  }

  /// 标签筛选栏（chips 交错入场）。
  Widget _buildTagBar(List<String> tags) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    if (reduceMotion) {
      return _buildTagBarContent(tags, null);
    }
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 200 + tags.length * 30),
      curve: Curves.easeOutCubic,
      builder: (context, value, _) => _buildTagBarContent(tags, value),
    );
  }

  Widget _buildTagBarContent(List<String> tags, double? animValue) {
    return SizedBox(
      width: double.infinity,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            for (var i = 0; i < tags.length; i++) ...[
              _buildTagChip(tags[i], i, animValue),
              const SizedBox(width: 8),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTagChip(String t, int index, double? animValue) {
    final chip = LingxiChip(
      label: Text(t),
      variant: LingxiChipVariant.filter,
      selected: _selectedTags.contains(t),
      onSelected: (selected) {
        AnimationUtils.hapticLight();
        setState(() {
          if (selected) {
            _selectedTags.add(t);
          } else {
            _selectedTags.remove(t);
          }
        });
      },
    );
    if (animValue == null) return chip;
    // 交错：每个 chip 在 0~1 范围内按 index 错峰出现
    final chipDelay = index * 0.06;
    final localValue =
        ((animValue - chipDelay) / (1.0 - chipDelay)).clamp(0.0, 1.0);
    return Opacity(
      opacity: localValue,
      child: Transform.translate(
        offset: Offset(12 * (1 - localValue), 0),
        child: Transform.scale(
          scale: 0.9 + 0.1 * localValue,
          child: chip,
        ),
      ),
    );
  }

  /// 列表/网格主体。
  Widget _buildContent(BuildContext context, List<Note> notes) {
    if (notes.isEmpty) {
      return Center(
        child: SpringMotion.springTransition(
          beginScale: 0.92,
          beginOffset: const Offset(0, 0.05),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.filter_list_off_outlined,
                size: 56,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 12),
              Text(
                '没有符合该标签的笔记',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        ),
      );
    }
    final isDesktop = Responsive.isDesktop(context);
    if (isDesktop) {
      return GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 360,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.1,
        ),
        itemCount: notes.length,
        itemBuilder: (context, index) => _buildCard(context, notes[index], index),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      scrollCacheExtent: 500,
      itemCount: notes.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) => _buildCard(context, notes[index], index),
    );
  }

  /// 单个笔记卡片（带 staggered 入场动画）。
  Widget _buildCard(BuildContext context, Note note, int index) {
    final theme = Theme.of(context);
    final preview = note.content.length > 80
        ? '${note.content.substring(0, 80)}…'
        : note.content;
    final tags = note.tags
        .split(',')
        .map((t) => t.trim())
        .where((t) => t.isNotEmpty)
        .toList();
    return LingxiCard(
      animateEntrance: true,
      entranceDelay: Duration(milliseconds: 40 * index),
      onTap: () => context.go('${RouteNames.notesPath}/${note.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            note.title.isEmpty ? '未命名笔记' : note.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            preview,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodyMedium,
          ),
          if (tags.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final t in tags)
                  LingxiChip(
                    label: Text(t),
                    variant: LingxiChipVariant.info,
                  ),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Text(
            _formatTime(note.createdAt),
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  /// 空状态。
  Widget _buildEmpty(BuildContext context) {
    return EmptyStateWidget(
      mascotMood: MascotMood.idle,
      title: '还没有笔记',
      description: '把重要的内容记下来吧',
      ctaText: '新建笔记',
      onCta: () => context.go('${RouteNames.notesPath}/new'),
    );
  }

  String _formatTime(DateTime t) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${t.year}-${two(t.month)}-${two(t.day)} ${two(t.hour)}:${two(t.minute)}';
  }
}
