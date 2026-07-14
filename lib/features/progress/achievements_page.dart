// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/theme/lingxi_colors.dart';
import 'package:lingxi_academy/features/progress/achievement_service.dart';
import 'package:lingxi_academy/features/progress/celebration_service.dart';
import 'package:lingxi_academy/shared/utils/responsive.dart';
import 'package:lingxi_academy/shared/widgets/animated_count_text.dart';
import 'package:lingxi_academy/shared/widgets/animated_progress_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_badge.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 成就列表 FutureProvider，首次加载后缓存。
final achievementsListProvider =
    FutureProvider.autoDispose<List<AchievementWithProgress>>((ref) async {
  return ref.watch(achievementServiceProvider).getAll();
});

/// 成就页面：展示全部徽章（已解锁 + 未解锁）。
class AchievementsPage extends ConsumerStatefulWidget {
  const AchievementsPage({super.key});

  @override
  ConsumerState<AchievementsPage> createState() => _AchievementsPageState();
}

class _AchievementsPageState extends ConsumerState<AchievementsPage> {
  /// 记录上一次构建时已解锁的 code 集合，用于检测新解锁。
  Set<String>? _previousUnlocked;

  /// 本次新解锁的 code 集合（显示弹出动画 + 触发庆祝）。
  final Set<String> _newlyUnlockedCodes = <String>{};

  /// 记录已触发庆祝的 badge 全局 key，用于定位粒子起点。
  final Map<String, GlobalKey> _badgeKeys = {};

  @override
  Widget build(BuildContext context) {
    final asyncList = ref.watch(achievementsListProvider);
    return Scaffold(
      appBar: const LingxiAppBar(title: Text('成就')),
      body: asyncList.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('加载失败：$error'),
          ),
        ),
        data: (list) {
          _detectNewlyUnlocked(list);
          // 确保每个 badge 有 key
          for (final item in list) {
            _badgeKeys.putIfAbsent(item.achievement.id, () => GlobalKey());
          }
          return _Body(
            list: list,
            badgeKeys: _badgeKeys,
            newlyUnlockedCodes: _newlyUnlockedCodes,
          );
        },
      ),
    );
  }

  /// 检测本次数据相比上次有哪些徽章新解锁。
  void _detectNewlyUnlocked(List<AchievementWithProgress> list) {
    final currentUnlocked = list
        .where((e) => e.unlocked)
        .map((e) => e.achievement.id)
        .toSet();
    if (_previousUnlocked != null) {
      final newly = currentUnlocked.difference(_previousUnlocked!);
      for (final code in newly) {
        if (!_newlyUnlockedCodes.contains(code)) {
          _newlyUnlockedCodes.add(code);
          // 下一帧触发庆祝粒子
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _triggerCelebrationFor(code);
          });
        }
      }
    }
    _previousUnlocked = currentUnlocked;
  }

  /// 在徽章位置触发纸屑庆祝。
  void _triggerCelebrationFor(String code) {
    if (AnimationUtils.platformReduceMotion) return;
    final key = _badgeKeys[code];
    if (key == null) return;
    final ctx = key.currentContext;
    if (ctx == null) return;
    final box = ctx.findRenderObject() as RenderBox?;
    if (box == null) return;
    final overlay = Overlay.of(context).context.findRenderObject() as RenderBox?;
    if (overlay == null) return;
    final position = box.localToGlobal(
      box.size.center(Offset.zero),
      ancestor: overlay,
    );
    CelebrationService.instance.sparkles(position, count: 24);
    AnimationUtils.hapticSuccess();
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.list,
    required this.badgeKeys,
    required this.newlyUnlockedCodes,
  });

  final List<AchievementWithProgress> list;
  final Map<String, GlobalKey> badgeKeys;
  final Set<String> newlyUnlockedCodes;

  @override
  Widget build(BuildContext context) {
    final unlockedCount = list.where((e) => e.unlocked).length;
    final totalProgress = list.isEmpty
        ? 0.0
        : list.fold(0.0, (sum, e) => sum + e.progress) / list.length;

    final crossAxisCount = Responsive.valueByDevice<int>(
      context,
      mobile: 2,
      tablet: 3,
      desktop: 5,
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _StatsBar(
          unlocked: unlockedCount,
          total: list.length,
          overallProgress: totalProgress,
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.85,
          ),
          itemCount: list.length,
          itemBuilder: (context, index) {
            final item = list[index];
            return _BadgeCard(
              key: ValueKey('badge-${item.achievement.id}-$index'),
              badgeKey: badgeKeys[item.achievement.id],
              item: item,
              index: index,
              newlyUnlocked: newlyUnlockedCodes.contains(item.achievement.id),
            );
          },
        ),
      ],
    );
  }
}

/// 顶部统计栏：已解锁 X/总数 Y、总进度条。
class _StatsBar extends StatelessWidget {
  const _StatsBar({
    required this.unlocked,
    required this.total,
    required this.overallProgress,
  });

  final int unlocked;
  final int total;
  final double overallProgress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gold = context.lingxiColors.achievementGold;
    return LingxiCard(
      animateEntrance: true,
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SpringMotion.shimmerGlow(
                glowColor: gold,
                child: Icon(Icons.emoji_events, color: gold, size: 32),
              ),
              const SizedBox(width: 8),
              AnimatedCountText(
                value: unlocked,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                ' / $total',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '已解锁',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          AnimatedProgressBar(
            progress: overallProgress,
            height: 8,
            foregroundColor: gold,
            enablePulse: overallProgress > 0 && overallProgress < 1,
            borderRadius: 4,
          ),
          const SizedBox(height: 4),
          Text(
            '总进度 ${(overallProgress * 100).toStringAsFixed(0)}%',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

/// 单个徽章卡片。
class _BadgeCard extends StatefulWidget {
  const _BadgeCard({
    super.key,
    required this.badgeKey,
    required this.item,
    required this.index,
    required this.newlyUnlocked,
  });

  final GlobalKey? badgeKey;
  final AchievementWithProgress item;
  final int index;
  final bool newlyUnlocked;

  @override
  State<_BadgeCard> createState() => _BadgeCardState();
}

class _BadgeCardState extends State<_BadgeCard> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    if (AnimationUtils.platformReduceMotion) {
      _visible = true;
    } else {
      final delay = Duration(milliseconds: 40 * widget.index);
      if (delay == Duration.zero) {
        _visible = true;
      } else {
        Future.delayed(delay, () {
          if (mounted) setState(() => _visible = true);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gold = context.lingxiColors.achievementGold;
    final unlocked = widget.item.unlocked;

    final cardContent = Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // 徽章（使用 LingxiBadge）
          keyedBadge(gold, unlocked),
          const SizedBox(height: 4),
          // 名称
          Text(
            widget.item.achievement.name,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: unlocked
                  ? theme.colorScheme.onSurface
                  : theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          // 描述
          Text(
            widget.item.achievement.description,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),
          // 进度 / 解锁时间
          if (unlocked) ...[
            SpringMotion.scalePressFeedback(
              enableHaptic: false,
              child: SpringMotion.pulseBreathing(
                minScale: 0.97,
                maxScale: 1.05,
                period: const Duration(seconds: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle, color: gold, size: 18),
                    const SizedBox(width: 4),
                    Text(
                      '已解锁',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: gold,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            AnimatedProgressBar(
              progress: widget.item.progress,
              height: 6,
              borderRadius: 3,
              foregroundColor: theme.colorScheme.primary,
            ),
            const SizedBox(height: 2),
            Text(
              '${(widget.item.progress * 100).toStringAsFixed(0)}%',
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );

    // 卡片容器
    Widget card = Container(
      key: widget.badgeKey,
      decoration: BoxDecoration(
        color: unlocked
            ? (widget.newlyUnlocked
                ? gold.withValues(alpha: 0.12)
                : gold.withValues(alpha: 0.08))
            : theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: unlocked
            ? BorderSide(
                color: gold,
                width: widget.newlyUnlocked ? 2.5 : 2,
              )
            : null,
        boxShadow: unlocked && widget.newlyUnlocked
            ? [
                BoxShadow(
                  color: gold.withValues(alpha: 0.25),
                  blurRadius: 12,
                  spreadRadius: 1,
                ),
              ]
            : (unlocked
                ? [
                    BoxShadow(
                      color: gold.withValues(alpha: 0.1),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null),
      ),
      child: unlocked && widget.newlyUnlocked
          ? SpringMotion.shimmerGlow(
              glowColor: gold,
              period: const Duration(milliseconds: 1800),
              child: cardContent,
            )
          : cardContent,
    );

    // 未解锁：灰度 + 降低透明度
    if (!unlocked) {
      card = Opacity(
        opacity: 0.6,
        child: ColorFiltered(
          colorFilter: const ColorFilter.matrix(<double>[
            0.2126, 0.7152, 0.0722, 0, 0,
            0.2126, 0.7152, 0.0722, 0, 0,
            0.2126, 0.7152, 0.0722, 0, 0,
            0, 0, 0, 1, 0,
          ]),
          child: card,
        ),
      );
    }

    // 入场动画
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    if (reduceMotion) return card;

    return AnimatedOpacity(
      opacity: _visible ? 1.0 : 0.0,
      duration: SpringMotion.gentleDuration,
      curve: SpringMotion.entranceCurve,
      child: AnimatedSlide(
        offset: _visible ? Offset.zero : const Offset(0, 0.08),
        duration: SpringMotion.gentleDuration,
        curve: SpringMotion.entranceCurve,
        child: AnimatedScale(
          scale: _visible ? 1.0 : 0.9,
          duration: SpringMotion.gentleDuration,
          curve: SpringMotion.entranceCurve,
          child: card,
        ),
      ),
    );
  }

  /// 构建带 key 的 LingxiBadge。
  Widget keyedBadge(Color gold, bool unlocked) {
    final badge = LingxiBadge(
      icon: Text(
        widget.item.achievement.icon,
        style: const TextStyle(fontSize: 28),
      ),
      label: const SizedBox.shrink(),
      unlocked: unlocked,
      newlyUnlocked: widget.newlyUnlocked,
      progress: unlocked ? null : widget.item.progress,
      size: 64,
      shape: LingxiBadgeShape.circle,
    );
    return badge;
  }
}
