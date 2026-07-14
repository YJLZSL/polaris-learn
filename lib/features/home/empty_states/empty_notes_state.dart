import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/features/mascot/mascot_state.dart';
import 'package:lingxi_academy/shared/widgets/empty_state_widget.dart';

/// 无笔记空状态。
///
/// 在笔记页为空时展示，CTA 跳转到 /learning 去学习。
class EmptyNotesState extends StatelessWidget {
  const EmptyNotesState({super.key});

  @override
  Widget build(BuildContext context) {
    return EmptyStateWidget(
      mascotMood: MascotMood.curious,
      title: '还没有笔记',
      description: '在学习或对话中，重要内容可一键保存为笔记',
      ctaText: '去学习',
      onCta: () => context.go(RouteNames.learningPath),
    );
  }
}
