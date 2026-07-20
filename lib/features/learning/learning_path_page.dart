import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/core/theme/lingxi_colors.dart';
import 'package:lingxi_academy/core/theme/lingxi_gradients.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/providers/course_providers.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';
import 'package:lingxi_academy/features/learning/course_level_extensions.dart';
import 'package:lingxi_academy/features/mascot/mascot_widget.dart';
import 'package:lingxi_academy/shared/utils/responsive.dart';
import 'package:lingxi_academy/shared/widgets/animated_progress_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_chip.dart';

/// 学习路径页。
///
/// 展示 L0-L4 五层学习路径，每个级别下显示课程列表。点击课程卡片
/// 导航到该课程的第一个知识点。列表支持交错入场动画、按级别筛选、
/// 课程卡片弹簧反馈、进度条平滑动画、完成项打勾弹性动画。
class LearningPathPage extends ConsumerStatefulWidget {
  const LearningPathPage({super.key});

  @override
  ConsumerState<LearningPathPage> createState() => _LearningPathPageState();
}

class _LearningPathPageState extends ConsumerState<LearningPathPage> {
  /// 当前选中的级别筛选；null 表示显示全部。
  CourseLevel? _selectedLevel;

  @override
  Widget build(BuildContext context) {
    final coursesAsync = ref.watch(allCoursesProvider);
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('学习路径'),
            SizedBox(width: 4),
            Text('🦏', style: TextStyle(fontSize: 20)),
          ],
        ),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: MascotWidget(size: 40),
          ),
        ],
      ),
      body: coursesAsync.when(
        data: (courses) {
          if (courses.isEmpty) {
            return _buildEmpty(context);
          }
          return _buildPath(context, courses, theme);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('加载课程失败：$error')),
      ),
    );
  }

  /// 空状态：吉祥物 + "课程即将上线"文案。
  Widget _buildEmpty(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: SpringMotion.springTransition(
          beginOffset: const Offset(0, 0.1),
          duration: SpringMotion.gentleDuration,
          curve: SpringMotion.entranceCurve,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const MascotWidget(size: 120),
              const SizedBox(height: 16),
              Text(
                '课程即将上线',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                '小犀正在精心准备内容，敬请期待～',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 构建垂直路径：顶部筛选 Chip + 5 个级别（L0-L4）依次排列。
  Widget _buildPath(BuildContext context, List<Course> courses, ThemeData theme) {
    // 按级别分组。
    final byLevel = <CourseLevel, List<Course>>{};
    for (final course in courses) {
      byLevel.putIfAbsent(course.level, () => <Course>[]).add(course);
    }
    const allLevels = CourseLevel.values;
    final isDesktop = Responsive.isDesktop(context);

    // 筛选后要显示的级别。
    final visibleLevels = _selectedLevel == null
        ? allLevels.toList()
        : <CourseLevel>[_selectedLevel!];

    return Column(
      children: [
        // 级别筛选 Chip 行
        _buildLevelFilter(allLevels, theme),
        // 路径列表
        Expanded(
          child: _StaggeredPathList(
            levels: visibleLevels,
            byLevel: byLevel,
            isDesktop: isDesktop,
            selectedLevel: _selectedLevel,
          ),
        ),
      ],
    );
  }

  /// 构建顶部级别筛选 Chips。
  Widget _buildLevelFilter(List<CourseLevel> allLevels, ThemeData theme) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    return SpringMotion.slideFadeTransition(
      direction: AxisDirection.down,
      duration: reduceMotion
          ? SpringMotion.fastDuration
          : SpringMotion.gentleDuration,
      distance: 16,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              LingxiChip(
                label: const Text('全部'),
                variant: LingxiChipVariant.filter,
                selected: _selectedLevel == null,
                onSelected: (_) {
                  AnimationUtils.hapticLight();
                  setState(() => _selectedLevel = null);
                },
              ),
              const SizedBox(width: 8),
              for (final level in allLevels) ...[
                LingxiChip(
                  label: Text(_levelShortName(level)),
                  avatar: Icon(
                    _levelIcon(level),
                    size: 16,
                  ),
                  variant: LingxiChipVariant.filter,
                  selected: _selectedLevel == level,
                  onSelected: (selected) {
                    AnimationUtils.hapticLight();
                    setState(() => _selectedLevel = selected ? level : null);
                  },
                ),
                const SizedBox(width: 8),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _levelShortName(CourseLevel level) => switch (level) {
        CourseLevel.l0 => 'L0 基础',
        CourseLevel.l1 => 'L1 初级',
        CourseLevel.l2 => 'L2 中级',
        CourseLevel.l3 => 'L3 高级',
        CourseLevel.l4 => 'L4 专家',
      };

  IconData _levelIcon(CourseLevel level) => switch (level) {
        CourseLevel.l0 => Icons.child_care,
        CourseLevel.l1 => Icons.school,
        CourseLevel.l2 => Icons.auto_stories,
        CourseLevel.l3 => Icons.psychology,
        CourseLevel.l4 => Icons.emoji_events,
      };
}

/// 交错动画路径列表：使用单个 [AnimationController] 驱动每个级别区块的
/// [Interval] 子动画，每个区块延迟 50ms，单项时长 200ms（SpringMotion
/// 默认时长），曲线使用 [SpringMotion.defaultCurve]。
class _StaggeredPathList extends StatefulWidget {
  const _StaggeredPathList({
    required this.levels,
    required this.byLevel,
    required this.isDesktop,
    required this.selectedLevel,
  });

  final List<CourseLevel> levels;
  final Map<CourseLevel, List<Course>> byLevel;
  final bool isDesktop;
  final CourseLevel? selectedLevel;

  @override
  State<_StaggeredPathList> createState() => _StaggeredPathListState();
}

class _StaggeredPathListState extends State<_StaggeredPathList>
    with SingleTickerProviderStateMixin {
  /// 交错入场动画控制器：驱动每个级别区块的 Interval 子动画。
  late final AnimationController _staggerController;

  /// 交错项延迟（ms）：第 i 项的延迟为 i * [_staggerDelayMs]。
  static const int _staggerDelayMs = 50;

  /// 单项入场时长（ms），取自 [SpringMotion.defaultDuration]。
  static const int _itemDurationMs =
      SpringMotion.defaultDuration.inMilliseconds;

  @override
  void initState() {
    super.initState();
    _staggerController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: _computeTotalMs()),
    );
    if (AnimationUtils.platformReduceMotion) {
      _staggerController.value = 1.0;
    } else {
      // 延迟一帧再启动，确保 layout 完成
      Future.delayed(const Duration(milliseconds: 30), () {
        if (mounted) _staggerController.forward();
      });
    }
  }

  @override
  void didUpdateWidget(covariant _StaggeredPathList oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 筛选切换时重置时长并重播入场动画
    if (oldWidget.selectedLevel != widget.selectedLevel ||
        oldWidget.levels.length != widget.levels.length) {
      _staggerController.duration =
          Duration(milliseconds: _computeTotalMs());
      if (AnimationUtils.platformReduceMotion) {
        _staggerController.value = 1.0;
      } else {
        _staggerController.forward(from: 0.0);
      }
    }
  }

  @override
  void dispose() {
    _staggerController.dispose();
    super.dispose();
  }

  /// 计算控制器总时长： (count - 1) * 50 + 200 = 最后一项的延迟 + 单项时长。
  int _computeTotalMs() {
    if (widget.levels.isEmpty) return _itemDurationMs;
    return (widget.levels.length - 1) * _staggerDelayMs + _itemDurationMs;
  }

  /// 计算指定 index 的 Interval：begin = i*50/total, end = (i*50+200)/total。
  Interval _intervalFor(int index) {
    final totalMs = _computeTotalMs();
    if (totalMs <= 0) {
      return const Interval(0.0, 1.0, curve: SpringMotion.defaultCurve);
    }
    final begin = (index * _staggerDelayMs) / totalMs;
    final end = (index * _staggerDelayMs + _itemDurationMs) / totalMs;
    return Interval(
      begin.clamp(0.0, 1.0).toDouble(),
      end.clamp(0.0, 1.0).toDouble(),
      curve: SpringMotion.defaultCurve,
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: widget.levels.length,
      itemBuilder: (context, index) {
        final level = widget.levels[index];
        final levelCourses = widget.byLevel[level] ?? <Course>[];
        final isLast = index == widget.levels.length - 1;

        // 通过 CurveTween(Interval) 派生子动画，无需手动 dispose。
        final animation = _staggerController.drive(
          CurveTween(curve: _intervalFor(index)),
        );

        return _AnimatedLevelSection(
          key: ValueKey('level_${level.value}_$index'),
          animation: animation,
          child: _LevelSection(
            level: level,
            courses: levelCourses,
            isLast: isLast,
            isDesktop: widget.isDesktop,
          ),
        );
      },
    );
  }
}

/// 单个级别区块的交错入场包装：[FadeTransition] + [SlideTransition]。
///
/// 入场效果：opacity 0→1 + translate y(16px → 0)，duration 为
/// [SpringMotion.defaultDuration]（200ms），curve 为
/// [SpringMotion.defaultCurve]。reduceMotion 下直接返回 child。
class _AnimatedLevelSection extends StatelessWidget {
  const _AnimatedLevelSection({
    super.key,
    required this.animation,
    required this.child,
  });

  /// 父级 [AnimationController] 经 Interval 过滤后的子动画（0→1）。
  final Animation<double> animation;

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    if (reduceMotion) return child;

    // SlideTransition 使用相对偏移，0.05 ≈ 16px（典型卡片高度 ≈ 320px）。
    final slideAnimation = animation.drive(
      Tween<Offset>(
        begin: const Offset(0, 0.05),
        end: Offset.zero,
      ),
    );

    return FadeTransition(
      opacity: animation,
      child: SlideTransition(
        position: slideAnimation,
        child: child,
      ),
    );
  }
}

/// 单个级别区块：左侧级别圆点 + 连接线，右侧课程列表。
class _LevelSection extends StatelessWidget {
  const _LevelSection({
    required this.level,
    required this.courses,
    required this.isLast,
    required this.isDesktop,
  });

  final CourseLevel level;
  final List<Course> courses;
  final bool isLast;
  final bool isDesktop;

  String get _levelTitle => switch (level) {
        CourseLevel.l0 => 'L0 AI 基础',
        CourseLevel.l1 => 'L1 初级',
        CourseLevel.l2 => 'L2 中级',
        CourseLevel.l3 => 'L3 高级',
        CourseLevel.l4 => 'L4 专家',
      };

  /// 级别对应渐变色。
  List<Color> _levelGradient(ThemeData theme) {
    final scheme = theme.colorScheme;
    return switch (level) {
      CourseLevel.l0 => [
          const Color(0xFF4FC3F7),
          const Color(0xFF29B6F6),
        ],
      CourseLevel.l1 => [
          scheme.primary,
          scheme.primary.withValues(alpha: 0.75),
        ],
      CourseLevel.l2 => [
          const Color(0xFF66BB6A),
          const Color(0xFF43A047),
        ],
      CourseLevel.l3 => [
          const Color(0xFFFFA726),
          const Color(0xFFFB8C00),
        ],
      CourseLevel.l4 => [
          const Color(0xFFEF5350),
          const Color(0xFFE53935),
        ],
    };
  }

  IconData get _levelIcon => switch (level) {
        CourseLevel.l0 => Icons.child_care,
        CourseLevel.l1 => Icons.school,
        CourseLevel.l2 => Icons.auto_stories,
        CourseLevel.l3 => Icons.psychology,
        CourseLevel.l4 => Icons.emoji_events,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradient = _levelGradient(theme);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 左侧：级别圆点 + 连接线（路线图风格）。
        SizedBox(
          width: 56,
          child: Column(
            children: [
              _buildLevelCircle(gradient, theme),
              if (!isLast)
                _LevelConnector(
                  gradient: gradient,
                  height: 100,
                ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        // 右侧：级别标题 + 课程列表。
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Text(
                    _levelTitle,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (courses.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      '该级别课程即将上线',
                      style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                    ),
                  )
                else
                  Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    children: [
                      for (var i = 0; i < courses.length; i++)
                        SizedBox(
                          width: isDesktop ? 360 : double.infinity,
                          child: _CourseCard(
                            course: courses[i],
                            indexInLevel: i,
                            gradient: gradient,
                          ),
                        ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLevelCircle(List<Color> gradient, ThemeData theme) {
    return SpringMotion.shimmerGlow(
      glowColor: gradient.first,
      period: const Duration(seconds: 3),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: gradient,
          ),
          boxShadow: [
            BoxShadow(
              color: gradient.first.withValues(alpha: 0.4),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: Icon(
          _levelIcon,
          color: Colors.white,
          size: 20,
        ),
      ),
    );
  }
}

/// 连接线（从当前级别圆点延伸到下一个），带渐变与流光虚线动画。
///
/// 入场时高度从 0 弹性增长到 [widget.height]；入场完成后启动 2 秒循环的
/// 流光动画，通过 [_FlowingDashedLinePainter] 沿垂直路径绘制带 dashOffset
/// 偏移的虚线段，形成"光流向下"的视觉。reduceMotion 下降级为静态连接线。
class _LevelConnector extends StatefulWidget {
  const _LevelConnector({
    required this.gradient,
    required this.height,
  });

  final List<Color> gradient;
  final double height;

  @override
  State<_LevelConnector> createState() => _LevelConnectorState();
}

class _LevelConnectorState extends State<_LevelConnector>
    with SingleTickerProviderStateMixin {
  bool _visible = false;

  /// 流光动画控制器：2 秒一周期，repeat 驱动虚线 dashOffset。
  late final AnimationController _flowController;

  @override
  void initState() {
    super.initState();
    _flowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    if (AnimationUtils.platformReduceMotion) {
      _visible = true;
    } else {
      Future.delayed(const Duration(milliseconds: 200), () {
        if (mounted) {
          setState(() => _visible = true);
          _flowController.repeat();
        }
      });
    }
  }

  @override
  void dispose() {
    _flowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final height = reduceMotion
        ? widget.height
        : (_visible ? widget.height : 0.0);
    return AnimatedContainer(
      duration: SpringMotion.slowDuration,
      curve: SpringMotion.entranceCurve,
      width: 3,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(2),
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            widget.gradient.last.withValues(alpha: 0.8),
            widget.gradient.last.withValues(alpha: 0.2),
          ],
        ),
      ),
      // reduceMotion 下不叠加流光，保持静态渐变连接线。
      child: reduceMotion
          ? null
          : AnimatedBuilder(
              animation: _flowController,
              builder: (context, _) {
                return CustomPaint(
                  painter: _FlowingDashedLinePainter(
                    color: widget.gradient.first,
                    progress: _flowController.value,
                  ),
                );
              },
            ),
    );
  }
}

/// 流光虚线绘制器：沿垂直路径绘制流动的虚线段，形成流光效果。
///
/// 使用 [PathMetric] 计算路径长度并按 [progress] 偏移虚线起点，
/// 实现 dashOffset 动画。虚线颜色叠加在背景渐变之上形成"光流"观感。
class _FlowingDashedLinePainter extends CustomPainter {
  _FlowingDashedLinePainter({
    required this.color,
    required this.progress,
  });

  /// 虚线颜色（通常取级别渐变中较亮的一端）。
  final Color color;

  /// 动画进度 [0, 1]，驱动虚线起点偏移。
  final double progress;

  static const double _dashLength = 6.0;
  static const double _gapLength = 4.0;
  static const double _cycle = _dashLength + _gapLength;

  @override
  void paint(Canvas canvas, Size size) {
    final pathLength = size.height;
    if (pathLength <= 0) return;

    final centerX = size.width / 2;
    final path = Path()
      ..moveTo(centerX, 0)
      ..lineTo(centerX, pathLength);

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width
      ..strokeCap = StrokeCap.round;

    // dashOffset：progress 0→1 对应一个周期的偏移，使虚线视觉上向下流动。
    final offset = (progress * _cycle) % _cycle;
    final metrics = path.computeMetrics();
    for (final metric in metrics) {
      var start = -offset;
      while (start < metric.length) {
        final end = start + _dashLength;
        final clippedStart = start.clamp(0.0, metric.length);
        final clippedEnd = end.clamp(0.0, metric.length);
        if (clippedEnd > clippedStart) {
          final dashPath = metric.extractPath(clippedStart, clippedEnd);
          canvas.drawPath(dashPath, paint);
        }
        start += _cycle;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _FlowingDashedLinePainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}

/// 课程卡片：渐变圆形图标、标题、描述、动画进度条、完成打勾。
class _CourseCard extends ConsumerStatefulWidget {
  const _CourseCard({
    required this.course,
    required this.indexInLevel,
    required this.gradient,
  });

  final Course course;
  final int indexInLevel;
  final List<Color> gradient;

  @override
  ConsumerState<_CourseCard> createState() => _CourseCardState();
}

class _CourseCardState extends ConsumerState<_CourseCard> {
  bool _initiallyVisible = false;

  @override
  void initState() {
    super.initState();
    if (AnimationUtils.platformReduceMotion) {
      _initiallyVisible = true;
    } else {
      final delayMs = 80 + widget.indexInLevel * 60;
      Future.delayed(Duration(milliseconds: delayMs), () {
        if (mounted) setState(() => _initiallyVisible = true);
      });
    }
  }

  /// 统计课程下全部知识点数量。
  int get _totalKnowledgePoints {
    var count = 0;
    for (final module in widget.course.modules) {
      for (final lesson in module.lessons) {
        count += lesson.knowledgePoints.length;
      }
    }
    return count;
  }

  /// 取第一个 lesson 的 ID（用于跳转）。
  String? get _firstLessonId {
    for (final module in widget.course.modules) {
      if (module.lessons.isNotEmpty) {
        return module.lessons.first.id;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = _totalKnowledgePoints;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    // 级别色条颜色：按 CourseLevel 映射到 LingxiColors 语义色。
    final levelColor =
        widget.course.level.levelColor(context.lingxiColors);
    // 进度条渐变统一使用主题成功色（绿 → 深绿）。
    final successGradient = context.lingxiGradients.success;

    return LingxiCard(
      animateEntrance: !reduceMotion,
      entranceDelay: Duration(milliseconds: 40 + widget.indexInLevel * 50),
      padding: EdgeInsets.zero,
      onTap: () {
        final lessonId = _firstLessonId;
        if (lessonId == null) return;
        AnimationUtils.hapticMedium();
        context.go('${RouteNames.learningPath}/${widget.course.id}/$lessonId');
      },
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 4px 级别色条（垂直），带左上/左下圆角贴合卡片圆角。
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: levelColor,
                borderRadius: BorderRadius.only(
                  topLeft:
                      ShapeVariants.roundedLarge.borderRadius.topLeft,
                  bottomLeft:
                      ShapeVariants.roundedLarge.borderRadius.bottomLeft,
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FutureBuilder<List<ProgressEntry>>(
                  future: ref
                      .read(progressRepositoryProvider)
                      .getProgress(widget.course.id),
                  builder: (context, snapshot) {
                    final completed = snapshot.data
                            ?.where((entry) => entry.status == 'completed')
                            .length ??
                        0;
                    final progress = total > 0 ? completed / total : 0.0;
                    final isCompleted = progress >= 1.0 && total > 0;

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 渐变圆形图标
                            _CourseIcon(
                              icon: widget.course.icon,
                              gradient: widget.gradient,
                              isCompleted: isCompleted,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          widget.course.title,
                                          style: theme.textTheme.titleMedium
                                              ?.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      if (isCompleted)
                                        _CheckmarkPop(
                                            visible: _initiallyVisible),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    widget.course.description,
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color:
                                          theme.colorScheme.onSurfaceVariant,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // 动画进度条：使用 LingxiGradients.success 渐变。
                        AnimatedProgressBar(
                          progress: progress,
                          height: 8,
                          gradient: successGradient,
                          enablePulse: progress > 0 && progress < 1.0,
                          borderRadius: ShapeVariants
                              .roundedSmall.borderRadius.topLeft.x,
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Text(
                              '$completed / $total 知识点',
                              style: theme.textTheme.bodySmall,
                            ),
                            const Spacer(),
                            if (progress > 0 && progress < 1.0)
                              Text(
                                '${(progress * 100).toInt()}%',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: widget.gradient.last,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                          ],
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 课程卡渐变圆形图标（支持按压弹簧缩放）。
class _CourseIcon extends StatefulWidget {
  const _CourseIcon({
    required this.icon,
    required this.gradient,
    required this.isCompleted,
  });

  final String icon;
  final List<Color> gradient;
  final bool isCompleted;

  @override
  State<_CourseIcon> createState() => _CourseIconState();
}

class _CourseIconState extends State<_CourseIcon> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    return Listener(
      onPointerDown: (_) {
        if (!reduceMotion) setState(() => _pressed = true);
      },
      onPointerUp: (_) {
        if (!reduceMotion) setState(() => _pressed = false);
      },
      onPointerCancel: () {
        if (!reduceMotion) setState(() => _pressed = false);
      },
      child: AnimatedScale(
        scale: _pressed ? 0.9 : 1.0,
        duration: SpringMotion.fastDuration,
        curve: Curves.easeOutBack,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: widget.isCompleted
                  ? [const Color(0xFF66BB6A), const Color(0xFF43A047)]
                  : widget.gradient,
            ),
            boxShadow: [
              BoxShadow(
                color: widget.gradient.first.withValues(alpha: 0.35),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Text(
            widget.icon,
            style: const TextStyle(fontSize: 26),
          ),
        ),
      ),
    );
  }
}

/// 完成对勾：弹簧弹出动画（Curves.easeOutBack）。
class _CheckmarkPop extends StatefulWidget {
  const _CheckmarkPop({required this.visible});

  final bool visible;

  @override
  State<_CheckmarkPop> createState() => _CheckmarkPopState();
}

class _CheckmarkPopState extends State<_CheckmarkPop>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _scale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 1.3)
            .chain(CurveTween(curve: Curves.easeOutBack)),
        weight: 60,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.3, end: 1.0)
            .chain(CurveTween(curve: Curves.easeOutCubic)),
        weight: 40,
      ),
    ]).animate(_controller);

    if (widget.visible && !AnimationUtils.platformReduceMotion) {
      _controller.forward();
    } else {
      _controller.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(covariant _CheckmarkPop oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visible && !oldWidget.visible) {
      if (AnimationUtils.reduceMotionOf(context)) {
        _controller.value = 1.0;
      } else {
        _controller.forward(from: 0.0);
      }
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
      return const Icon(Icons.check_circle, color: Color(0xFF43A047), size: 22);
    }
    return AnimatedBuilder(
      animation: _scale,
      builder: (context, child) => Transform.scale(
        scale: _scale.value,
        child: child,
      ),
      child: ShaderMask(
        shaderCallback: (bounds) => const LinearGradient(
          colors: [Color(0xFF66BB6A), Color(0xFF43A047)],
        ).createShader(bounds),
        child: const Icon(
          Icons.check_circle,
          color: Colors.white,
          size: 22,
        ),
      ),
    );
  }
}
