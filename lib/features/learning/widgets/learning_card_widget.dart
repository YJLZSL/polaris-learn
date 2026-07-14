import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/theme/lingxi_colors.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/features/mascot/mascot_widget.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_chip.dart';

/// 知识点学习卡片。
///
/// 借鉴 Google Learn About 教学卡片格式，包含：标题、主图区、核心解释、
/// "为什么重要"方框、词汇建立、常见误解贴纸，底部为"开始测验"按钮。
///
/// 动效增强：
/// - 内容区按顺序交错淡入上移（标题→主图→核心解释→为什么重要→词汇→误解→按钮）。
/// - 各区块使用 springTransition 依次入场。
class LearningCardWidget extends StatefulWidget {
  const LearningCardWidget({
    super.key,
    required this.knowledgePoint,
    this.onStartQuiz,
  });

  /// 知识点。
  final KnowledgePoint knowledgePoint;

  /// 开始测验回调。
  final VoidCallback? onStartQuiz;

  @override
  State<LearningCardWidget> createState() => _LearningCardWidgetState();
}

class _LearningCardWidgetState extends State<LearningCardWidget> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    if (AnimationUtils.platformReduceMotion) {
      _visible = true;
    } else {
      Future.delayed(const Duration(milliseconds: 50), () {
        if (mounted) setState(() => _visible = true);
      });
    }
  }

  /// 构建带交错延迟的区块包装器。
  Widget _staggeredSection(Widget child, int index) {
    if (AnimationUtils.reduceMotionOf(context)) return child;
    final delayMs = 60 + index * 70;
    return _StaggeredChild(
      visible: _visible,
      delay: Duration(milliseconds: delayMs),
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.lingxiColors;
    final kp = widget.knowledgePoint;

    // 确定区块数量用于 stagger 索引。
    var sectionIndex = 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 标题
          _staggeredSection(
            Text(
              kp.title,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            sectionIndex++,
          ),
          const SizedBox(height: 16),
          // 主图区
          _staggeredSection(
            _buildHero(kp, colors),
            sectionIndex++,
          ),
          const SizedBox(height: 16),
          // 核心解释（Markdown 渲染）
          _staggeredSection(
            LingxiCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.menu_book, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        '核心解释',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  MarkdownBody(
                    data: kp.coreExplanation,
                    styleSheet: MarkdownStyleSheet.fromTheme(theme).copyWith(
                      p: theme.textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
            sectionIndex++,
          ),
          const SizedBox(height: 16),
          // "为什么重要"方框
          _staggeredSection(
            _buildWhyItMatters(kp.whyItMatters, colors, theme),
            sectionIndex++,
          ),
          // 词汇建立
          if (kp.vocabulary.isNotEmpty) ...[
            const SizedBox(height: 16),
            _staggeredSection(
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '词汇建立',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final term in kp.vocabulary)
                        LingxiChip(
                          label: Text(term.term),
                          avatar: const Icon(Icons.label, size: 16),
                        ),
                    ],
                  ),
                ],
              ),
              sectionIndex++,
            ),
          ],
          // 常见误解
          if (kp.commonMisconceptions.isNotEmpty) ...[
            const SizedBox(height: 16),
            _staggeredSection(
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '常见误解',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final misconception in kp.commonMisconceptions)
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colors.misconceptionRed.withValues(alpha: 0.1),
                        borderRadius: ShapeVariants.roundedMedium.borderRadius,
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.warning,
                            color: colors.misconceptionRed,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(misconception)),
                        ],
                      ),
                    ),
                ],
              ),
              sectionIndex++,
            ),
          ],
          const SizedBox(height: 24),
          // 开始测验按钮
          _staggeredSection(
            SpringMotion.pulseBreathing(
              period: const Duration(seconds: 3),
              minScale: 0.99,
              maxScale: 1.02,
              child: LingxiButton(
                label: const Text('开始测验'),
                icon: const Icon(Icons.quiz),
                onPressed: widget.onStartQuiz,
              ),
            ),
            sectionIndex++,
          ),
        ],
      ),
    );
  }

  /// 构建主图区：有图片显示图片，否则显示装饰性渐变背景 + 吉祥物。
  Widget _buildHero(KnowledgePoint kp, LingxiColors colors) {
    if (kp.imageUrl != null && kp.imageUrl!.isNotEmpty) {
      final url = kp.imageUrl!;
      final image = url.startsWith('http')
          ? Image.network(
              url,
              fit: BoxFit.cover,
              height: 180,
              width: double.infinity,
              errorBuilder: (_, __, ___) => _buildGradientHero(colors),
            )
          : Image.asset(
              url,
              fit: BoxFit.cover,
              height: 180,
              width: double.infinity,
              errorBuilder: (_, __, ___) => _buildGradientHero(colors),
            );
      return ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: image,
      );
    }
    return _buildGradientHero(colors);
  }

  /// 装饰性渐变背景 + 吉祥物插画。
  Widget _buildGradientHero(LingxiColors colors) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.mascotPrimary.withValues(alpha: 0.6),
            colors.mascotSecondary.withValues(alpha: 0.6),
          ],
        ),
      ),
      child: const Stack(
        children: [
          Positioned(
            left: 16,
            top: 16,
            child: Text(
              '🦏 让小犀陪你一起学',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Positioned(
            right: 8,
            bottom: 8,
            child: MascotWidget(
              size: 96,
              enableTapInteraction: false,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建"为什么重要"方框。
  Widget _buildWhyItMatters(
    String text,
    LingxiColors colors,
    ThemeData theme,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.socraticBlue.withValues(alpha: 0.08),
        borderRadius: ShapeVariants.roundedLarge.borderRadius,
        border: Border.all(
          color: colors.socraticBlue.withValues(alpha: 0.4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lightbulb, color: colors.socraticBlue, size: 20),
              const SizedBox(width: 8),
              Text(
                '为什么重要',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: colors.socraticBlue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(text, style: theme.textTheme.bodyMedium),
        ],
      ),
    );
  }
}

/// 交错子项：透明度 + 上移 + 轻微缩放。
class _StaggeredChild extends StatefulWidget {
  const _StaggeredChild({
    required this.visible,
    required this.delay,
    required this.child,
  });

  final bool visible;
  final Duration delay;
  final Widget child;

  @override
  State<_StaggeredChild> createState() => _StaggeredChildState();
}

class _StaggeredChildState extends State<_StaggeredChild> {
  bool _delayedVisible = false;

  @override
  void initState() {
    super.initState();
    if (widget.visible && !AnimationUtils.platformReduceMotion) {
      Future.delayed(widget.delay, () {
        if (mounted) setState(() => _delayedVisible = true);
      });
    } else {
      _delayedVisible = true;
    }
  }

  @override
  void didUpdateWidget(covariant _StaggeredChild oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visible && !oldWidget.visible) {
      if (AnimationUtils.reduceMotionOf(context)) {
        _delayedVisible = true;
      } else {
        Future.delayed(widget.delay, () {
          if (mounted) setState(() => _delayedVisible = true);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (AnimationUtils.reduceMotionOf(context)) {
      return widget.child;
    }
    return AnimatedOpacity(
      opacity: _delayedVisible ? 1.0 : 0.0,
      duration: SpringMotion.defaultDuration,
      curve: SpringMotion.entranceCurve,
      child: AnimatedSlide(
        offset: _delayedVisible ? Offset.zero : const Offset(0, 0.08),
        duration: SpringMotion.defaultDuration,
        curve: SpringMotion.entranceCurve,
        child: widget.child,
      ),
    );
  }
}
