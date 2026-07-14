import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:lingxi_academy/shared/widgets/empty_state_widget.dart';

/// 无对话历史空状态。
///
/// 在对话列表页为空时展示，CTA 跳转到 /chat 开始对话。
class EmptyConversationState extends StatelessWidget {
  const EmptyConversationState({super.key});

  @override
  Widget build(BuildContext context) {
    return EmptyStateWidget(
      mascotMood: MascotMood.sad,
      title: '还没有对话历史',
      description: '开始第一次对话，让小犀陪你学习',
      ctaText: '开始对话',
      onCta: () => context.go(RouteNames.chatListPath),
    );
  }
}
