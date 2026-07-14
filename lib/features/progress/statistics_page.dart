// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/theme/lingxi_colors.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/data/repositories/note_repository.dart';
import 'package:lingxi_academy/data/repositories/settings_repository.dart';
import 'package:lingxi_academy/features/progress/streak_service.dart';
import 'package:lingxi_academy/shared/utils/responsive.dart';
import 'package:lingxi_academy/shared/widgets/animated_count_text.dart';
import 'package:lingxi_academy/shared/widgets/animated_progress_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 时间范围枚举。
enum StatsTimeRange {
  /// 本周
  week,

  /// 本月
  month,

  /// 全部
  all,
}

/// 统计数据快照。
class StatisticsData {
  const StatisticsData({
    required this.streakDays,
    required this.longestStreak,
    required this.totalStudyDays,
    required this.socraticCount,
    required this.noteCount,
    required this.knowledgePointsCompleted,
    required this.dailyActivity,
    required this.completedByCourse,
  });

  final int streakDays;
  final int longestStreak;
  final int totalStudyDays;
  final int socraticCount;
  final int noteCount;
  final int knowledgePointsCompleted;
  final Map<String, int> dailyActivity;
  final Map<String, int> completedByCourse;
}

/// 统计数据 FutureProvider，异步加载并缓存。
final statisticsDataProvider =
    FutureProvider.autoDispose<StatisticsData>((ref) async {
  final db = ref.watch(databaseProvider);
  final streakService = ref.watch(streakServiceProvider);
  final noteRepo = NoteRepository(db);
  final settingsRepo = SettingsRepository(db);

  final results = await Future.wait([
    streakService.getStreak(),
    noteRepo.getAllNotes(),
    db.select(db.progress).get(),
    settingsRepo.getSetting('count_socratic'),
  ]);

  final streak = results[0] as StreakData;
  final notes = results[1] as List<Note>;
  final progressList = results[2] as List<ProgressData>;
  final socraticStr = results[3] as String?;

  final dailyActivity = <String, int>{};
  for (final p in progressList) {
    if (p.lastStudiedAt == null) continue;
    final key = _dateKey(p.lastStudiedAt!);
    dailyActivity[key] = (dailyActivity[key] ?? 0) + 1;
  }

  final completedByCourse = <String, int>{};
  var totalCompleted = 0;
  for (final p in progressList) {
    if (p.status == 'completed') {
      totalCompleted++;
      completedByCourse[p.courseId] =
          (completedByCourse[p.courseId] ?? 0) + 1;
    }
  }

  return StatisticsData(
    streakDays: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalStudyDays: streak.totalStudyDays,
    socraticCount: int.tryParse(socraticStr ?? '') ?? 0,
    noteCount: notes.length,
    knowledgePointsCompleted: totalCompleted,
    dailyActivity: dailyActivity,
    completedByCourse: completedByCourse,
  );
});

String _dateKey(DateTime dt) {
  return '${dt.year}-${dt.month.toString().padLeft(2, '0')}'
      '-${dt.day.toString().padLeft(2, '0')}';
}

/// 统计页面。
class StatisticsPage extends ConsumerStatefulWidget {
  const StatisticsPage({super.key});

  @override
  ConsumerState<StatisticsPage> createState() => _StatisticsPageState();
}

class _StatisticsPageState extends ConsumerState<StatisticsPage> {
  StatsTimeRange _range = StatsTimeRange.week;

  @override
  Widget build(BuildContext context) {
    final asyncData = ref.watch(statisticsDataProvider);
    return Scaffold(
      appBar: const LingxiAppBar(title: Text('学习统计')),
      body: asyncData.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('加载失败：$error'),
          ),
        ),
        data: (data) => _Body(
          data: data,
          range: _range,
          onRangeChanged: (r) => setState(() => _range = r),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.data,
    required this.range,
    required this.onRangeChanged,
  });

  final StatisticsData data;
  final StatsTimeRange range;
  final ValueChanged<StatsTimeRange> onRangeChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _TimeRangeSwitcher(range: range, onChanged: onRangeChanged),
        const SizedBox(height: 16),
        _StatsCardsRow(data: data),
        const SizedBox(height: 16),
        _BarChartCard(data: data, range: range),
        const SizedBox(height: 16),
        _CourseCompletionCard(data: data),
        const SizedBox(height: 16),
        _HeatmapCard(data: data),
        const SizedBox(height: 16),
      ],
    );
  }
}

/// 时间范围切换器。
class _TimeRangeSwitcher extends StatelessWidget {
  const _TimeRangeSwitcher({
    required this.range,
    required this.onChanged,
  });

  final StatsTimeRange range;
  final ValueChanged<StatsTimeRange> onChanged;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SpringMotion.springTransition(
        beginScale: 0.95,
        child: SegmentedButton<StatsTimeRange>(
          segments: const [
            ButtonSegment(value: StatsTimeRange.week, label: Text('本周')),
            ButtonSegment(value: StatsTimeRange.month, label: Text('本月')),
            ButtonSegment(value: StatsTimeRange.all, label: Text('全部')),
          ],
          selected: {range},
          onSelectionChanged: (set) {
            AnimationUtils.hapticLight();
            onChanged(set.first);
          },
        ),
      ),
    );
  }
}

/// 顶部统计卡片行（staggered 入场）。
class _StatsCardsRow extends StatelessWidget {
  const _StatsCardsRow({required this.data});

  final StatisticsData data;

  @override
  Widget build(BuildContext context) {
    final fireColor = context.lingxiColors.streakFire;
    final isStreakActive = data.streakDays > 0;

    final cards = [
      _StatCardData(
        icon: Icons.local_fire_department,
        iconColor: isStreakActive ? fireColor : Colors.grey,
        value: data.streakDays,
        label: '连续天数',
        subtitle: '最长 ${data.longestStreak} 天',
        glowWhenActive: isStreakActive,
        glowColor: fireColor,
      ),
      _StatCardData(
        icon: Icons.forum,
        iconColor: context.lingxiColors.socraticBlue,
        value: data.socraticCount,
        label: '苏格拉底对话',
      ),
      _StatCardData(
        icon: Icons.note_alt,
        iconColor: Theme.of(context).colorScheme.primary,
        value: data.noteCount,
        label: '笔记总数',
      ),
      _StatCardData(
        icon: Icons.check_circle,
        iconColor: context.lingxiColors.achievementGold,
        value: data.knowledgePointsCompleted,
        label: '已完成知识点',
      ),
    ];

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      alignment: WrapAlignment.center,
      children: [
        for (var i = 0; i < cards.length; i++)
          _StatCard(data: cards[i], index: i),
      ],
    );
  }
}

class _StatCardData {
  const _StatCardData({
    required this.icon,
    required this.iconColor,
    required this.value,
    required this.label,
    this.subtitle,
    this.glowWhenActive = false,
    this.glowColor,
  });

  final IconData icon;
  final Color iconColor;
  final int value;
  final String label;
  final String? subtitle;
  final bool glowWhenActive;
  final Color? glowColor;
}

/// 单个统计卡片（staggered 入场 + 数字动画）。
class _StatCard extends StatelessWidget {
  const _StatCard({required this.data, required this.index});

  final _StatCardData data;
  final int index;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final width = Responsive.valueByDevice<double>(
      context,
      mobile: 160,
      tablet: 180,
      desktop: 200,
    );

    Widget iconWidget = Icon(data.icon, color: data.iconColor, size: 28);
    if (data.glowWhenActive && data.glowColor != null) {
      iconWidget = SpringMotion.shimmerGlow(
        glowColor: data.glowColor,
        child: iconWidget,
      );
    }

    Widget card = LingxiCard(
      animateEntrance: !reduceMotion,
      entranceDelay: Duration(milliseconds: 50 * index),
      padding: const EdgeInsets.all(16),
      child: SizedBox(
        width: width - 32,
        child: Column(
          children: [
            iconWidget,
            const SizedBox(height: 8),
            AnimatedCountText(
              value: data.value,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              data.label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            if (data.subtitle != null) ...[
              const SizedBox(height: 2),
              Text(
                data.subtitle!,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ],
        ),
      ),
    );

    return card;
  }
}

/// 柱状图卡片。
class _BarChartCard extends StatefulWidget {
  const _BarChartCard({required this.data, required this.range});

  final StatisticsData data;
  final StatsTimeRange range;

  @override
  State<_BarChartCard> createState() => _BarChartCardState();
}

class _BarChartCardState extends State<_BarChartCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: SpringMotion.slowDuration,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: SpringMotion.entranceCurve,
    );
    if (AnimationUtils.platformReduceMotion) {
      _visible = true;
      _controller.value = 1.0;
    } else {
      Future.delayed(const Duration(milliseconds: 200), () {
        if (mounted) {
          setState(() => _visible = true);
          _controller.forward();
        }
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
    final theme = Theme.of(context);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final days = switch (widget.range) {
      StatsTimeRange.week => 7,
      StatsTimeRange.month => 30,
      StatsTimeRange.all => 0,
    };

    final List<ChartBar> bars = [];

    if (widget.range == StatsTimeRange.all) {
      for (var i = 11; i >= 0; i--) {
        final month = DateTime(today.year, today.month - i);
        final keyPrefix =
            '${month.year}-${month.month.toString().padLeft(2, '0')}';
        var count = 0;
        widget.data.dailyActivity.forEach((key, value) {
          if (key.startsWith(keyPrefix)) count += value;
        });
        bars.add(ChartBar(label: '${month.month}月', value: count.toDouble()));
      }
    } else {
      for (var i = days - 1; i >= 0; i--) {
        final date = today.subtract(Duration(days: i));
        final key = _dateKey(date);
        final count = widget.data.dailyActivity[key] ?? 0;
        final label = widget.range == StatsTimeRange.week
            ? '${date.month}/${date.day}'
            : (i % 5 == 0 ? '${date.day}' : '');
        bars.add(ChartBar(label: label, value: count.toDouble()));
      }
    }

    final barColor = theme.colorScheme.primary;
    final todayColor = theme.colorScheme.tertiary;

    return AnimatedOpacity(
      duration: SpringMotion.gentleDuration,
      curve: SpringMotion.entranceCurve,
      opacity: _visible ? 1.0 : 0.0,
      child: LingxiCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '学习活动',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 160,
              child: AnimatedBuilder(
                animation: _animation,
                builder: (context, _) => CustomPaint(
                  size: Size.infinite,
                  painter: _BarChartPainter(
                    bars: bars,
                    animationValue: _animation.value,
                    barColor: barColor,
                    todayColor: todayColor,
                    highlightToday: widget.range != StatsTimeRange.all,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ChartBar {
  const ChartBar({required this.label, required this.value});
  final String label;
  final double value;
}

/// 柱状图 CustomPainter（支持从 0 动画增长，今日柱高亮）。
class _BarChartPainter extends CustomPainter {
  _BarChartPainter({
    required this.bars,
    required this.animationValue,
    required this.barColor,
    required this.todayColor,
    this.highlightToday = false,
  });

  final List<ChartBar> bars;
  final double animationValue;
  final Color barColor;
  final Color todayColor;
  final bool highlightToday;

  @override
  void paint(Canvas canvas, Size size) {
    if (bars.isEmpty) return;

    const labelHeight = 20.0;
    final chartHeight = size.height - labelHeight;
    final barWidth = size.width / bars.length;
    final maxVal = bars.fold<double>(
      0,
      (max, b) => b.value > max ? b.value : max,
    );
    final safeMax = maxVal == 0 ? 1.0 : maxVal;

    final gridPaint = Paint()
      ..color = Colors.grey.withValues(alpha: 0.2)
      ..strokeWidth = 0.5;

    for (var i = 0; i <= 4; i++) {
      final y = chartHeight * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    for (var i = 0; i < bars.length; i++) {
      final bar = bars[i];
      final targetH = (bar.value / safeMax) * chartHeight;
      final barH = targetH * animationValue;
      final left = i * barWidth + barWidth * 0.15;
      final right = i * barWidth + barWidth * 0.85;
      final top = chartHeight - barH;
      final isToday = highlightToday && i == bars.length - 1;
      final paint = Paint()
        ..color = isToday ? todayColor : barColor;
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTRB(left, top, right, chartHeight),
        const Radius.circular(4),
      );
      canvas.drawRRect(rect, paint);

      // 柱子顶部高光（有值时）
      if (barH > 4) {
        final glowPaint = Paint()
          ..color = (isToday ? todayColor : barColor).withValues(alpha: 0.25)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
        canvas.drawRRect(rect, glowPaint);
      }

      if (bar.label.isNotEmpty) {
        final tp = TextPainter(
          text: TextSpan(
            text: bar.label,
            style: TextStyle(
              fontSize: 9,
              color: isToday ? todayColor : Colors.grey[600],
              fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          textDirection: TextDirection.ltr,
        )..layout();
        tp.paint(
          canvas,
          Offset(
            i * barWidth + (barWidth - tp.width) / 2,
            chartHeight + 4,
          ),
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _BarChartPainter oldDelegate) {
    return oldDelegate.bars != bars ||
        oldDelegate.animationValue != animationValue ||
        oldDelegate.barColor != barColor ||
        oldDelegate.todayColor != todayColor;
  }
}

/// 课程完成度卡片。
class _CourseCompletionCard extends StatefulWidget {
  const _CourseCompletionCard({required this.data});

  final StatisticsData data;

  @override
  State<_CourseCompletionCard> createState() => _CourseCompletionCardState();
}

class _CourseCompletionCardState extends State<_CourseCompletionCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: SpringMotion.slowDuration,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: SpringMotion.entranceCurve,
    );
    if (AnimationUtils.platformReduceMotion) {
      _visible = true;
      _controller.value = 1.0;
    } else {
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) {
          setState(() => _visible = true);
          _controller.forward();
        }
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
    final theme = Theme.of(context);
    final entries = widget.data.completedByCourse.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return AnimatedOpacity(
      duration: SpringMotion.gentleDuration,
      curve: SpringMotion.entranceCurve,
      opacity: _visible ? 1.0 : 0.0,
      child: LingxiCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '知识点完成（按课程）',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            if (entries.isEmpty)
              Text(
                '暂无完成记录',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              )
            else
              AnimatedBuilder(
                animation: _animation,
                builder: (context, _) => Column(
                  children: [
                    for (var i = 0; i < entries.length; i++)
                      _CourseBar(
                        courseId: entries[i].key,
                        count: entries[i].value,
                        maxCount: entries.first.value,
                        animationValue: _animation.value,
                        delay: i * 0.1,
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CourseBar extends StatelessWidget {
  const _CourseBar({
    required this.courseId,
    required this.count,
    required this.maxCount,
    required this.animationValue,
    this.delay = 0.0,
  });

  final String courseId;
  final int count;
  final int maxCount;
  final double animationValue;
  final double delay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final rawRatio = maxCount == 0 ? 0.0 : count / maxCount;
    final localAnim = ((animationValue - delay) / (1.0 - delay)).clamp(0.0, 1.0);
    final ratio = rawRatio * localAnim;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              courseId,
              style: theme.textTheme.bodySmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: AnimatedProgressBar(
              progress: ratio,
              height: 12,
              borderRadius: 6,
              foregroundColor: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 28,
            child: AnimatedCountText(
              value: (count * animationValue).round(),
              style: theme.textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

/// 学习热力图卡片。
class _HeatmapCard extends StatefulWidget {
  const _HeatmapCard({required this.data});

  final StatisticsData data;

  @override
  State<_HeatmapCard> createState() => _HeatmapCardState();
}

class _HeatmapCardState extends State<_HeatmapCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: SpringMotion.slowDuration,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: SpringMotion.entranceCurve,
    );
    if (AnimationUtils.platformReduceMotion) {
      _visible = true;
      _controller.value = 1.0;
    } else {
      Future.delayed(const Duration(milliseconds: 400), () {
        if (mounted) {
          setState(() => _visible = true);
          _controller.forward();
        }
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
    final theme = Theme.of(context);
    final fireColor = context.lingxiColors.streakFire;

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final days = <_HeatmapCell>[];
    for (var i = 29; i >= 0; i--) {
      final date = today.subtract(Duration(days: i));
      final key = _dateKey(date);
      final count = widget.data.dailyActivity[key] ?? 0;
      days.add(_HeatmapCell(date: date, count: count));
    }

    return AnimatedOpacity(
      duration: SpringMotion.gentleDuration,
      curve: SpringMotion.entranceCurve,
      opacity: _visible ? 1.0 : 0.0,
      child: LingxiCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '学习热力图（近 30 天）',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 120,
              child: AnimatedBuilder(
                animation: _animation,
                builder: (context, _) => CustomPaint(
                  size: Size.infinite,
                  painter: _HeatmapPainter(
                    cells: days,
                    baseColor: fireColor,
                    animationValue: _animation.value,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeatmapCell {
  const _HeatmapCell({required this.date, required this.count});
  final DateTime date;
  final int count;
}

class _HeatmapPainter extends CustomPainter {
  _HeatmapPainter({
    required this.cells,
    required this.baseColor,
    required this.animationValue,
  });

  final List<_HeatmapCell> cells;
  final Color baseColor;
  final double animationValue;

  @override
  void paint(Canvas canvas, Size size) {
    if (cells.isEmpty) return;

    const cols = 10;
    const rows = 3;
    const spacing = 3.0;
    final cellW = (size.width - spacing * (cols - 1)) / cols;
    final cellH = (size.height - spacing * (rows - 1)) / rows;
    final cellSize = cellW < cellH ? cellW : cellH;

    final maxCount = cells.fold<int>(
      0,
      (max, c) => c.count > max ? c.count : max,
    );

    for (var i = 0; i < cells.length; i++) {
      // 每个格子按顺序错峰出现
      final cellDelay = i / cells.length * 0.5;
      final localAnim =
          ((animationValue - cellDelay) / (1.0 - cellDelay)).clamp(0.0, 1.0);
      if (localAnim <= 0) continue;

      final col = i % cols;
      final row = i ~/ cols;
      final x = col * (cellSize + spacing);
      final y = row * (cellSize + spacing);

      final intensity = maxCount == 0
          ? 0.0
          : cells[i].count / maxCount;
      final color = cells[i].count == 0
          ? Colors.grey.withValues(alpha: 0.15 * localAnim)
          : baseColor.withValues(alpha: (0.3 + intensity * 0.7) * localAnim);

      final paint = Paint()..color = color;
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, y, cellSize, cellSize),
        const Radius.circular(3),
      );
      canvas.drawRRect(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _HeatmapPainter oldDelegate) {
    return oldDelegate.cells != cells ||
        oldDelegate.animationValue != animationValue;
  }
}
