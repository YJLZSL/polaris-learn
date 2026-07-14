/// 吉祥物"小犀"的情绪状态枚举。
///
/// 6 种情绪对应不同的表情与动画：
/// - [idle]：待机，眨眼 + 轻微摇摆
/// - [happy]：开心，跳跃 + 微笑
/// - [thinking]：思考，托腮 + 头顶问号
/// - [sad]：难过，低头 + 泪滴
/// - [celebrate]：庆祝，欢呼 + 星星
/// - [curious]：好奇，歪头 + 放大镜
enum MascotMood {
  /// 待机：眨眼、轻微摇摆
  idle,

  /// 开心：跳跃、微笑
  happy,

  /// 思考：托腮、头顶问号
  thinking,

  /// 难过：低头、泪滴
  sad,

  /// 庆祝：欢呼、星星
  celebrate,

  /// 好奇：歪头、放大镜
  curious,
}

/// 吉祥物状态快照。
///
/// 不可变值对象，通过 [copyWith] 派生新状态。
class MascotState {
  const MascotState({
    this.mood = MascotMood.idle,
    this.isAnimating = false,
    this.tapCount = 0,
  });

  /// 当前情绪
  final MascotMood mood;

  /// 是否正在播放动画
  final bool isAnimating;

  /// 点击计数，用于彩蛋检测（连续点击 5 次触发庆祝彩蛋）
  final int tapCount;

  /// 派生一份新状态。
  MascotState copyWith({
    MascotMood? mood,
    bool? isAnimating,
    int? tapCount,
  }) {
    return MascotState(
      mood: mood ?? this.mood,
      isAnimating: isAnimating ?? this.isAnimating,
      tapCount: tapCount ?? this.tapCount,
    );
  }
}
