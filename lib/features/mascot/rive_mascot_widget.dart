import 'package:flutter/widgets.dart';

import 'mascot_state.dart';

/// Rive 版吉祥物组件（预留接口，暂未实现）。
///
/// TODO: 后续用 Rive Editor 设计精美的小犀 `.riv` 文件后，替换 [MascotWidget]
/// 的实现。当前使用 `MascotWidget` + `MascotPainter` 的 CustomPainter 矢量绘制
/// 作为 fallback 方案。
///
/// Rive 集成步骤：
/// 1. 在 Rive Editor 中设计小犀，定义 6 状态机（idle/happy/thinking/sad/
///    celebrate/curious）。
/// 2. 导出 `.riv` 文件到 `assets/rive/mascot.riv`。
/// 3. 用 rive 包的 `RiveAnimation.network` 或 `RiveAnimation.asset` 加载。
/// 4. 通过 `SMIInput` / `SMINumber` / `SMITrigger` 控制状态机切换。
///
/// 届时本类将提供与 [MascotWidget] 一致的构造参数，内部改为加载 `.riv`
/// 并按 [MascotMood] 触发对应状态机输入。
class RiveMascotWidget extends StatelessWidget {
  const RiveMascotWidget({
    super.key,
    this.size = 120,
    this.mood,
    this.onTap,
    this.enableTapInteraction = true,
  });

  /// 吉祥物尺寸
  final double size;

  /// 情绪（状态机输入）
  final MascotMood? mood;

  /// 点击回调
  final VoidCallback? onTap;

  /// 是否启用点击交互
  final bool enableTapInteraction;

  @override
  Widget build(BuildContext context) {
    // 暂未实现：返回空占位，保持接口签名与 MascotWidget 一致，
    // 便于后续无缝替换。
    return SizedBox(
      width: size,
      height: size,
      child: const SizedBox.shrink(),
    );
  }
}
