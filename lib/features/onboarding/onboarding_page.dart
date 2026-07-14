import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/features/mascot/mascot_controller.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:lingxi_academy/features/mascot/mascot_widget.dart';
import 'package:lingxi_academy/shared/utils/responsive.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';

/// 引导页数据模型。
class _OnboardingStep {
  const _OnboardingStep({
    required this.mood,
    required this.title,
    required this.description,
    required this.ctaText,
    this.isLast = false,
  });

  final MascotMood mood;
  final String title;
  final String description;
  final String ctaText;
  final bool isLast;
}

/// 引导页：5 步 PageView 动画教程。
///
/// 桌面端两列布局（左吉祥物大图，右文字），移动端单列垂直排列。
/// 每步切换时联动 [mascotControllerProvider] 切换吉祥物情绪，
/// 页面切换使用弹簧物理曲线，步骤内容淡入滑入。
class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();

  /// 5 步引导内容
  static const List<_OnboardingStep> steps = [
    _OnboardingStep(
      mood: MascotMood.happy,
      title: '欢迎来到灵犀学院',
      description: '我是小犀，你的 AI 学习伙伴。在这里，AI 不会直接给你答案，而是引导你思考。',
      ctaText: '下一步',
    ),
    _OnboardingStep(
      mood: MascotMood.curious,
      title: '自备 API，安全无忧',
      description: '灵犀学院是非商业平台，你需要配置自己的 AI API（OpenAI/Claude/Gemini/Ollama）才能与小犀对话。密钥本地加密存储，永不上传。',
      ctaText: '去设置 API',
    ),
    _OnboardingStep(
      mood: MascotMood.thinking,
      title: '点击小犀，发现彩蛋',
      description: '在任意页面点击小犀，它会眨眼、挥手、蹦跳。连续点击 5 次，会有惊喜哦。',
      ctaText: '试试点我',
    ),
    _OnboardingStep(
      mood: MascotMood.happy,
      title: '从 L0 到 L4，循序渐进',
      description: '学习路径分为五层：L0 启蒙、L1 基础、L2 进阶、L3 实战、L4 专家。每节课程包含学习卡片、测验、苏格拉底对话。',
      ctaText: '看看路径',
    ),
    _OnboardingStep(
      mood: MascotMood.curious,
      title: '苏格拉底式引导',
      description: '在自由对话中，小犀会通过提问引导你思考，而不是直接给答案。你也可以关闭引导模式获得直接解答。',
      ctaText: '开始学习',
      isLast: true,
    ),
  ];
}

class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  late final PageController _pageController;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    // 初始化为第一步的情绪
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(mascotControllerProvider.notifier)
          .setMood(OnboardingPage.steps.first.mood);
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  /// 跳转到指定页，使用弹簧物理曲线
  void _goToPage(int index) {
    if (index < 0 || index >= OnboardingPage.steps.length) return;
    _pageController.animateToPage(
      index,
      duration: SpringMotion.defaultDuration,
      curve: SpringMotion.defaultCurve,
    );
  }

  /// 页面切换回调：更新当前页并联动吉祥物情绪
  void _onPageChanged(int index) {
    setState(() => _currentPage = index);
    ref
        .read(mascotControllerProvider.notifier)
        .setMood(OnboardingPage.steps[index].mood);
  }

  /// 完成引导：写入 SharedPreferences 并更新 provider。
  ///
  /// 调用方负责在调用后导航到目标页面。
  void _completeOnboarding() {
    ref.read(sharedPreferencesProvider).setBool('onboarding_completed', true);
    ref.read(onboardingCompletedProvider.notifier).state = true;
  }

  /// 跳过引导：直接完成并跳转 /home
  void _skipOnboarding() {
    _completeOnboarding();
    context.go(RouteNames.homePath);
  }

  /// CTA 按钮点击处理
  void _onCtaTapped(_OnboardingStep step) {
    final index = _currentPage;
    switch (step.ctaText) {
      case '去设置 API':
        // 跳转 API 设置页，保留引导状态
        context.go(RouteNames.settingsApiPath);
        break;
      case '试试点我':
        ref.read(mascotControllerProvider.notifier).triggerTap();
        break;
      case '看看路径':
        // 完成引导并跳转到学习路径
        _completeOnboarding();
        context.go(RouteNames.learningPath);
        break;
      case '开始学习':
        _completeOnboarding();
        context.go(RouteNames.homePath);
        break;
      default:
        // "下一步" → 下一页
        if (index < OnboardingPage.steps.length - 1) {
          _goToPage(index + 1);
        }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDesktop = Responsive.isDesktop(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // 顶部栏：跳过按钮
            _buildTopBar(),
            // 中间 PageView
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: _onPageChanged,
                itemCount: OnboardingPage.steps.length,
                itemBuilder: (context, index) {
                  return _OnboardingStepView(
                    key: ValueKey('onboarding_step_$index'),
                    step: OnboardingPage.steps[index],
                    isDesktop: isDesktop,
                    isActive: index == _currentPage,
                    reduceMotion: reduceMotion,
                    onCta: () =>
                        _onCtaTapped(OnboardingPage.steps[index]),
                  );
                },
              ),
            ),
            // 底部指示器 + 导航按钮
            _buildBottomBar(theme, reduceMotion),
          ],
        ),
      ),
    );
  }

  /// 顶部栏：右上"跳过"按钮
  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Align(
        alignment: Alignment.centerRight,
        child: TextButton(
          onPressed: _skipOnboarding,
          child: const Text('跳过'),
        ),
      ),
    );
  }

  /// 底部：PageIndicator + 上一页/下一页按钮
  Widget _buildBottomBar(ThemeData theme, bool reduceMotion) {
    final isLast = _currentPage == OnboardingPage.steps.length - 1;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // 上一页按钮
          if (_currentPage > 0)
            LingxiButton(
              label: const Text('上一步'),
              icon: const Icon(Icons.arrow_back),
              variant: LingxiButtonVariant.text,
              onPressed: () => _goToPage(_currentPage - 1),
            )
          else
            const SizedBox(width: 120),
          // 页面指示器（5 个圆点，当前页放大）
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(OnboardingPage.steps.length, (i) {
              final isActive = i == _currentPage;
              final dot = AnimatedContainer(
                duration: SpringMotion.defaultDuration,
                curve: SpringMotion.defaultCurve,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: isActive ? 24 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: isActive
                      ? theme.colorScheme.primary
                      : theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(4),
                ),
              );
              if (reduceMotion) return dot;
              return SpringMotion.scalePressFeedback(
                enableHaptic: true,
                onTap: () => _goToPage(i),
                child: dot,
              );
            }),
          ),
          // 下一页/开始学习按钮
          if (!isLast)
            LingxiButton(
              label: const Text('下一步'),
              icon: const Icon(Icons.arrow_forward),
              onPressed: () => _goToPage(_currentPage + 1),
            )
          else
            // 最后一步：按钮加呼吸脉冲引导点击
            LingxiButton(
              label: const Text('开始学习'),
              icon: const Icon(Icons.rocket_launch),
              pulse: true,
              onPressed: _skipOnboarding,
            ),
        ],
      ),
    );
  }
}

/// 单个引导步骤视图。
///
/// 桌面端两列（左吉祥物，右文字），移动端单列垂直排列。
/// 步骤激活时内容从下方淡入滑入（300ms，easeOutCubic）。
class _OnboardingStepView extends StatefulWidget {
  const _OnboardingStepView({
    super.key,
    required this.step,
    required this.isDesktop,
    required this.isActive,
    required this.reduceMotion,
    required this.onCta,
  });

  final _OnboardingStep step;
  final bool isDesktop;
  final bool isActive;
  final bool reduceMotion;
  final VoidCallback onCta;

  @override
  State<_OnboardingStepView> createState() => _OnboardingStepViewState();
}

class _OnboardingStepViewState extends State<_OnboardingStepView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _contentController;
  late final Animation<double> _contentOpacity;
  late final Animation<Offset> _contentSlide;

  @override
  void initState() {
    super.initState();
    _contentController = AnimationController(
      vsync: this,
      duration: SpringMotion.defaultDuration,
    );
    final curved = CurvedAnimation(
      parent: _contentController,
      curve: SpringMotion.defaultCurve,
    );
    _contentOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(curved);
    _contentSlide = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(curved);
    if (widget.isActive) {
      _contentController.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(covariant _OnboardingStepView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !oldWidget.isActive) {
      _contentController.reset();
      _contentController.forward();
    }
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // 吉祥物：呼吸脉动
    Widget mascot = MascotWidget(
      size: widget.isDesktop ? 240 : 180,
      mood: widget.step.mood,
    );
    if (!widget.reduceMotion) {
      mascot = SpringMotion.pulseBreathing(
        period: const Duration(seconds: 3),
        minScale: 0.97,
        maxScale: 1.03,
        child: mascot,
      );
    }

    // 文字内容：激活时 slide+fade 入场
    Widget textContent = _buildTextContent(theme);
    if (!widget.reduceMotion) {
      textContent = FadeTransition(
        opacity: _contentOpacity,
        child: SlideTransition(
          position: _contentSlide,
          child: textContent,
        ),
      );
    }

    if (widget.isDesktop) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 24),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Expanded(flex: 1, child: Center(child: mascot)),
            const SizedBox(width: 48),
            Expanded(flex: 1, child: textContent),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          mascot,
          const SizedBox(height: 32),
          textContent,
        ],
      ),
    );
  }

  /// 构建文字内容（标题 + 描述 + CTA）
  Widget _buildTextContent(ThemeData theme) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.step.title,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          widget.step.description,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            height: 1.6,
          ),
        ),
        const SizedBox(height: 32),
        LingxiButton(
          label: Text(widget.step.ctaText),
          icon: widget.step.isLast
              ? const Icon(Icons.rocket_launch)
              : const Icon(Icons.arrow_forward),
          size: LingxiButtonSize.large,
          pulse: widget.step.isLast,
          onPressed: widget.onCta,
        ),
      ],
    );
  }
}
