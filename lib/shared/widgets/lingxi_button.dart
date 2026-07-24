import 'package:flutter/material.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/theme/lingxi_elevations.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';

/// 按钮变体
enum LingxiButtonVariant {
  /// 填充按钮（主要操作）
  filled,

  /// Tonal 填充按钮（次要操作）
  tonal,

  /// 凸起按钮
  elevated,

  /// 描边按钮
  outlined,

  /// 文本按钮
  text,
}

/// 按钮尺寸
enum LingxiButtonSize {
  /// 小
  small,

  /// 中
  medium,

  /// 大
  large,
}

/// 灵犀学院按钮组件
///
/// 统一封装各类 Material 3 按钮，支持按压弹性反馈、loading 状态、
/// CTA 呼吸脉动、多种变体与尺寸。
class LingxiButton extends StatefulWidget {
  const LingxiButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.variant = LingxiButtonVariant.filled,
    this.size = LingxiButtonSize.medium,
    this.isLoading = false,
    this.pulse = false,
    this.enableHaptic = true,
  });

  /// 按钮文字
  final Widget label;

  /// 可选前缀图标
  final Widget? icon;

  /// 点击回调，为 null 时按钮处于禁用态
  final VoidCallback? onPressed;

  /// 按钮变体
  final LingxiButtonVariant variant;

  /// 按钮尺寸
  final LingxiButtonSize size;

  /// 是否显示 loading 指示器
  final bool isLoading;

  /// CTA 呼吸脉动效果
  final bool pulse;

  /// 是否启用触觉反馈
  final bool enableHaptic;

  @override
  State<LingxiButton> createState() => _LingxiButtonState();
}

class _LingxiButtonState extends State<LingxiButton> {
  bool _pressed = false;
  late final WidgetStatesController _statesController;

  @override
  void initState() {
    super.initState();
    _statesController = WidgetStatesController()
      ..addListener(_onStatesChanged);
  }

  @override
  void dispose() {
    _statesController.removeListener(_onStatesChanged);
    _statesController.dispose();
    super.dispose();
  }

  void _onStatesChanged() {
    final pressed = _statesController.value.contains(WidgetState.pressed);
    if (pressed != _pressed && mounted) {
      setState(() => _pressed = pressed);
    }
  }

  void _handlePressed() {
    if (widget.isLoading) return;
    if (widget.enableHaptic) {
      AnimationUtils.hapticLight();
    }
    widget.onPressed?.call();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final disabled = widget.onPressed == null || widget.isLoading;
    final scale = _pressed && !disabled ? 0.96 : 1.0;
    final shape = ShapeVariants.roundedLarge.toShapeBorder();

    final (vertical, horizontal, fontSize, iconSize) = switch (widget.size) {
      LingxiButtonSize.small => (6.0, 12.0, null, 16.0),
      LingxiButtonSize.medium => (12.0, 20.0, null, 18.0),
      LingxiButtonSize.large => (16.0, 28.0, 16.0, 20.0),
    };

    final padding = EdgeInsets.symmetric(
      vertical: vertical,
      horizontal: horizontal,
    );
    final textStyle = fontSize == null ? null : TextStyle(fontSize: fontSize);

    // 构建按钮内容
    Widget buttonContent;
    if (widget.isLoading) {
      final spinnerSize = switch (widget.size) {
        LingxiButtonSize.small => 14.0,
        LingxiButtonSize.medium => 18.0,
        LingxiButtonSize.large => 20.0,
      };
      buttonContent = SizedBox(
        width: spinnerSize,
        height: spinnerSize,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          strokeAlign: BorderSide.strokeAlignInside,
          color: _spinnerColorFor(context),
        ),
      );
    } else if (widget.icon != null) {
      buttonContent = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconTheme(
            data: IconThemeData(size: iconSize),
            child: widget.icon!,
          ),
          const SizedBox(width: 8),
          widget.label,
        ],
      );
    } else {
      buttonContent = widget.label;
    }

    final buttonStyle = ButtonStyle(
      shape: WidgetStatePropertyAll(shape),
      padding: WidgetStatePropertyAll(padding),
      textStyle: WidgetStatePropertyAll(textStyle),
    );

    // 构建按钮
    Widget button = switch (widget.variant) {
      LingxiButtonVariant.filled => FilledButton(
          onPressed: disabled ? null : _handlePressed,
          statesController: _statesController,
          style: buttonStyle,
          child: buttonContent,
        ),
      LingxiButtonVariant.tonal => FilledButton.tonal(
          onPressed: disabled ? null : _handlePressed,
          statesController: _statesController,
          style: buttonStyle,
          child: buttonContent,
        ),
      LingxiButtonVariant.elevated => ElevatedButton(
          onPressed: disabled ? null : _handlePressed,
          statesController: _statesController,
          style: buttonStyle,
          child: buttonContent,
        ),
      LingxiButtonVariant.outlined => OutlinedButton(
          onPressed: disabled ? null : _handlePressed,
          statesController: _statesController,
          style: buttonStyle,
          child: buttonContent,
        ),
      LingxiButtonVariant.text => TextButton(
          onPressed: disabled ? null : _handlePressed,
          statesController: _statesController,
          style: buttonStyle,
          child: buttonContent,
        ),
    };

    // 按压阴影抬升（subtle → elevated）+ 弹性缩放 0.96
    // 仅在动画启用时生效；reduceMotion 下跳过，按钮保持默认外观
    if (!reduceMotion) {
      final elevations = context.lingxiElevations;
      final shadows = _pressed && !disabled
          ? elevations.elevated
          : elevations.subtle;
      button = AnimatedContainer(
        duration: SpringMotion.fastDuration,
        curve: SpringMotion.fastCurve,
        decoration: BoxDecoration(
          borderRadius: ShapeVariants.roundedLarge.borderRadius,
          boxShadow: shadows,
        ),
        child: AnimatedScale(
          scale: scale,
          duration: SpringMotion.fastDuration,
          curve: SpringMotion.fastCurve,
          child: button,
        ),
      );
    }

    // CTA 呼吸脉动
    if (widget.pulse && !widget.isLoading && !disabled && !reduceMotion) {
      button = SpringMotion.pulseBreathing(
        minScale: 0.98,
        maxScale: 1.02,
        child: button,
      );
    }

    return button;
  }

  Color? _spinnerColorFor(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return switch (widget.variant) {
      LingxiButtonVariant.filled => colorScheme.onPrimary,
      LingxiButtonVariant.tonal => colorScheme.onSecondaryContainer,
      LingxiButtonVariant.elevated => colorScheme.onPrimary,
      LingxiButtonVariant.outlined => colorScheme.primary,
      LingxiButtonVariant.text => colorScheme.primary,
    };
  }
}
