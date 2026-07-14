import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/constants/app_constants.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/features/progress/celebration_service.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 测验组件。
///
/// 支持三种题型：单选 [QuizType.singleChoice]、多选
/// [QuizType.multipleChoice]、填空 [QuizType.fillInBlank]。
/// 答题后即时反馈，全部答完后计算正确率，正确率 ≥
/// [kQuizPassThreshold] 视为通过。
///
/// 动效增强：
/// - 选项按钮按下弹簧缩放反馈（0.96 快速回弹）。
/// - 答对/答错即时颜色过渡（绿/红）。
/// - 答对时在选项位置触发星光粒子庆祝。
/// - 答错时选项左右抖动（~8px）+ 错误触觉反馈。
/// - 提交按钮在全部作答时呼吸脉冲。
class QuizWidget extends ConsumerStatefulWidget {
  const QuizWidget({
    super.key,
    required this.questions,
    required this.onPassed,
    required this.onFailed,
  });

  /// 题目列表。
  final List<QuizQuestion> questions;

  /// 测验通过回调。
  final VoidCallback onPassed;

  /// 测验未通过回调。
  final VoidCallback onFailed;

  @override
  ConsumerState<QuizWidget> createState() => _QuizWidgetState();
}

class _QuizWidgetState extends ConsumerState<QuizWidget>
    with TickerProviderStateMixin {
  /// 选择题作答：题目索引 → 选中选项索引列表。
  final Map<int, List<int>> _choiceAnswers = <int, List<int>>{};

  /// 填空题作答控制器：题目索引 → [TextEditingController]。
  final Map<int, TextEditingController> _textControllers =
      <int, TextEditingController>{};

  /// 已提交的题目索引集合（用于显示反馈）。
  final Set<int> _submitted = <int>{};

  /// 是否已计算结果。
  bool _finished = false;

  /// 正确率（0.0 ~ 1.0）。
  double _score = 0.0;

  /// 每道题的抖动控制器（答错时触发）。
  final Map<int, AnimationController> _shakeControllers =
      <int, AnimationController>{};

  /// 每道题的正确动画缩放控制器（答对时触发）。
  final Map<int, bool> _correctFired = <int, bool>{};

  @override
  void dispose() {
    for (final controller in _textControllers.values) {
      controller.dispose();
    }
    for (final controller in _shakeControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  AnimationController _shakeControllerFor(int index) {
    return _shakeControllers.putIfAbsent(index, () {
      final c = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 500),
      );
      return c;
    });
  }

  /// 获取或创建填空题控制器。
  TextEditingController _controllerFor(int index) {
    return _textControllers.putIfAbsent(
      index,
      () => TextEditingController(),
    );
  }

  /// 判断指定题目是否答对。
  bool _isCorrect(int index) {
    final question = widget.questions[index];
    switch (question.type) {
      case QuizType.singleChoice:
      case QuizType.multipleChoice:
        final userAnswer = _choiceAnswers[index] ?? <int>[];
        final correctSet = question.correctAnswerIndices.toSet();
        return userAnswer.toSet().containsAll(correctSet) &&
            userAnswer.length == correctSet.length;
      case QuizType.fillInBlank:
        final userText = _controllerFor(index).text.trim();
        final correctText = question.correctAnswerText?.trim() ?? '';
        return userText.isNotEmpty &&
            correctText.isNotEmpty &&
            correctText.toLowerCase() == userText.toLowerCase();
    }
  }

  /// 获取单选题当前选中值（null 表示未选）。
  int? _singleChoiceValue(int index) {
    final list = _choiceAnswers[index];
    if (list == null || list.isEmpty) return null;
    return list.first;
  }

  /// 是否所有题目都已作答。
  bool get _allAnswered {
    for (var i = 0; i < widget.questions.length; i++) {
      final question = widget.questions[i];
      switch (question.type) {
        case QuizType.singleChoice:
        case QuizType.multipleChoice:
          if (_choiceAnswers[i] == null || _choiceAnswers[i]!.isEmpty) {
            return false;
          }
        case QuizType.fillInBlank:
          if (_controllerFor(i).text.trim().isEmpty) {
            return false;
          }
      }
    }
    return true;
  }

  /// 提交全部答案并计算结果。
  void _submit() {
    final total = widget.questions.length;
    if (total == 0) {
      setState(() {
        _finished = true;
        _score = 1.0;
      });
      widget.onPassed();
      return;
    }
    var correct = 0;
    for (var i = 0; i < total; i++) {
      final isCorrect = _isCorrect(i);
      if (isCorrect) correct++;
      _submitted.add(i);

      // 触发每题的反馈动画
      if (isCorrect) {
        _fireCorrect(i);
      } else {
        _fireWrong(i);
      }
    }
    setState(() {
      _finished = true;
      _score = correct / total;
    });
    final passed = _score >= kQuizPassThreshold;
    if (passed) {
      AnimationUtils.hapticSuccess();
      widget.onPassed();
    } else {
      AnimationUtils.hapticError();
      widget.onFailed();
    }
  }

  /// 答对时：星光粒子 + 触觉。
  void _fireCorrect(int index) {
    _correctFired[index] = true;
    AnimationUtils.hapticSuccess();
    if (AnimationUtils.platformReduceMotion) return;
    // 延迟一帧获取按钮位置
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final renderBox = context.findRenderObject();
      if (renderBox is! RenderBox || !renderBox.hasSize) return;
      // 粗略估计位置（题目区域中心）
      final size = renderBox.size;
      // 按题目索引估计纵向偏移
      final approxY = (size.height / (widget.questions.length + 2)) * (index + 2);
      final origin = Offset(size.width / 2, approxY.clamp(0.0, size.height));
      CelebrationService.instance.sparkles(origin, count: 14);
    });
  }

  /// 答错时：抖动 + 触觉。
  void _fireWrong(int index) {
    if (!AnimationUtils.platformReduceMotion) {
      final c = _shakeControllerFor(index);
      c.forward(from: 0.0);
    }
    // 错一道就轻震；最终错误在 _submit 统一处理
    AnimationUtils.hapticLight();
  }

  /// 重置作答，允许再次答题。
  void _retry() {
    setState(() {
      for (final controller in _textControllers.values) {
        controller.clear();
      }
      _choiceAnswers.clear();
      _submitted.clear();
      _finished = false;
      _score = 0.0;
      _correctFired.clear();
    });
    for (final c in _shakeControllers.values) {
      c.value = 0.0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // 无题目时直接通过。
    if (widget.questions.isEmpty) {
      return LingxiCard(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SpringMotion.springTransition(
              child: const Icon(Icons.check_circle, size: 48, color: Colors.green),
            ),
            const SizedBox(height: 8),
            Text('本知识点暂无测验', style: theme.textTheme.titleMedium),
            const SizedBox(height: 16),
            LingxiButton(
              label: const Text('跳过测验'),
              onPressed: widget.onPassed,
            ),
          ],
        ),
      );
    }

    return LingxiCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.quiz, size: 22),
              const SizedBox(width: 8),
              Text(
                '小测验',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < widget.questions.length; i++)
            _buildQuestion(i, theme),
          const SizedBox(height: 8),
          if (_finished) _buildResult(theme),
          if (!_finished)
            _buildSubmitButton(),
          if (_finished && _score < kQuizPassThreshold)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: LingxiButton(
                label: const Text('再试一次'),
                icon: const Icon(Icons.refresh),
                onPressed: _retry,
              ),
            ),
        ],
      ),
    );
  }

  /// 提交按钮：全部作答时显示脉冲呼吸。
  Widget _buildSubmitButton() {
    final enabled = _allAnswered;
    final btn = LingxiButton(
      label: const Text('提交答案'),
      icon: const Icon(Icons.check),
      onPressed: enabled ? _submit : null,
    );
    if (enabled && !AnimationUtils.reduceMotionOf(context)) {
      return SpringMotion.pulseBreathing(
        minScale: 0.98,
        maxScale: 1.02,
        period: const Duration(milliseconds: 1800),
        child: btn,
      );
    }
    return btn;
  }

  /// 构建单道题目。
  Widget _buildQuestion(int index, ThemeData theme) {
    final question = widget.questions[index];
    final submitted = _submitted.contains(index);
    final correct = submitted && _isCorrect(index);
    final qWidget = Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  '第 ${index + 1} 题：${question.question}',
                  style: theme.textTheme.titleMedium,
                ),
              ),
              if (submitted)
                _ResultIcon(correct: correct),
            ],
          ),
          const SizedBox(height: 8),
          _buildAnswerInput(index, question, submitted, correct),
          if (submitted && !correct)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _correctAnswerText(question),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.green,
                ),
              ),
            ),
          if (submitted && question.explanation != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '解析：${question.explanation}',
                style: theme.textTheme.bodySmall,
              ),
            ),
        ],
      ),
    );

    // 错误抖动包装
    if (_shakeControllers.containsKey(index)) {
      return _ShakeWrapper(
        controller: _shakeControllers[index]!,
        child: qWidget,
      );
    }
    return qWidget;
  }

  /// 根据题型构建答题输入。
  Widget _buildAnswerInput(
    int index,
    QuizQuestion question,
    bool submitted,
    bool correct,
  ) {
    switch (question.type) {
      case QuizType.singleChoice:
        return IgnorePointer(
          ignoring: submitted,
          child: Column(
            children: [
              for (var i = 0; i < question.options.length; i++)
                _QuizOptionButton(
                  label: question.options[i],
                  selected: _singleChoiceValue(index) == i,
                  isCorrectAnswer: submitted &&
                      question.correctAnswerIndices.contains(i),
                  isWrongChoice: submitted &&
                      _singleChoiceValue(index) == i &&
                      !question.correctAnswerIndices.contains(i),
                  showFeedback: submitted,
                  onTap: () {
                    if (submitted) return;
                    AnimationUtils.hapticLight();
                    setState(() {
                      _choiceAnswers[index] = <int>[i];
                    });
                  },
                ),
            ],
          ),
        );
      case QuizType.multipleChoice:
        return Column(
          children: [
            for (var i = 0; i < question.options.length; i++)
              _QuizOptionButton(
                label: question.options[i],
                selected: _choiceAnswers[index]?.contains(i) ?? false,
                isCorrectAnswer: submitted &&
                    question.correctAnswerIndices.contains(i),
                isWrongChoice: submitted &&
                    (_choiceAnswers[index]?.contains(i) ?? false) &&
                    !question.correctAnswerIndices.contains(i),
                showFeedback: submitted,
                multiSelect: true,
                onTap: () {
                  if (submitted) return;
                  AnimationUtils.hapticLight();
                  setState(() {
                    final list = List<int>.from(
                      _choiceAnswers[index] ?? <int>[],
                    );
                    if (list.contains(i)) {
                      list.remove(i);
                    } else {
                      list.add(i);
                    }
                    _choiceAnswers[index] = list;
                  });
                },
              ),
          ],
        );
      case QuizType.fillInBlank:
        final borderColor = submitted
            ? (correct ? Colors.green : Colors.red)
            : null;
        return TextField(
          controller: _controllerFor(index),
          enabled: !submitted,
          decoration: InputDecoration(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: borderColor != null
                  ? BorderSide(color: borderColor, width: 2)
                  : BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: borderColor != null
                  ? BorderSide(color: borderColor, width: 2)
                  : BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: borderColor ?? Theme.of(context).colorScheme.primary,
                width: 2,
              ),
            ),
            filled: true,
            fillColor: submitted
                ? (correct
                    ? Colors.green.withValues(alpha: 0.08)
                    : Colors.red.withValues(alpha: 0.08))
                : Theme.of(context).colorScheme.surfaceContainerHighest,
            hintText: '请输入你的答案',
            isDense: true,
          ),
        );
    }
  }

  /// 构造正确答案文本。
  String _correctAnswerText(QuizQuestion question) {
    switch (question.type) {
      case QuizType.singleChoice:
      case QuizType.multipleChoice:
        final texts = <String>[];
        for (final i in question.correctAnswerIndices) {
          if (i >= 0 && i < question.options.length) {
            texts.add(question.options[i]);
          }
        }
        return '正确答案：${texts.join('、')}';
      case QuizType.fillInBlank:
        return '正确答案：${question.correctAnswerText ?? ''}';
    }
  }

  /// 构建测验结果展示。
  Widget _buildResult(ThemeData theme) {
    final passed = _score >= kQuizPassThreshold;
    final bgColor = passed
        ? Colors.green.withValues(alpha: 0.1)
        : Colors.orange.withValues(alpha: 0.1);
    final borderColor = passed ? Colors.green : Colors.orange;
    final icon = passed ? Icons.celebration : Icons.info;
    final text = passed
        ? '恭喜通过！正确率 ${(_score * 100).toInt()}%'
        : '未通过，正确率 ${(_score * 100).toInt()}%。再试一次吧！';

    return SpringMotion.springTransition(
      beginScale: 0.95,
      beginOffset: const Offset(0, 0.1),
      duration: SpringMotion.defaultDuration,
      curve: Curves.easeOutBack,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: ShapeVariants.roundedMedium.borderRadius,
          border: Border.all(color: borderColor.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            Icon(icon, color: borderColor),
            const SizedBox(width: 8),
            Expanded(
              child: Text(text, style: theme.textTheme.bodyLarge),
            ),
          ],
        ),
      ),
    );
  }
}

/// 结果图标（正确/错误）：正确使用弹性缩放，错误使用普通图标。
class _ResultIcon extends StatelessWidget {
  const _ResultIcon({required this.correct});

  final bool correct;

  @override
  Widget build(BuildContext context) {
    final icon = correct
        ? const Icon(Icons.check_circle, color: Colors.green, size: 20)
        : const Icon(Icons.cancel, color: Colors.red, size: 20);

    if (correct && !AnimationUtils.reduceMotionOf(context)) {
      return SpringMotion.springTransition(
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOutBack,
        beginScale: 0.0,
        child: icon,
      );
    }
    return icon;
  }
}

/// 左右抖动包装（~8px）。
class _ShakeWrapper extends StatelessWidget {
  const _ShakeWrapper({
    required this.controller,
    required this.child,
  });

  final AnimationController controller;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (AnimationUtils.reduceMotionOf(context)) return child;

    // TweenSequence: 0→8→-8→6→-6→3→-3→0 像素
    final shakeTween = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 8.0)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 12.5,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 8.0, end: -8.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 25,
      ),
      TweenSequenceItem(
        tween: Tween(begin: -8.0, end: 6.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 20,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 6.0, end: -6.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 20,
      ),
      TweenSequenceItem(
        tween: Tween(begin: -6.0, end: 0.0)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 22.5,
      ),
    ]).animate(controller);

    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) => Transform.translate(
        offset: Offset(shakeTween.value, 0),
        child: child,
      ),
      child: child,
    );
  }
}

/// 测验选项按钮：弹簧缩放按压反馈 + 选中/正确/错误颜色过渡。
class _QuizOptionButton extends StatefulWidget {
  const _QuizOptionButton({
    required this.label,
    required this.selected,
    required this.isCorrectAnswer,
    required this.isWrongChoice,
    required this.showFeedback,
    required this.onTap,
    this.multiSelect = false,
  });

  final String label;
  final bool selected;
  final bool isCorrectAnswer;
  final bool isWrongChoice;
  final bool showFeedback;
  final bool multiSelect;
  final VoidCallback onTap;

  @override
  State<_QuizOptionButton> createState() => _QuizOptionButtonState();
}

class _QuizOptionButtonState extends State<_QuizOptionButton> {
  bool _pressed = false;

  Color _resolveBgColor(ThemeData theme) {
    final scheme = theme.colorScheme;
    if (widget.showFeedback) {
      if (widget.isCorrectAnswer) {
        return Colors.green.withValues(alpha: 0.12);
      }
      if (widget.isWrongChoice) {
        return Colors.red.withValues(alpha: 0.12);
      }
      return scheme.surfaceContainerLow;
    }
    if (widget.selected) {
      return scheme.primaryContainer;
    }
    return scheme.surfaceContainerHighest.withValues(alpha: 0.5);
  }

  Color _resolveBorderColor(ThemeData theme) {
    final scheme = theme.colorScheme;
    if (widget.showFeedback) {
      if (widget.isCorrectAnswer) return Colors.green;
      if (widget.isWrongChoice) return Colors.red;
      return scheme.outlineVariant;
    }
    if (widget.selected) return scheme.primary;
    return scheme.outlineVariant;
  }

  Color _resolveTextColor(ThemeData theme) {
    final scheme = theme.colorScheme;
    if (widget.showFeedback) {
      if (widget.isCorrectAnswer) return Colors.green.shade800;
      if (widget.isWrongChoice) return Colors.red.shade800;
      return scheme.onSurface;
    }
    if (widget.selected) return scheme.onPrimaryContainer;
    return scheme.onSurface;
  }

  IconData? _resolveTrailingIcon() {
    if (!widget.showFeedback) return null;
    if (widget.isCorrectAnswer) return Icons.check_circle;
    if (widget.isWrongChoice) return Icons.cancel;
    return null;
  }

  Color _resolveIconColor() {
    if (widget.isCorrectAnswer) return Colors.green;
    if (widget.isWrongChoice) return Colors.red;
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final borderRadius = ShapeVariants.roundedMedium.borderRadius;

    final bgColor = _resolveBgColor(theme);
    final borderColor = _resolveBorderColor(theme);
    final textColor = _resolveTextColor(theme);
    final trailingIcon = _resolveTrailingIcon();

    final optionContent = AnimatedContainer(
      duration: SpringMotion.fastDuration,
      curve: SpringMotion.fastCurve,
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: borderRadius,
        border: Border.all(
          color: borderColor,
          width: widget.selected || widget.showFeedback ? 2 : 1,
        ),
      ),
      child: Row(
        children: [
          // 选择指示器：单选圆点 / 多选方框
          _SelectionIndicator(
            selected: widget.selected,
            multiSelect: widget.multiSelect,
            showFeedback: widget.showFeedback,
            isCorrect: widget.isCorrectAnswer,
            isWrong: widget.isWrongChoice,
            pressed: _pressed,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: AnimatedDefaultTextStyle(
              duration: SpringMotion.fastDuration,
              curve: SpringMotion.fastCurve,
              style: theme.textTheme.bodyLarge!.copyWith(
                color: textColor,
                fontWeight:
                    widget.selected ? FontWeight.w600 : FontWeight.normal,
              ),
              child: Text(widget.label),
            ),
          ),
          if (trailingIcon != null) ...[
            const SizedBox(width: 8),
            SpringMotion.springTransition(
              duration: const Duration(milliseconds: 400),
              curve: Curves.easeOutBack,
              beginScale: 0.0,
              child: Icon(trailingIcon, color: _resolveIconColor(), size: 20),
            ),
          ],
        ],
      ),
    );

    // 使用 GestureDetector + Listener 统一处理按压缩放和点击
    final scale = reduceMotion ? 1.0 : (_pressed ? 0.97 : 1.0);
    return GestureDetector(
      onTap: widget.showFeedback ? null : widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: Listener(
        onPointerDown: (_) {
          if (!reduceMotion && !widget.showFeedback) {
            setState(() => _pressed = true);
          }
        },
        onPointerUp: (_) {
          if (!reduceMotion) setState(() => _pressed = false);
        },
        onPointerCancel: (_) {
          if (!reduceMotion) setState(() => _pressed = false);
        },
        child: AnimatedScale(
          scale: scale,
          duration: SpringMotion.fastDuration,
          curve: SpringMotion.fastCurve,
          child: optionContent,
        ),
      ),
    );
  }
}

/// 选项前的选择指示器（单选圆点 / 多选方框）。
class _SelectionIndicator extends StatelessWidget {
  const _SelectionIndicator({
    required this.selected,
    required this.multiSelect,
    required this.showFeedback,
    required this.isCorrect,
    required this.isWrong,
    required this.pressed,
  });

  final bool selected;
  final bool multiSelect;
  final bool showFeedback;
  final bool isCorrect;
  final bool isWrong;
  final bool pressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    Color activeColor;
    if (showFeedback) {
      if (isCorrect) {
        activeColor = Colors.green;
      } else if (isWrong) {
        activeColor = Colors.red;
      } else {
        activeColor = scheme.outline;
      }
    } else {
      activeColor = scheme.primary;
    }

    final scale = pressed ? 0.9 : 1.0;
    final size = 22.0;

    if (multiSelect) {
      return AnimatedContainer(
        duration: SpringMotion.fastDuration,
        curve: SpringMotion.fastCurve,
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: selected ? activeColor : Colors.transparent,
          borderRadius: BorderRadius.circular(5),
          border: Border.all(
            color: selected ? activeColor : scheme.outline,
            width: 2,
          ),
        ),
        child: Transform.scale(
          scale: reduceMotion ? 1.0 : scale,
          child: selected
              ? const Icon(Icons.check, size: 14, color: Colors.white)
              : null,
        ),
      );
    }

    // 单选：外圈 + 内点
    return AnimatedContainer(
      duration: SpringMotion.fastDuration,
      curve: SpringMotion.fastCurve,
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: selected ? activeColor : scheme.outline,
          width: 2,
        ),
      ),
      child: Center(
        child: Transform.scale(
          scale: reduceMotion
              ? (selected ? 1.0 : 0.0)
              : (pressed && selected ? 0.8 : (selected ? 1.0 : 0.0)),
          child: AnimatedContainer(
            duration: SpringMotion.fastDuration,
            curve: SpringMotion.fastCurve,
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: activeColor,
            ),
          ),
        ),
      ),
    );
  }
}
