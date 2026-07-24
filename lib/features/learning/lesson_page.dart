import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/core/theme/lingxi_gradients.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/providers/course_providers.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/features/mascot/mascot_controller.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:lingxi_academy/features/mascot/mascot_widget.dart';
import 'package:lingxi_academy/features/progress/celebration_service.dart';
import 'package:lingxi_academy/shared/utils/responsive.dart';
import 'package:lingxi_academy/shared/widgets/animated_progress_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';
import 'package:lingxi_academy/features/learning/widgets/continue_learning_sidebar.dart';
import 'package:lingxi_academy/features/learning/widgets/learning_card_widget.dart';
import 'package:lingxi_academy/features/learning/widgets/quiz_widget.dart';
import 'package:lingxi_academy/features/learning/widgets/socratic_dialog_panel.dart';

/// 课程单节课学习页。
///
/// 通过路由参数 [courseId] / [lessonId] 定位章节，使用 [PageView] 轮播
/// 知识点。每个知识点依次经历：学习卡片 → 测验 → 苏格拉底对话 → 完成。
/// 全部知识点完成后显示章节庆祝页。
///
/// 动效增强：
/// - 底部进度条替换为 [AnimatedProgressBar]，带末端脉冲光点。
/// - 知识点内容切换时使用弹簧淡入 + 轻微缩放。
/// - 章节完成页使用 springTransition 整体入场。
/// - 庆祝时触发全局纸屑粒子效果。
class LessonPage extends ConsumerStatefulWidget {
  const LessonPage({
    super.key,
    required this.courseId,
    required this.lessonId,
  });

  final String courseId;
  final String lessonId;

  @override
  ConsumerState<LessonPage> createState() => _LessonPageState();
}

class _LessonPageState extends ConsumerState<LessonPage> {
  late final PageController _pageController;
  int _currentIndex = 0;
  bool _sectionComplete = false;

  /// 已完成的知识点 ID 集合。
  final Set<String> _completedKpIds = <String>{};

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  /// 从当前加载的课程中查找对应章节。
  Lesson? _findLesson(Course? course) {
    if (course == null) return null;
    for (final module in course.modules) {
      for (final lesson in module.lessons) {
        if (lesson.id == widget.lessonId) return lesson;
      }
    }
    return null;
  }

  /// 知识点完成回调：标记进度 + 吉祥物庆祝 + 切换下一个或显示庆祝页。
  void _onKnowledgePointCompleted(String kpId, double score) {
    setState(() {
      _completedKpIds.add(kpId);
    });

    // 持久化进度。
    ref.read(progressRepositoryProvider).markCompleted(
          widget.courseId,
          widget.lessonId,
          kpId,
          score: score,
        );

    // 吉祥物庆祝动画。
    ref.read(mascotControllerProvider.notifier).celebrate();

    // 星光粒子庆祝（知识点完成反馈）。
    if (!AnimationUtils.platformReduceMotion) {
      // 延迟一帧确保按钮位置已确定，使用屏幕中心作为喷发原点。
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final size = MediaQuery.of(context).size;
        CelebrationService.instance.sparkles(
          Offset(size.width / 2, size.height * 0.4),
          count: 16,
        );
      });
    }

    // 读取课程判断是否全部完成。
    final course = ref.read(courseProvider(widget.courseId)).maybeWhen(
          data: (c) => c,
          orElse: () => null,
        );
    final lesson = _findLesson(course);
    if (lesson == null) return;

    final allDone = lesson.knowledgePoints
        .every((kp) => _completedKpIds.contains(kp.id));

    if (allDone) {
      // 章节完成：触发纸屑庆祝。
      if (!AnimationUtils.platformReduceMotion) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          final size = MediaQuery.of(context).size;
          CelebrationService.instance.confetti(
            Offset(size.width / 2, size.height * 0.3),
            count: 30,
          );
        });
      }
      setState(() {
        _sectionComplete = true;
      });
    } else if (_currentIndex < lesson.knowledgePoints.length - 1) {
      final reduceMotion =
          AnimationUtils.reduceMotionOf(context);
      _pageController.nextPage(
        duration: reduceMotion
            ? const Duration(milliseconds: 150)
            : SpringMotion.gentleDuration,
        curve: reduceMotion ? Curves.easeInOut : SpringMotion.entranceCurve,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final courseAsync = ref.watch(courseProvider(widget.courseId));
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: '返回',
          onPressed: () => context.pop(),
        ),
        title: courseAsync.maybeWhen(
          data: (course) => Text(course?.title ?? '课程'),
          orElse: () => const Text('课程'),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: MascotWidget(
              size: 40,
              onTap: () {
                ref.read(mascotControllerProvider.notifier).triggerTap();
              },
            ),
          ),
        ],
      ),
      body: courseAsync.when(
        data: (course) {
          final lesson = _findLesson(course);
          if (lesson == null) {
            return const Center(child: Text('章节不存在'));
          }
          if (_sectionComplete) {
            return _buildCelebration(context, lesson);
          }
          return _buildBody(context, lesson);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('加载失败：$error')),
      ),
    );
  }

  /// 构建主体内容：PageView + 底部动画进度条 + 响应式侧栏。
  Widget _buildBody(BuildContext context, Lesson lesson) {
    final kps = lesson.knowledgePoints;
    if (kps.isEmpty) {
      return const Center(child: Text('该章节暂无知识点'));
    }
    final isDesktop = Responsive.isDesktop(context);
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    final mainContent = Column(
      children: [
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            itemCount: kps.length,
            // reduceMotion：禁用滑动手势，改用底部翻页按钮切换；
            // 正常模式使用 BouncingScrollPhysics（iOS 风格回弹，三端统一）。
            physics: reduceMotion
                ? const NeverScrollableScrollPhysics()
                : const BouncingScrollPhysics(),
            onPageChanged: (index) => setState(() => _currentIndex = index),
            itemBuilder: (context, index) => _KnowledgePointPageWrapper(
              key: ValueKey('kp_page_${kps[index].id}'),
              knowledgePoint: kps[index],
              courseId: widget.courseId,
              lessonId: widget.lessonId,
              onCompleted: (score) =>
                  _onKnowledgePointCompleted(kps[index].id, score),
            ),
          ),
        ),
        // 底部进度条（使用 AnimatedProgressBar）
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerLow,
            border: Border(
              top: BorderSide(color: theme.dividerColor, width: 1),
            ),
          ),
          child: Row(
            children: [
              // reduceMotion：PageView 滑动被禁用，提供显式翻页按钮替代。
              if (reduceMotion)
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  tooltip: '上一个知识点',
                  onPressed: _currentIndex > 0
                      ? () => _pageController.previousPage(
                            duration: const Duration(milliseconds: 150),
                            curve: Curves.easeInOut,
                          )
                      : null,
                ),
              SpringMotion.slideFadeTransition(
                direction: AxisDirection.left,
                duration: reduceMotion
                    ? SpringMotion.fastDuration
                    : SpringMotion.defaultDuration,
                distance: 12,
                child: Text(
                  '知识点 ${_currentIndex + 1} / ${kps.length}',
                  style: theme.textTheme.bodyMedium,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: AnimatedProgressBar(
                  progress: kps.isEmpty ? 0 : (_currentIndex + 1) / kps.length,
                  height: 8,
                  enablePulse: true,
                  borderRadius: 4,
                  gradient: LinearGradient(
                    colors: [
                      theme.colorScheme.primary,
                      theme.colorScheme.primary.withValues(alpha: 0.7),
                    ],
                  ),
                ),
              ),
              // reduceMotion：下一页按钮（与左侧对称，到达末页时禁用）。
              if (reduceMotion)
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  tooltip: '下一个知识点',
                  onPressed: _currentIndex < kps.length - 1
                      ? () => _pageController.nextPage(
                            duration: const Duration(milliseconds: 150),
                            curve: Curves.easeInOut,
                          )
                      : null,
                ),
            ],
          ),
        ),
      ],
    );

    // 桌面端：三栏布局，右侧 ContinueLearningSidebar。
    if (isDesktop) {
      final relatedTopics = kps[_currentIndex].relatedTopics;
      return Row(
        children: [
          Expanded(child: mainContent),
          ContinueLearningSidebar(relatedTopics: relatedTopics),
        ],
      );
    }

    // 移动端：单栏 + FAB 触发底部抽屉。
    return Stack(
      children: [
        mainContent,
        Positioned(
          right: 16,
          bottom: 80,
          child: SpringMotion.pulseBreathing(
            child: FloatingActionButton(
              heroTag: 'continue_learning_fab',
              tooltip: '继续探索',
              onPressed: () {
                AnimationUtils.hapticLight();
                ContinueLearningSidebar.showAsBottomSheet(
                  context,
                  relatedTopics: kps[_currentIndex].relatedTopics,
                );
              },
              child: const Icon(Icons.explore),
            ),
          ),
        ),
      ],
    );
  }

  /// 章节完成庆祝页（spring 入场 + 纸屑已在完成回调中触发）。
  Widget _buildCelebration(BuildContext context, Lesson lesson) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: SpringMotion.springTransition(
          beginScale: 0.85,
          beginOffset: const Offset(0, 0.12),
          duration: SpringMotion.bouncyDuration,
          curve: Curves.easeOutBack,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const MascotWidget(size: 160, mood: MascotMood.celebrate),
              const SizedBox(height: 24),
              ShaderMask(
                shaderCallback: (bounds) =>
                    context.lingxiGradients.celebration.createShader(bounds),
                child: Text(
                  '🎉 章节完成！',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '你已经完成「${lesson.title}」的全部知识点',
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              LingxiButton(
                label: const Text('返回学习路径'),
                icon: const Icon(Icons.home),
                onPressed: () => context.go(RouteNames.learningPath),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 知识点页面切换包装器：使用 [TweenAnimationBuilder] 提供淡入 + 轻微缩放。
///
/// PageView 滑动切换时，新页面的 itemBuilder 触发本 build，动画自动从
/// 0→1 播放，无需手动管理 [AnimationController]。reduceMotion 下直接
/// 返回子组件，即时切换。
class _KnowledgePointPageWrapper extends StatelessWidget {
  const _KnowledgePointPageWrapper({
    super.key,
    required this.knowledgePoint,
    required this.courseId,
    required this.lessonId,
    required this.onCompleted,
  });

  final KnowledgePoint knowledgePoint;
  final String courseId;
  final String lessonId;
  final void Function(double score) onCompleted;

  @override
  Widget build(BuildContext context) {
    final learner = _KnowledgePointLearner(
      knowledgePoint: knowledgePoint,
      courseId: courseId,
      lessonId: lessonId,
      onCompleted: onCompleted,
    );

    // reduceMotion：降级为即时切换，不带过渡动画。
    if (AnimationUtils.reduceMotionOf(context)) {
      return learner;
    }

    // 使用 TweenAnimationBuilder 实现淡入 + 轻微缩放：
    // duration / curve 取自 SpringMotion，与全局动效规范一致。
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: SpringMotion.defaultDuration,
      curve: SpringMotion.defaultCurve,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.scale(
            scale: 0.98 + 0.02 * value,
            child: child,
          ),
        );
      },
      child: learner,
    );
  }
}

/// 单个知识点的学习流程控制器。
///
/// 状态机：[learning] → [quiz] → [socraticEntry] → [socratic] → [done]。
/// 测验通过后，若苏格拉底模式开启且存在种子问题，进入苏格拉底对话；
/// 否则直接完成。
class _KnowledgePointLearner extends ConsumerStatefulWidget {
  const _KnowledgePointLearner({
    required this.knowledgePoint,
    required this.courseId,
    required this.lessonId,
    required this.onCompleted,
  });

  final KnowledgePoint knowledgePoint;
  final String courseId;
  final String lessonId;

  /// 完成回调，参数为得分（0.0~1.0）。
  final void Function(double score) onCompleted;

  @override
  ConsumerState<_KnowledgePointLearner> createState() =>
      _KnowledgePointLearnerState();
}

/// 知识点学习阶段。
enum _KpPhase {
  /// 学习卡片。
  learning,

  /// 测验。
  quiz,

  /// 测验通过后的苏格拉底入口。
  socraticEntry,

  /// 苏格拉底对话中。
  socratic,

  /// 已完成（过渡态）。
  done,
}

class _KnowledgePointLearnerState
    extends ConsumerState<_KnowledgePointLearner> {
  _KpPhase _phase = _KpPhase.learning;

  @override
  void initState() {
    super.initState();
    // 进入知识点即标记为进行中。
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(progressRepositoryProvider).markInProgress(
            widget.courseId,
            widget.lessonId,
            widget.knowledgePoint.id,
          );
    });
  }

  void _startQuiz() {
    AnimationUtils.hapticMedium();
    setState(() {
      _phase = _KpPhase.quiz;
    });
  }

  void _onQuizPassed() {
    final socraticEnabled = ref.read(socraticModeProvider);
    final hasSeed = widget.knowledgePoint.socraticSeedQuestion.isNotEmpty;
    if (socraticEnabled && hasSeed) {
      setState(() {
        _phase = _KpPhase.socraticEntry;
      });
    } else {
      _complete(score: 1.0);
    }
  }

  void _startSocratic() {
    AnimationUtils.hapticLight();
    setState(() {
      _phase = _KpPhase.socratic;
    });
  }

  void _skipSocratic() {
    _complete(score: 1.0);
  }

  void _onSocraticCompleted() {
    _complete(score: 1.0);
  }

  /// 完成当前知识点，通知父页面。
  void _complete({required double score}) {
    setState(() {
      _phase = _KpPhase.done;
    });
    widget.onCompleted(score);
  }

  @override
  Widget build(BuildContext context) {
    final kp = widget.knowledgePoint;
    switch (_phase) {
      case _KpPhase.learning:
        return _FadeInSection(
          child: LearningCardWidget(
            knowledgePoint: kp,
            onStartQuiz: _startQuiz,
          ),
        );
      case _KpPhase.quiz:
        return _FadeInSection(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: QuizWidget(
              questions: kp.quiz,
              onPassed: _onQuizPassed,
              onFailed: () {},
            ),
          ),
        );
      case _KpPhase.socraticEntry:
        return _FadeInSection(child: _buildSocraticEntry(context));
      case _KpPhase.socratic:
        return _FadeInSection(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: SocraticDialogPanel(
              seedQuestion: kp.socraticSeedQuestion,
              onCompleted: _onSocraticCompleted,
            ),
          ),
        );
      case _KpPhase.done:
        return const Center(child: CircularProgressIndicator());
    }
  }

  /// 测验通过后的苏格拉底入口页。
  Widget _buildSocraticEntry(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SpringMotion.pulseBreathing(
              period: const Duration(seconds: 2),
              child: ShaderMask(
                shaderCallback: (bounds) => context.lingxiGradients
                    .achievementGold
                    .createShader(bounds),
                child: const Icon(Icons.celebration,
                    size: 64, color: Colors.white),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '测验通过！',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '接下来通过苏格拉底对话深入思考',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            LingxiButton(
              label: const Text('开始苏格拉底对话'),
              icon: const Icon(Icons.forum),
              onPressed: _startSocratic,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _skipSocratic,
              child: const Text('跳过对话'),
            ),
          ],
        ),
      ),
    );
  }
}

/// 阶段切换时的淡入 + 轻微上移包装。
class _FadeInSection extends StatefulWidget {
  const _FadeInSection({required this.child});

  final Widget child;

  @override
  State<_FadeInSection> createState() => _FadeInSectionState();
}

class _FadeInSectionState extends State<_FadeInSection>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fade;
  late Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: SpringMotion.defaultDuration,
    );
    final curve = CurvedAnimation(
      parent: _controller,
      curve: SpringMotion.entranceCurve,
    );
    _fade = Tween<double>(begin: 0.0, end: 1.0).animate(curve);
    _slide = Tween<Offset>(
      begin: const Offset(0, 0.05),
      end: Offset.zero,
    ).animate(curve);
    if (AnimationUtils.platformReduceMotion) {
      _controller.value = 1.0;
    } else {
      _controller.forward();
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
      return widget.child;
    }
    // 使用 FadeTransition + SlideTransition 显式过渡组件：
    // 避免在 AnimatedBuilder 内嵌套 SlideTransition 的冗余写法。
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: _slide,
        child: widget.child,
      ),
    );
  }
}
