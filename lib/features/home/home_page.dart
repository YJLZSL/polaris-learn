// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/page_transitions.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/core/theme/lingxi_colors.dart';
import 'package:lingxi_academy/core/theme/lingxi_gradients.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/providers/course_providers.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/features/learning/course_level_extensions.dart';
import 'package:lingxi_academy/features/mascot/mascot_controller.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:lingxi_academy/features/mascot/mascot_widget.dart';
import 'package:lingxi_academy/features/progress/achievement_service.dart';
import 'package:lingxi_academy/features/progress/streak_service.dart';
import 'package:lingxi_academy/shared/widgets/animated_count_text.dart';
import 'package:lingxi_academy/shared/widgets/animated_progress_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 首页：展示欢迎信息、吉祥物、连续学习天数、继续学习入口与快捷操作。
class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  int _streakDays = 0;
  final ScrollController _scrollController = ScrollController();

  /// 交错入场的起始延迟与步进
  static const Duration _staggerBaseDelay = Duration(milliseconds: 100);
  static const Duration _staggerStep = Duration(milliseconds: 40);
  static const Duration _staggerDuration = Duration(milliseconds: 500);

  @override
  void initState() {
    super.initState();
    // 延迟一帧后执行，确保 ref 可用
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _recordStudyActivity();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  /// 记录今日学习活动，更新 streak 与成就。
  Future<void> _recordStudyActivity() async {
    try {
      final streakService = ref.read(streakServiceProvider);
      final streak = await streakService.recordStudyActivity();

      if (!mounted) return;
      setState(() => _streakDays = streak.currentStreak);

      // streak >= 3 时触发吉祥物开心
      if (streak.currentStreak >= 3) {
        ref.read(mascotControllerProvider.notifier).setMood(MascotMood.happy);
      }

      // 检查 streak 相关成就
      await ref
          .read(achievementServiceProvider)
          .checkStreakAchievements(streak.currentStreak);
    } on Object {
      // DB 操作失败时静默处理，不影响首页展示
      if (mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          const SnackBar(content: Text('学习记录同步失败，请稍后重试')),
        );
      }
    }
  }

  /// 计算指定索引项的交错延迟
  Duration _entranceDelayFor(int index) {
    return _staggerBaseDelay + _staggerStep * index;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final gradients = context.lingxiGradients;
    final lingxiColors = context.lingxiColors;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final isStreakActive = _streakDays > 0;

    return Scaffold(
      appBar: LingxiAppBar(
        title: const Text('首页'),
        scrollController: _scrollController,
        actions: [
          _StreakBadge(
            days: _streakDays,
            isActive: isStreakActive,
            fireGradient: gradients.streakFire,
            fireColor: lingxiColors.streakFire,
            onTap: () => context.go(RouteNames.statisticsPath),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        controller: _scrollController,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── 1. Hero 问候区（渐变背景 + 吉祥物呼吸动画）──
                _buildHeroSection(
                  colorScheme: colorScheme,
                  gradients: gradients,
                  reduceMotion: reduceMotion,
                ),

                const SizedBox(height: 24),

                // ── 2. 继续学习 CTA ──
                _buildContinueLearning(
                  theme: theme,
                  colorScheme: colorScheme,
                  reduceMotion: reduceMotion,
                ),

                const SizedBox(height: 28),

                // ── 3. 课程进度卡片 ──
                _SectionTitle(
                  title: '学习进度',
                  subtitle: '继续你的 AI 学习之旅',
                  entranceDelay: _entranceDelayFor(2),
                ),
                const SizedBox(height: 12),
                _buildCourseProgressCards(
                  theme: theme,
                  colorScheme: colorScheme,
                  startIndex: 3,
                ),

                const SizedBox(height: 28),

                // ── 4. 快捷操作网格 ──
                _SectionTitle(
                  title: '快捷入口',
                  subtitle: '一键直达常用功能',
                  entranceDelay: _entranceDelayFor(5),
                ),
                const SizedBox(height: 12),
                _buildQuickActions(
                  theme: theme,
                  colorScheme: colorScheme,
                  startIndex: 6,
                ),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── Hero 问候区 ──────────────────────────────────────────

  /// 桌面端断点：≥1024px 视为桌面布局（与全局 Responsive.isDesktop 一致）
  static const double _desktopBreakpoint = 1024;

  Widget _buildHeroSection({
    required ColorScheme colorScheme,
    required LingxiGradients gradients,
    required bool reduceMotion,
  }) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final isDesktop = screenWidth >= _desktopBreakpoint;
    // 桌面端：右侧 200px；移动端：顶部 160px
    final mascotSize = isDesktop ? 200.0 : 160.0;
    final mascotWidget = MascotWidget(size: mascotSize);

    // 副标题：今日日期（如 "7月20日 周日"）
    final now = DateTime.now();
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    final dateStr = '${now.month}月${now.day}日 ${weekdays[now.weekday - 1]}';

    // 文字对齐方式：桌面端左对齐，移动端居中
    final textAlignment = isDesktop ? TextAlign.left : TextAlign.center;
    final crossAxisAlign =
        isDesktop ? CrossAxisAlignment.start : CrossAxisAlignment.center;

    // 三级字号梯度：主问候语 24px bold / 副标题 18px medium / 引导文案 14px regular
    final textColumn = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: crossAxisAlign,
      children: [
        Text(
          '欢迎来到灵犀学院',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: colorScheme.onSurface,
            height: 1.2,
          ),
          textAlign: textAlignment,
        ),
        const SizedBox(height: 6),
        Text(
          dateStr,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w500,
            color: colorScheme.onSurfaceVariant,
          ),
          textAlign: textAlignment,
        ),
        const SizedBox(height: 6),
        Text(
          '和小犀一起，开启你的 AI 学习之旅',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: colorScheme.onSurfaceVariant,
          ),
          textAlign: textAlignment,
        ),
      ],
    );

    // 吉祥物：呼吸脉动效果 + Hero 共享元素过渡
    // MascotHero 内部判断 reduceMotion 并降级为即时切换
    final mascot = reduceMotion
        ? MascotHero(child: mascotWidget)
        : MascotHero(
            child: SpringMotion.pulseBreathing(
              minScale: 1.0,
              maxScale: 1.03,
              period: const Duration(seconds: 3),
              child: mascotWidget,
            ),
          );

    // 桌面端：吉祥物在右侧；移动端：吉祥物在顶部
    final content = isDesktop
        ? Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(child: textColumn),
              const SizedBox(width: 24),
              mascot,
            ],
          )
        : Column(
            children: [
              mascot,
              const SizedBox(height: 16),
              textColumn,
            ],
          );

    return _StaggeredEntrance(
      delay: _entranceDelayFor(0),
      duration: _staggerDuration,
      reduceMotion: reduceMotion,
      child: Container(
        decoration: BoxDecoration(
          gradient: gradients.primarySurface,
          borderRadius: ShapeVariants.roundedExtraLarge.borderRadius,
        ),
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
        child: content,
      ),
    );
  }

  // ── 继续学习 CTA ────────────────────────────────────────

  Widget _buildContinueLearning({
    required ThemeData theme,
    required ColorScheme colorScheme,
    required bool reduceMotion,
  }) {
    return _StaggeredEntrance(
      delay: _entranceDelayFor(1),
      duration: _staggerDuration,
      reduceMotion: reduceMotion,
      child: LingxiCard(
        variant: LingxiCardVariant.primary,
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: colorScheme.primary.withValues(alpha: 0.15),
                borderRadius: ShapeVariants.roundedMedium.borderRadius,
              ),
              child: Icon(
                Icons.play_circle_filled_rounded,
                size: 30,
                color: colorScheme.primary,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '继续学习',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '从上次中断的地方继续',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onPrimaryContainer.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            LingxiButton(
              label: const Text('开始'),
              icon: const Icon(Icons.arrow_forward_rounded, size: 18),
              variant: LingxiButtonVariant.filled,
              size: LingxiButtonSize.medium,
              pulse: !reduceMotion,
              onPressed: () {
                AnimationUtils.hapticMedium();
                context.go(RouteNames.learningPath);
              },
            ),
          ],
        ),
      ),
    );
  }

  // ── 课程进度卡片 ────────────────────────────────────────

  /// 为不同级别的课程生成图标
  static const _levelIcons = <CourseLevel, IconData>{
    CourseLevel.l0: Icons.code_rounded,
    CourseLevel.l1: Icons.auto_awesome_rounded,
    CourseLevel.l2: Icons.rocket_launch_rounded,
    CourseLevel.l3: Icons.psychology_rounded,
    CourseLevel.l4: Icons.architecture_rounded,
  };

  Widget _buildCourseProgressCards({
    required ThemeData theme,
    required ColorScheme colorScheme,
    required int startIndex,
  }) {
    final coursesAsync = ref.watch(allCoursesProvider);

    return coursesAsync.when(
      data: (courses) {
        if (courses.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(
              '暂无课程，请稍后再来',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          );
        }
        return Column(
          children: [
            for (var i = 0; i < courses.length; i++)
              _CourseProgressCard(
                course: courses[i],
                index: startIndex + i,
                entranceDelay: _entranceDelayFor(startIndex + i),
                isLast: i == courses.length - 1,
              ),
          ],
        );
      },
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Text(
          '课程加载失败',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.error,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  // ── 快捷操作网格 ────────────────────────────────────────

  Widget _buildQuickActions({
    required ThemeData theme,
    required ColorScheme colorScheme,
    required int startIndex,
  }) {
    final actions = _getQuickActions();

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        // 48x48 图标容器 + 间距 + 文字 + 卡片 padding，需要更高格子
        childAspectRatio: 0.82,
      ),
      itemCount: actions.length,
      itemBuilder: (context, i) {
        final action = actions[i];
        final item = LingxiCard(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          onTap: () {
            AnimationUtils.hapticLight();
            action.onTap(context);
          },
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // 圆角方形图标容器：48x48 + BorderRadius.circular(12) + 语义色背景
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: action.color,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  action.icon,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                action.label,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        );

        // 卡片自身已有 hover/press 效果；外包交错入场动画
        return _StaggeredEntrance(
          delay: _entranceDelayFor(startIndex + i),
          duration: _staggerDuration,
          reduceMotion: AnimationUtils.reduceMotionOf(context),
          beginOffset: const Offset(0, 0.08),
          child: item,
        );
      },
    );
  }

  // ── 演示数据（已移除 _getDemoCourses，改用真实数据）────────────

  List<_QuickAction> _getQuickActions() {
    final lingxiColors = context.lingxiColors;
    return [
      _QuickAction(
        label: 'AI 对话',
        icon: Icons.chat_bubble_outline_rounded,
        // 苏格拉底引导蓝
        color: lingxiColors.socraticBlue,
        onTap: (ctx) => ctx.go(RouteNames.chatListPath),
      ),
      _QuickAction(
        label: '我的笔记',
        icon: Icons.edit_note_rounded,
        // 吉祥物辅色 - 温暖橙
        color: lingxiColors.mascotSecondary,
        onTap: (ctx) => ctx.go(RouteNames.notesPath),
      ),
      _QuickAction(
        label: '成就',
        icon: Icons.emoji_events_outlined,
        // 成就金
        color: lingxiColors.achievementGold,
        onTap: (ctx) => ctx.go(RouteNames.achievementsPath),
      ),
      _QuickAction(
        label: '统计',
        icon: Icons.bar_chart_rounded,
        // 吉祥物主色 - 星空紫
        color: lingxiColors.mascotPrimary,
        onTap: (ctx) => ctx.go(RouteNames.statisticsPath),
      ),
    ];
  }
}

// ── 课程进度卡片组件（从真实数据渲染）────────────────────

/// 单个课程进度卡片，从 [ProgressRepository] 实时查询完成率。
class _CourseProgressCard extends ConsumerWidget {
  const _CourseProgressCard({
    required this.course,
    required this.index,
    required this.entranceDelay,
    required this.isLast,
  });

  final Course course;
  final int index;
  final Duration entranceDelay;
  final bool isLast;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final progressRepo = ref.watch(progressRepositoryProvider);

    // 级别渐变：以 [CourseLevel.levelColor] 语义色为主色，配以 70% 透明度
    // 形成同色系渐变，避免硬编码十六进制色值。
    final levelColor = course.level.levelColor(context.lingxiColors);
    final gradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [levelColor, levelColor.withValues(alpha: 0.7)],
    );
    final icon =
        _HomePageState._levelIcons[course.level] ?? Icons.code_rounded;

    // 计算总知识点数用于统计
    final totalKnowledgePoints = course.modules.fold<int>(
      0,
      (sum, m) => sum + m.lessons.fold<int>(
        0,
        (s, l) => s + l.knowledgePoints.length,
      ),
    );

    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
      child: FutureBuilder<double>(
        future: progressRepo.getCompletionRate(course.id),
        builder: (context, snapshot) {
          final progress = snapshot.data ?? 0.0;
          final levelLabel = _levelDisplayName(course.level);
          final subtitle = progress > 0
              ? '$levelLabel · 已完成 ${(progress * 100).round()}%'
              : '$levelLabel · $totalKnowledgePoints 个知识点';

          return LingxiCard(
            animateEntrance: true,
            entranceDelay: entranceDelay,
            onTap: () {
              AnimationUtils.hapticLight();
              context.go(RouteNames.learningPath);
            },
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: gradient,
                        borderRadius:
                            ShapeVariants.roundedMedium.borderRadius,
                      ),
                      child: Icon(icon, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            course.title,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${(progress * 100).round()}%',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                AnimatedProgressBar(
                  progress: progress,
                  height: 6,
                  borderRadius: 3,
                  gradient: gradient,
                  enablePulse: progress > 0 && progress < 1,
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _levelDisplayName(CourseLevel level) {
    switch (level) {
      case CourseLevel.l0:
        return 'L0 入门';
      case CourseLevel.l1:
        return 'L1 进阶';
      case CourseLevel.l2:
        return 'L2 应用';
      case CourseLevel.l3:
        return 'L3 实践';
      case CourseLevel.l4:
        return 'L4 高阶';
    }
  }
}

class _QuickAction {
  const _QuickAction({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final void Function(BuildContext) onTap;
}

// ── 交错入场组件 ────────────────────────────────────────

/// 简化版交错入场组件：淡入 + 上移 + 轻微缩放。
///
/// 当 [reduceMotion] 为 true 时直接返回 child。
class _StaggeredEntrance extends StatefulWidget {
  const _StaggeredEntrance({
    required this.child,
    required this.delay,
    required this.duration,
    required this.reduceMotion,
    this.beginOffset = const Offset(0, 0.06),
  });

  final Widget child;
  final Duration delay;
  final Duration duration;
  final bool reduceMotion;
  final Offset beginOffset;

  @override
  State<_StaggeredEntrance> createState() => _StaggeredEntranceState();
}

class _StaggeredEntranceState extends State<_StaggeredEntrance> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    if (widget.reduceMotion) {
      _visible = true;
    } else {
      Future.delayed(widget.delay, () {
        if (mounted) setState(() => _visible = true);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.reduceMotion) {
      return widget.child;
    }
    return AnimatedOpacity(
      opacity: _visible ? 1.0 : 0.0,
      duration: widget.duration,
      curve: SpringMotion.entranceCurve,
      child: AnimatedSlide(
        offset: _visible ? Offset.zero : widget.beginOffset,
        duration: widget.duration,
        curve: SpringMotion.entranceCurve,
        child: AnimatedScale(
          scale: _visible ? 1.0 : 0.96,
          duration: widget.duration,
          curve: SpringMotion.entranceCurve,
          child: widget.child,
        ),
      ),
    );
  }
}

// ── 段落标题组件 ──────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.subtitle,
    required this.entranceDelay,
  });

  final String title;
  final String subtitle;
  final Duration entranceDelay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    return _StaggeredEntrance(
      delay: entranceDelay,
      duration: const Duration(milliseconds: 500),
      reduceMotion: reduceMotion,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Streak 徽章（升级：数字动画 + 火焰渐变 + 流光）──────

/// AppBar 中的连续学习天数徽章。
class _StreakBadge extends StatelessWidget {
  const _StreakBadge({
    required this.days,
    required this.isActive,
    required this.fireGradient,
    required this.fireColor,
    required this.onTap,
  });

  final int days;
  final bool isActive;
  final Gradient fireGradient;
  final Color fireColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    Widget icon = Icon(
      Icons.local_fire_department_rounded,
      color: isActive ? fireColor : theme.colorScheme.outline,
      size: 22,
    );

    // 活跃状态下给火焰图标添加流光效果
    if (isActive && !reduceMotion) {
      icon = SpringMotion.shimmerGlow(
        glowColor: fireColor,
        period: const Duration(seconds: 2),
        child: icon,
      );
    }

    final countText = isActive
        ? _GradientCountText(
            value: days,
            gradient: fireGradient,
            duration: const Duration(milliseconds: 800),
          )
        : AnimatedCountText(
            value: days,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: theme.colorScheme.outline,
            ),
            duration: const Duration(milliseconds: 800),
            curve: SpringMotion.entranceCurve,
          );

    return SpringMotion.scalePressFeedback(
      onTap: onTap,
      pressedScale: 0.92,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon,
            const SizedBox(width: 4),
            countText,
          ],
        ),
      ),
    );
  }
}

/// 使用渐变着色的数字动画文本（用于火焰 streak 数字）。
class _GradientCountText extends StatelessWidget {
  const _GradientCountText({
    required this.value,
    required this.gradient,
    required this.duration,
  });

  final int value;
  final Gradient gradient;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    // AnimatedCountText 内部最终通过 Text 渲染，
    // 这里用 ShaderMask + 空 style+foreground 方式让文字以渐变填充。
    return ShaderMask(
      shaderCallback: (bounds) => gradient.createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      blendMode: BlendMode.srcIn,
      child: AnimatedCountText(
        value: value,
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 16,
          color: Colors.white, // 被 ShaderMask 覆盖，仅作为 fallback
        ),
        duration: duration,
        curve: SpringMotion.entranceCurve,
      ),
    );
  }
}
