import 'package:flutter/material.dart';
import 'package:lingxi_academy/core/theme/lingxi_colors.dart';
import 'package:lingxi_academy/data/models/course_content.dart';

/// 课程级别在视觉上的语义化颜色映射。
///
/// 通过 [LingxiColors] 主题扩展提供级别色条、图标等元素的统一配色，
/// 与 [LingxiGradients] 的级别渐变保持视觉语义一致：
///
/// - [CourseLevel.l0]：[LingxiColors.mascotSecondary]（温暖橙，入门）
/// - [CourseLevel.l1]：[LingxiColors.socraticBlue]（苏格拉底蓝，基础）
/// - [CourseLevel.l2]：[LingxiColors.mascotPrimary]（星空紫，进阶）
/// - [CourseLevel.l3]：[LingxiColors.achievementGold]（成就金，高级）
/// - [CourseLevel.l4]：[LingxiColors.streakFire]（火焰红，专家）
extension CourseLevelColorX on CourseLevel {
  /// 当前级别在 [LingxiColors] 主题中对应的语义色。
  Color levelColor(LingxiColors colors) => switch (this) {
        CourseLevel.l0 => colors.mascotSecondary,
        CourseLevel.l1 => colors.socraticBlue,
        CourseLevel.l2 => colors.mascotPrimary,
        CourseLevel.l3 => colors.achievementGold,
        CourseLevel.l4 => colors.streakFire,
      };
}
