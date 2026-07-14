// ignore_for_file: lines_longer_than_80_lines

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/core/theme/lingxi_colors.dart';
import 'package:lingxi_academy/core/theme/lingxi_gradients.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
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
                  theme: theme,
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

  Widget _buildHeroSection({
    required ThemeData theme,
    required ColorScheme colorScheme,
    required LingxiGradients gradients,
    required bool reduceMotion,
  }) {
    final mascotWidget = const MascotWidget(size: 180);

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
        child: Column(
          children: [
            // 吉祥物：呼吸脉动效果
            reduceMotion
                ? mascotWidget
                : SpringMotion.pulseBreathing(
                    minScale: 1.0,
                    maxScale: 1.03,
                    period: const Duration(seconds: 3),
                    child: mascotWidget,
                  ),
            const SizedBox(height: 16),
            Text(
              '欢迎来到灵犀学院',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              '和小犀一起，开启你的 AI 学习之旅',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
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

  Widget _buildCourseProgressCards({
    required ThemeData theme,
    required ColorScheme colorScheme,
    required int startIndex,
  }) {
    final courses = _getDemoCourses();

    return Column(
      children: [
        for (var i = 0; i < courses.length; i++)
          Padding(
            padding: EdgeInsets.only(bottom: i < courses.length - 1 ? 12 : 0),
            child: LingxiCard(
              animateEntrance: true,
              entranceDelay: _entranceDelayFor(startIndex + i),
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
                          gradient: courses[i].gradient,
                          borderRadius: ShapeVariants.roundedMedium.borderRadius,
                        ),
                        child: Icon(
                          courses[i].icon,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              courses[i].title,
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              courses[i].subtitle,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '${(courses[i].progress * 100).round()}%',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  AnimatedProgressBar(
                    progress: courses[i].progress,
                    height: 6,
                    borderRadius: 3,
                    gradient: courses[i].gradient,
                    enablePulse: courses[i].progress > 0 && courses[i].progress < 1,
                  ),
                ],
              ),
            ),
          ),
      ],
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
        childAspectRatio: 0.85,
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
              Icon(action.icon, color: action.color, size: 26),
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

  // ── 演示数据 ────────────────────────────────────────────

  List<_DemoCourse> _getDemoCourses() {
    return [
      _DemoCourse(
        title: 'Python 入门：AI 编程第一课',
        subtitle: 'L0 基础 · 第 3 课时',
        progress: 0.6,
        icon: Icons.code_rounded,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF7C4DFF),
            Color(0xFF536DFE),
          ],
        ),
      ),
      _DemoCourse(
        title: 'Prompt Engineering 基础',
        subtitle: 'L1 进阶 · 第 1 课时',
        progress: 0.2,
        icon: Icons.auto_awesome_rounded,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFFFF7043),
            const Color(0xFFFFB74D),
          ],
        ),
      ),
      _DemoCourse(
        title: 'AI 应用开发入门',
        subtitle: 'L2 实战 · 未开始',
        progress: 0.0,
        icon: Icons.rocket_launch_rounded,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF66BB6A),
            const Color(0xFF26A69A),
          ],
        ),
      ),
    ];
  }

  List<_QuickAction> _getQuickActions() {
    final colorScheme = Theme.of(context).colorScheme;
    return [
      _QuickAction(
        label: 'AI 对话',
        icon: Icons.chat_bubble_outline_rounded,
        color: colorScheme.primary,
        onTap: (ctx) => ctx.go(RouteNames.chatListPath),
      ),
      _QuickAction(
        label: '我的笔记',
        icon: Icons.edit_note_rounded,
        color: const Color(0xFFFF7043),
        onTap: (ctx) => ctx.go(RouteNames.notesPath),
      ),
      _QuickAction(
        label: '成就',
        icon: Icons.emoji_events_outlined,
        color: const Color(0xFFFFB300),
        onTap: (ctx) => ctx.go(RouteNames.achievementsPath),
      ),
      _QuickAction(
        label: '统计',
        icon: Icons.bar_chart_rounded,
        color: const Color(0xFF26A69A),
        onTap: (ctx) => ctx.go(RouteNames.statisticsPath),
      ),
    ];
  }
}

// ── 私有数据模型 ──────────────────────────────────────────

class _DemoCourse {
  const _DemoCourse({
    required this.title,
    required this.subtitle,
    required this.progress,
    required this.icon,
    required this.gradient,
  });

  final String title;
  final String subtitle;
  final double progress;
  final IconData icon;
  final Gradient gradient;
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
    this.beginScale = 0.96,
  });

  final Widget child;
  final Duration delay;
  final Duration duration;
  final bool reduceMotion;
  final Offset beginOffset;
  final double beginScale;

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
          scale: _visible ? 1.0 : widget.beginScale,
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
