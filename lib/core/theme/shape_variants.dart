import 'package:flutter/material.dart';

/// 形状变体枚举
///
/// 参考 Material 3 Expressive 的 35 种形状，由 5 种形状模式
/// （矩形 rectangle、圆角矩形 rounded、胶囊 capsule、圆形 circle、八角形 octagon）
/// 与 7 种圆角程度（none/extraSmall/small/medium/large/extraLarge/full）组合而成，
/// 共 5 × 7 = 35 种变体。
///
/// [toShapeBorder] 统一返回 [RoundedRectangleBorder] 或 [CircleBorder]：
/// 圆形系列返回 [CircleBorder]，其余系列返回带对应圆角的 [RoundedRectangleBorder]
/// （胶囊与八角形系列目前以圆角矩形近似，full 程度会形成胶囊观感）。
enum ShapeVariants {
  // 矩形系列
  rectangleNone,
  rectangleExtraSmall,
  rectangleSmall,
  rectangleMedium,
  rectangleLarge,
  rectangleExtraLarge,
  rectangleFull,
  // 圆角矩形系列
  roundedNone,
  roundedExtraSmall,
  roundedSmall,
  roundedMedium,
  roundedLarge,
  roundedExtraLarge,
  roundedFull,
  // 胶囊系列
  capsuleNone,
  capsuleExtraSmall,
  capsuleSmall,
  capsuleMedium,
  capsuleLarge,
  capsuleExtraLarge,
  capsuleFull,
  // 圆形系列
  circleNone,
  circleExtraSmall,
  circleSmall,
  circleMedium,
  circleLarge,
  circleExtraLarge,
  circleFull,
  // 八角形系列
  octagonNone,
  octagonExtraSmall,
  octagonSmall,
  octagonMedium,
  octagonLarge,
  octagonExtraLarge,
  octagonFull;

  /// 圆角程度对应的半径数值
  double get _radiusValue {
    switch (this) {
      case ShapeVariants.rectangleNone:
      case ShapeVariants.roundedNone:
      case ShapeVariants.capsuleNone:
      case ShapeVariants.circleNone:
      case ShapeVariants.octagonNone:
        return 0;
      case ShapeVariants.rectangleExtraSmall:
      case ShapeVariants.roundedExtraSmall:
      case ShapeVariants.capsuleExtraSmall:
      case ShapeVariants.circleExtraSmall:
      case ShapeVariants.octagonExtraSmall:
        return 4;
      case ShapeVariants.rectangleSmall:
      case ShapeVariants.roundedSmall:
      case ShapeVariants.capsuleSmall:
      case ShapeVariants.circleSmall:
      case ShapeVariants.octagonSmall:
        return 8;
      case ShapeVariants.rectangleMedium:
      case ShapeVariants.roundedMedium:
      case ShapeVariants.capsuleMedium:
      case ShapeVariants.circleMedium:
      case ShapeVariants.octagonMedium:
        return 12;
      case ShapeVariants.rectangleLarge:
      case ShapeVariants.roundedLarge:
      case ShapeVariants.capsuleLarge:
      case ShapeVariants.circleLarge:
      case ShapeVariants.octagonLarge:
        return 16;
      case ShapeVariants.rectangleExtraLarge:
      case ShapeVariants.roundedExtraLarge:
      case ShapeVariants.capsuleExtraLarge:
      case ShapeVariants.circleExtraLarge:
      case ShapeVariants.octagonExtraLarge:
        return 28;
      case ShapeVariants.rectangleFull:
      case ShapeVariants.roundedFull:
      case ShapeVariants.capsuleFull:
      case ShapeVariants.circleFull:
      case ShapeVariants.octagonFull:
        return 9999;
    }
  }

  /// 是否属于圆形系列
  bool get _isCircle => name.startsWith('circle');

  /// 返回对应的 [BorderRadius]（圆形系列退化为 0）
  BorderRadius get borderRadius => BorderRadius.circular(_radiusValue);

  /// 返回对应的 [OutlinedBorder]
  ///
  /// 圆形系列返回 [CircleBorder]，其余返回带对应圆角的 [RoundedRectangleBorder]。
  /// 两者均为 [OutlinedBorder] 子类，可直接用于 Material 按钮/Chip 的 shape 参数。
  OutlinedBorder toShapeBorder() {
    if (_isCircle) {
      return const CircleBorder();
    }
    return RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(_radiusValue),
    );
  }
}
