import 'dart:math';

import 'package:flutter/material.dart';

/// 数字动画文本组件
///
/// 当 [value] 发生变化时，在旧值与新值之间播放平滑的数字过渡动画。
/// 支持千分位分隔符、前后缀、小数位数配置，以及系统"减弱动画效果"偏好。
class AnimatedCountText extends StatefulWidget {
  /// 创建一个数字动画文本组件。
  ///
  /// [value] 为当前要显示的目标数值，可以是 [int] 或 [double]。
  /// 当 [value] 在两次构建之间发生变化时，组件会自动从旧值动画到新值。
  const AnimatedCountText({
    super.key,
    required this.value,
    this.prefix = '',
    this.suffix = '',
    this.style,
    this.duration = const Duration(milliseconds: 600),
    this.curve = Curves.easeOutCubic,
    this.fractionDigits,
    this.separator = ',',
  });

  /// 要显示的目标数值，支持 [int] 或 [double]。
  final num value;

  /// 显示在数字前的前缀文本，例如货币符号 `¥`。
  final String prefix;

  /// 显示在数字后的后缀文本，例如单位 `天`、`%`。
  final String suffix;

  /// 文本样式；为空时使用周边 [DefaultTextStyle] 的样式。
  final TextStyle? style;

  /// 数字过渡动画的持续时间，默认为 600 毫秒。
  final Duration duration;

  /// 数字过渡动画使用的缓动曲线，默认为 [Curves.easeOutCubic]。
  final Curve curve;

  /// 小数部分保留的位数。
  ///
  /// 若未显式提供：当 [value] 为 [int] 时默认为 `0`（不显示小数）；
  /// 当 [value] 为 [double] 时默认为 `0`（整体取整显示）。
  final int? fractionDigits;

  /// 千分位分隔符，默认为英文逗号 `,`（例如 `1,000,000`）。
  /// 传空字符串 `''` 可禁用千分位分隔。
  final String separator;

  @override
  State<AnimatedCountText> createState() => _AnimatedCountTextState();
}

class _AnimatedCountTextState extends State<AnimatedCountText>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  late double _displayValue;
  late double _targetValue;

  /// 实际生效的小数位数。
  int get _effectiveFractionDigits {
    if (widget.fractionDigits != null) {
      return widget.fractionDigits!;
    }
    // int 类型默认 0 位小数；double 也默认 0 位（整体取整），
    // 用户可显式传 fractionDigits 以显示小数。
    return 0;
  }

  /// 动画监听器：在动画值变化时刷新 UI。
  void _onAnimationTick() {
    setState(() {
      _displayValue = _animation.value;
    });
  }

  /// 使用当前 [_displayValue] 到 [_targetValue] 的区间构建补间动画。
  void _buildAnimation() {
    _animation = Tween<double>(
      begin: _displayValue,
      end: _targetValue,
    ).animate(CurvedAnimation(parent: _controller, curve: widget.curve))
      ..addListener(_onAnimationTick);
  }

  @override
  void initState() {
    super.initState();
    _targetValue = widget.value.toDouble();
    _displayValue = _targetValue;

    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    _buildAnimation();
  }

  @override
  void didUpdateWidget(covariant AnimatedCountText oldWidget) {
    super.didUpdateWidget(oldWidget);
    final double newTarget = widget.value.toDouble();
    if (newTarget != _targetValue) {
      _targetValue = newTarget;

      // 处理系统"减弱动态效果"设置：直接跳到最终值，不播放动画。
      final bool reduceMotion =
          MediaQuery.maybeDisableAnimationsOf(context) ?? false;
      if (reduceMotion) {
        _controller.stop();
        setState(() {
          _displayValue = _targetValue;
        });
        return;
      }

      // 若动画时长变化，同步更新控制器。
      if (widget.duration != oldWidget.duration) {
        _controller.duration = widget.duration;
      }

      // 移除旧动画上的监听器后重建补间，从当前显示值平滑过渡到新目标值。
      _animation.removeListener(_onAnimationTick);
      _buildAnimation();

      _controller
        ..reset()
        ..forward();
    }
  }

  @override
  void dispose() {
    _animation.removeListener(_onAnimationTick);
    _controller.dispose();
    super.dispose();
  }

  /// 将数值格式化为带千分位分隔符与指定小数位的字符串。
  String _formatNumber(double value) {
    final int frac = _effectiveFractionDigits;
    // 先四舍五入/取整到指定小数位。
    final num rounded;
    if (frac <= 0) {
      rounded = value.round();
    } else {
      final double factor = pow(10, frac).toDouble();
      rounded = (value * factor).round() / factor;
    }

    // 拆分整数部分与小数部分。
    String intPartStr;
    String decPartStr = '';
    if (frac <= 0) {
      intPartStr = rounded.abs().toString();
    } else {
      final String str = rounded.abs().toStringAsFixed(frac);
      final int dot = str.indexOf('.');
      if (dot >= 0) {
        intPartStr = str.substring(0, dot);
        decPartStr = str.substring(dot + 1);
      } else {
        intPartStr = str;
      }
    }

    // 为整数部分插入千分位分隔符。
    final String separatedInt;
    if (widget.separator.isEmpty) {
      separatedInt = intPartStr;
    } else {
      final StringBuffer buf = StringBuffer();
      final int length = intPartStr.length;
      for (int i = 0; i < length; i++) {
        if (i > 0 && (length - i) % 3 == 0) {
          buf.write(widget.separator);
        }
        buf.write(intPartStr[i]);
      }
      separatedInt = buf.toString();
    }

    final String sign = value < 0 ? '-' : '';
    if (frac > 0 && decPartStr.isNotEmpty) {
      return '$sign$separatedInt.$decPartStr';
    }
    return '$sign$separatedInt';
  }

  @override
  Widget build(BuildContext context) {
    final String numberStr = _formatNumber(_displayValue);
    return Text(
      '${widget.prefix}$numberStr${widget.suffix}',
      style: widget.style,
    );
  }
}
