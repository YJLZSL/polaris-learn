import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/providers/course_providers.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';
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

/// 交错动画路径列表：使用自定义 SliverList + AnimatedBuilder 实现
/// 每个级别区块以 50ms 延迟依次出现。
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

class _StaggeredPathListState extends State<_StaggeredPathList> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    if (AnimationUtils.platformReduceMotion) {
      _visible = true;
    } else {
      Future.delayed(const Duration(milliseconds: 30), () {
        if (mounted) setState(() => _visible = true);
      });
    }
  }

  @override
  void didUpdateWidget(covariant _StaggeredPathList oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 筛选切换时重播入场动画
    if (oldWidget.selectedLevel != widget.selectedLevel) {
      if (!AnimationUtils.platformReduceMotion) {
        setState(() => _visible = false);
        Future.delayed(const Duration(milliseconds: 30), () {
          if (mounted) setState(() => _visible = true);
        });
      }
    }
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

        return _AnimatedLevelSection(
          key: ValueKey('level_${level.value}_$index'),
          index: index,
          visible: _visible,
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

/// 单个级别区块的交错入场包装。
class _AnimatedLevelSection extends StatelessWidget {
  const _AnimatedLevelSection({
    super.key,
    required this.index,
    required this.visible,
    required this.child,
  });

  final int index;
  final bool visible;
  final Widget child;

  /// 交错项延迟 50ms（规则 2）。
  static const Duration _staggerDelay = Duration(milliseconds: 50);

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    if (reduceMotion) return child;

    final delay = Duration(milliseconds: _staggerDelay.inMilliseconds * index);
    final totalDelay = delay;

    return AnimatedOpacity(
      opacity: visible ? 1.0 : 0.0,
      duration: SpringMotion.gentleDuration,
      curve: SpringMotion.entranceCurve,
      child: AnimatedSlide(
        offset: visible ? Offset.zero : const Offset(0, 0.08),
        duration: SpringMotion.gentleDuration,
        curve: Interval(
          (totalDelay.inMilliseconds / 600).clamp(0.0, 1.0).toDouble(),
          1.0,
          curve: SpringMotion.entranceCurve,
        ),
        child: AnimatedScale(
          scale: visible ? 1.0 : 0.96,
          duration: SpringMotion.gentleDuration,
          curve: Interval(
            (totalDelay.inMilliseconds / 600).clamp(0.0, 1.0).toDouble(),
            1.0,
            curve: SpringMotion.entranceCurve,
          ),
          child: child,
        ),
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

/// 连接线（从当前级别圆点延伸到下一个），带渐变。
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

class _LevelConnectorState extends State<_LevelConnector> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    if (AnimationUtils.platformReduceMotion) {
      _visible = true;
    } else {
      Future.delayed(const Duration(milliseconds: 200), () {
        if (mounted) setState(() => _visible = true);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final height = reduceMotion ? widget.height : (_visible ? widget.height : 0.0);
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
    );
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

    return LingxiCard(
      animateEntrance: !reduceMotion,
      entranceDelay: Duration(milliseconds: 40 + widget.indexInLevel * 50),
      onTap: () {
        final lessonId = _firstLessonId;
        if (lessonId == null) return;
        AnimationUtils.hapticMedium();
        context.go('${RouteNames.learningPath}/${widget.course.id}/$lessonId');
      },
      child: FutureBuilder<List<ProgressEntry>>(
        future: ref.read(progressRepositoryProvider).getProgress(widget.course.id),
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
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            if (isCompleted)
                              _CheckmarkPop(visible: _initiallyVisible),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.course.description,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
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
              // 动画进度条（替代 LinearProgressIndicator）
              AnimatedProgressBar(
                progress: progress,
                height: 8,
                gradient: LinearGradient(
                  colors: widget.gradient,
                ),
                enablePulse: progress > 0 && progress < 1.0,
                borderRadius: ShapeVariants.roundedSmall.borderRadius.topLeft.x,
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
