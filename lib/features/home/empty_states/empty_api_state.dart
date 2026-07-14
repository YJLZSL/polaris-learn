import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:lingxi_academy/shared/widgets/empty_state_widget.dart';

/// 无 API 配置空状态。
///
/// 在 API 设置页为空时展示，CTA 跳转到 /settings/api 去配置。
class EmptyApiState extends StatelessWidget {
  const EmptyApiState({super.key});

  @override
  Widget build(BuildContext context) {
    return EmptyStateWidget(
      mascotMood: MascotMood.thinking,
      title: '还没有配置 API',
      description: '灵犀学院需要你自备 AI API 才能与小犀对话',
      ctaText: '去配置',
      onCta: () => context.go(RouteNames.settingsApiPath),
    );
  }
}
