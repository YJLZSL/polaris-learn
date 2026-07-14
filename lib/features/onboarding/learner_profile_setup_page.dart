import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 学习者画像采集页面。
///
/// 在 Onboarding 引导流程末尾展示，通过 3-5 道选择题收集：
/// - 年龄段（ageGroup）
/// - 编程经验（skillLevel）
/// - 每日学习时长（dailyMinutes）
/// - 学习节奏偏好（pace）
///
/// 用户完成后数据写入 [LearnerProfiles] 表。
class LearnerProfileSetupPage extends ConsumerStatefulWidget {
  const LearnerProfileSetupPage({
    super.key,
    this.onComplete,
  });

  /// 完成画像设置的回调。
  final VoidCallback? onComplete;

  @override
  ConsumerState<LearnerProfileSetupPage> createState() =>
      _LearnerProfileSetupPageState();
}

class _LearnerProfileSetupPageState
    extends ConsumerState<LearnerProfileSetupPage> {
  int _currentStep = 0;

  // 用户选择
  String _ageGroup = 'young';
  String _skillLevel = 'beginner';
  int _dailyMinutes = 30;
  String _pace = 'balanced';

  static const _totalSteps = 4;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 进度指示器
              _buildProgressBar(colorScheme),
              const SizedBox(height: 32),

              // 标题
              Text(
                '让小犀更了解你',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                '回答几个问题，帮助我们为你定制最佳学习体验',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // 当前步骤内容
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _buildStep(_currentStep),
                ),
              ),

              // 底部按钮
              const SizedBox(height: 16),
              Row(
                children: [
                  if (_currentStep > 0)
                    Expanded(
                      child: LingxiButton(
                        label: const Text('上一步'),
                        variant: LingxiButtonVariant.text,
                        onPressed: _previousStep,
                      ),
                    ),
                  if (_currentStep > 0) const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: LingxiButton(
                      label: Text(
                        _currentStep < _totalSteps - 1 ? '下一步' : '开始学习',
                      ),
                      variant: LingxiButtonVariant.filled,
                      onPressed: _nextStep,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // 跳过选项
              TextButton(
                onPressed: _skipSetup,
                child: Text(
                  '跳过，稍后设置',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressBar(ColorScheme colorScheme) {
    return Row(
      children: List.generate(_totalSteps, (i) {
        final isActive = i <= _currentStep;
        return Expanded(
          child: Container(
            height: 4,
            margin: EdgeInsets.only(right: i < _totalSteps - 1 ? 4 : 0),
            decoration: BoxDecoration(
              color: isActive
                  ? colorScheme.primary
                  : colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildStep(int step) {
    switch (step) {
      case 0:
        return _AgeGroupStep(
          key: const ValueKey('age'),
          selected: _ageGroup,
          onChanged: (v) => setState(() => _ageGroup = v),
        );
      case 1:
        return _SkillLevelStep(
          key: const ValueKey('skill'),
          selected: _skillLevel,
          onChanged: (v) => setState(() => _skillLevel = v),
        );
      case 2:
        return _DailyMinutesStep(
          key: const ValueKey('minutes'),
          selected: _dailyMinutes,
          onChanged: (v) => setState(() => _dailyMinutes = v),
        );
      case 3:
        return _PaceStep(
          key: const ValueKey('pace'),
          selected: _pace,
          onChanged: (v) => setState(() => _pace = v),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  void _nextStep() {
    if (_currentStep < _totalSteps - 1) {
      setState(() => _currentStep++);
    } else {
      _saveAndComplete();
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
    }
  }

  void _skipSetup() {
    widget.onComplete?.call();
  }

  Future<void> _saveAndComplete() async {
    try {
      await ref.read(learnerProfileRepositoryProvider).updateProfile(
            ageGroup: _ageGroup,
            skillLevel: _skillLevel,
            dailyMinutes: _dailyMinutes,
            pace: _pace,
          );
    } catch (_) {
      // 保存失败静默处理，不阻断引导流程
    }
    widget.onComplete?.call();
  }
}

// ── 各步骤子组件 ────────────────────────────────────────

class _AgeGroupStep extends StatelessWidget {
  const _AgeGroupStep({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return _OptionList(
      question: '你属于哪个年龄段？',
      options: const [
        _Option(value: 'young', label: '小学/初中生', icon: Icons.child_care_rounded),
        _Option(value: 'advanced', label: '高中/大学生及以上', icon: Icons.school_rounded),
      ],
      selected: selected,
      onChanged: onChanged,
    );
  }
}

class _SkillLevelStep extends StatelessWidget {
  const _SkillLevelStep({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return _OptionList(
      question: '你的编程经验如何？',
      options: const [
        _Option(value: 'beginner', label: '完全零基础', icon: Icons.star_border_rounded),
        _Option(value: 'intermediate', label: '学过一些基础', icon: Icons.star_half_rounded),
        _Option(value: 'advanced', label: '有一定项目经验', icon: Icons.star_rounded),
      ],
      selected: selected,
      onChanged: onChanged,
    );
  }
}

class _DailyMinutesStep extends StatelessWidget {
  const _DailyMinutesStep({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final int selected;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          '每天想花多少时间学习？',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        for (final minutes in [15, 30, 45, 60])
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _SelectableCard(
              label: '$minutes 分钟/天',
              subtitle: _minutesHint(minutes),
              isSelected: selected == minutes,
              onTap: () => onChanged(minutes),
            ),
          ),
      ],
    );
  }

  String _minutesHint(int minutes) {
    if (minutes <= 15) return '轻松学习，每天一小步';
    if (minutes <= 30) return '适中节奏，循序渐进';
    if (minutes <= 45) return '认真投入，进步明显';
    return '全力冲刺，快速成长';
  }
}

class _PaceStep extends StatelessWidget {
  const _PaceStep({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return _OptionList(
      question: '你喜欢什么学习节奏？',
      options: const [
        _Option(value: 'relaxed', label: '慢慢来，不着急', icon: Icons.spa_rounded),
        _Option(value: 'balanced', label: '适中，稳步前进', icon: Icons.balance_rounded),
        _Option(value: 'intensive', label: '高效密集学习', icon: Icons.bolt_rounded),
      ],
      selected: selected,
      onChanged: onChanged,
    );
  }
}

// ── 通用选项列表 ────────────────────────────────────────

class _Option {
  const _Option({
    required this.value,
    required this.label,
    required this.icon,
  });

  final String value;
  final String label;
  final IconData icon;
}

class _OptionList extends StatelessWidget {
  const _OptionList({
    required this.question,
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  final String question;
  final List<_Option> options;
  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          question,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        for (final opt in options)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _SelectableCard(
              label: opt.label,
              icon: opt.icon,
              isSelected: selected == opt.value,
              onTap: () => onChanged(opt.value),
            ),
          ),
      ],
    );
  }
}

class _SelectableCard extends StatelessWidget {
  const _SelectableCard({
    required this.label,
    this.subtitle,
    this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final String? subtitle;
  final IconData? icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return LingxiCard(
      color: isSelected ? colorScheme.primaryContainer : null,
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              color: isSelected
                  ? colorScheme.onPrimaryContainer
                  : colorScheme.onSurfaceVariant,
              size: 22,
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected
                        ? colorScheme.onPrimaryContainer
                        : null,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ),
          if (isSelected)
            Icon(
              Icons.check_circle_rounded,
              color: colorScheme.primary,
              size: 22,
            ),
        ],
      ),
    );
  }
}
