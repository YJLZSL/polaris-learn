import 'package:flutter/widgets.dart';
import 'package:rive/rive.dart';

import 'mascot_state.dart';
import 'mascot_widget.dart';

/// Rive 版吉祥物组件。
///
/// 尝试从 `assets/rive/lingxi_mascot.riv` 加载 Rive 动画文件。
/// 若加载失败（文件不存在或格式错误），自动降级为 [MascotWidget]
/// 的 CustomPainter 渲染方案。
///
/// Rive 文件要求：
/// - 状态机名称：`MascotStateMachine`
/// - 输入变量（SMINumber）：`mood`
///   - 0 = idle, 1 = happy, 2 = thinking, 3 = sad, 4 = celebrate, 5 = curious
///
/// 设计完成后将 `.riv` 文件放入 `assets/rive/` 目录即可激活。
class RiveMascotWidget extends StatefulWidget {
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

  /// Rive 资源路径
  static const riveAssetPath = 'assets/rive/lingxi_mascot.riv';

  /// 状态机名称
  static const stateMachineName = 'MascotStateMachine';

  /// mood 输入变量名
  static const moodInputName = 'mood';

  @override
  State<RiveMascotWidget> createState() => _RiveMascotWidgetState();
}

class _RiveMascotWidgetState extends State<RiveMascotWidget> {
  Artboard? _artboard;
  StateMachineController? _controller;
  SMINumber? _moodInput;
  bool _loadFailed = false;

  @override
  void initState() {
    super.initState();
    _loadRiveFile();
  }

  Future<void> _loadRiveFile() async {
    try {
      final file = await RiveFile.asset(RiveMascotWidget.riveAssetPath);
      final artboard = file.mainArtboard.instance();
      final controller = StateMachineController.fromArtboard(
        artboard,
        RiveMascotWidget.stateMachineName,
      );

      if (controller == null) {
        debugPrint('RiveMascot: StateMachine "${RiveMascotWidget.stateMachineName}" not found');
        if (mounted) setState(() => _loadFailed = true);
        return;
      }

      artboard.addController(controller);

      // 查找 mood 输入
      final moodInput = controller.findInput<double>(
        RiveMascotWidget.moodInputName,
      );

      if (mounted) {
        setState(() {
          _artboard = artboard;
          _controller = controller;
          _moodInput = moodInput as SMINumber?;
        });
        _syncMood();
      }
    } catch (e) {
      debugPrint('RiveMascot: 加载失败，降级为 CustomPainter: $e');
      if (mounted) setState(() => _loadFailed = true);
    }
  }

  @override
  void didUpdateWidget(RiveMascotWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mood != widget.mood) {
      _syncMood();
    }
  }

  void _syncMood() {
    final input = _moodInput;
    if (input == null) return;
    input.value = _moodToNumber(widget.mood ?? MascotMood.idle);
  }

  double _moodToNumber(MascotMood mood) {
    switch (mood) {
      case MascotMood.idle:
        return 0;
      case MascotMood.happy:
        return 1;
      case MascotMood.thinking:
        return 2;
      case MascotMood.sad:
        return 3;
      case MascotMood.celebrate:
        return 4;
      case MascotMood.curious:
        return 5;
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 加载失败时降级为 CustomPainter 实现
    if (_loadFailed) {
      return MascotWidget(
        size: widget.size,
        onTap: widget.onTap,
      );
    }

    // 加载中
    final artboard = _artboard;
    if (artboard == null) {
      return SizedBox(
        width: widget.size,
        height: widget.size,
      );
    }

    // Rive 动画渲染
    Widget riveWidget = SizedBox(
      width: widget.size,
      height: widget.size,
      child: Rive(artboard: artboard),
    );

    if (widget.enableTapInteraction && widget.onTap != null) {
      riveWidget = GestureDetector(
        onTap: widget.onTap,
        child: riveWidget,
      );
    }

    return riveWidget;
  }
}

