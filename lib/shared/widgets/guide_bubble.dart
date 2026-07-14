import 'package:flutter/material.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/theme/shape_variants.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 引导气泡组件。
///
/// 在用户首次进入某类知识点或页面时显示"下一步"引导气泡，
/// 帮助自学能力较弱的用户理解学习流程。
///
/// 使用 SharedPreferences 记录气泡是否已展示过，避免重复打扰。
class GuideBubble extends StatefulWidget {
  const GuideBubble({
    super.key,
    required this.child,
    required this.guideKey,
    required this.message,
    this.actionLabel = '知道了',
    this.position = GuideBubblePosition.below,
    this.showOnce = true,
  });

  /// 被引导的子 Widget。
  final Widget child;

  /// 引导标识（用于 SharedPreferences 持久化）。
  final String guideKey;

  /// 引导消息文本。
  final String message;

  /// 操作按钮文本。
  final String actionLabel;

  /// 气泡位置。
  final GuideBubblePosition position;

  /// 是否只显示一次（之后不再出现）。
  final bool showOnce;

  @override
  State<GuideBubble> createState() => _GuideBubbleState();
}

/// 气泡位置枚举。
enum GuideBubblePosition {
  above,
  below,
}

class _GuideBubbleState extends State<GuideBubble> {
  bool _showBubble = false;
  bool _dismissed = false;

  @override
  void initState() {
    super.initState();
    _checkShouldShow();
  }

  Future<void> _checkShouldShow() async {
    if (!widget.showOnce) {
      if (mounted) setState(() => _showBubble = true);
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'guide_shown_${widget.guideKey}';
      final shown = prefs.getBool(key) ?? false;
      if (!shown && mounted) {
        setState(() => _showBubble = true);
      }
    } catch (_) {
      // SharedPreferences 失败时不显示引导
    }
  }

  Future<void> _dismiss() async {
    setState(() => _dismissed = true);
    if (widget.showOnce) {
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('guide_shown_${widget.guideKey}', true);
      } catch (_) {
        // 静默处理
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_showBubble || _dismissed) {
      return widget.child;
    }

    final bubble = _GuideBubbleOverlay(
      message: widget.message,
      actionLabel: widget.actionLabel,
      onDismiss: _dismiss,
    );

    if (widget.position == GuideBubblePosition.above) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          bubble,
          const SizedBox(height: 8),
          widget.child,
        ],
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        widget.child,
        const SizedBox(height: 8),
        bubble,
      ],
    );
  }
}

/// 气泡 UI。
class _GuideBubbleOverlay extends StatelessWidget {
  const _GuideBubbleOverlay({
    required this.message,
    required this.actionLabel,
    required this.onDismiss,
  });

  final String message;
  final String actionLabel;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return SpringMotion.springTransition(
      beginScale: 0.9,
      beginOffset: const Offset(0, -0.05),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: colorScheme.primaryContainer,
          borderRadius: ShapeVariants.roundedMedium.borderRadius,
          boxShadow: [
            BoxShadow(
              color: colorScheme.shadow.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.lightbulb_outline_rounded,
              size: 18,
              color: colorScheme.onPrimaryContainer,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                message,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onPrimaryContainer,
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onDismiss,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  actionLabel,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
