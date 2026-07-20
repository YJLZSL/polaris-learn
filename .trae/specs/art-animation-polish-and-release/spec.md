# 美术与动画全面优化及发布 Spec

## Why

灵犀学院项目视觉与动画已具备基础框架，但距离"灵动丝滑"的品质标准仍有差距：
1. **吉祥物绘制较为扁平**：`_MascotPainter` 使用纯实色填充，缺少渐变与柔和阴影，6 种情绪状态的差异化不够明显
2. **页面视觉层次不一致**：首页/学习路径/对话页的卡片间距、图标风格、视觉权重未统一
3. **动画存在 jank 风险**：`SpringMotion` 6 档弹簧参数未对齐 Material Motion 3 规范，部分页面过渡缺少共享元素动画
4. **主题系统暗色模式有缺陷**：`LingxiGradients` 只有 `light` 实例，暗色模式下渐变回退到亮色，色值偏差明显
5. **未发布过 GitHub Release**：项目尚未通过 GitHub Release 流程对外发布版本

本 spec 旨在系统性提升视觉与动画品质，并最终通过 `trae-remote-official:github` 插件创建 GitHub Release。

## What Changes

### 阶段一：主题与配色系统加固（基础，其他阶段依赖）
- **BREAKING**（仅内部）：`LingxiGradients` 新增 `dark` 实例，所有暗色模式渐变使用深色调适配
- `LingxiColors` 校准 6 个语义色的暗色模式色值，确保 WCAG AA 对比度（≥4.5:1）
- `LingxiElevations` 统一应用到所有 `LingxiCard`，确保阴影层级一致
- 新增 `LingxiShadows`（或扩展 `LingxiElevations`）定义 3 档语义阴影（subtle / elevated / highlighted）

### 阶段二：吉祥物视觉升级
- `_MascotPainter` 矢量绘制精细化：
  - 身体填充改为径向渐变（`mascotPrimary` → 深紫），增加立体感
  - 角部添加高光反射
  - 眼睛添加瞳孔高光点
  - `celebrate` 状态：星光粒子从中心向外辐射，带轨迹拖尾
  - `thinking` 状态：问号图标轻微浮动呼吸
  - `sad` 状态：泪滴沿脸颊滑落动画（配合 `RepaintBoundary` 隔离）
  - `curious` 状态：放大镜边缘添加光泽反射
- `_AuraGlow` 光环优化：使用 `LingxiGradients.mascotHero` 渐变，添加缓慢呼吸脉动（4 秒周期）

### 阶段三：页面视觉层次优化
- **首页**：hero 区视觉权重调整（问候语字号梯度、吉祥物尺寸与位置）；快捷入口图标统一为圆角方形 + 语义色背景
- **学习路径**：课程卡片增加级别色条（L0-L4 各一色）；进度条改用 `LingxiGradients.success` 渐变；连接线添加流光动画
- **对话页**：消息气泡圆角统一（user: 右下小圆角，assistant: 左下小圆角）；流式脉冲指示器改用三段式波浪动画
- **课时页**：知识点卡片间距从 12 调整为 16；测验组件正确反馈用 `LingxiGradients.success`，错误反馈用 `misconceptionRed` 渐变

### 阶段四：动画流畅度优化
- 审计 `SpringMotion` 6 档弹簧参数，对齐 Material Motion 3 的 spatial / temporal 量化标准
- `ChatController` 流式响应节流从 50ms 优化为动态节流（首 token 立即刷新，后续 50ms 节流，最后强制刷新）
- 为 `LearningPathPage` 课程卡片入场添加 `staggered` 交错动画（每卡片延迟 50ms）
- 为 `LessonPage` 知识点切换添加水平滑动 + 淡入过渡（`PageView` 配合 `SpringMotion.slideFadeTransition`）
- 验证所有动画在 `reduceMotion`（`MediaQuery.disableAnimations`）时正确降级为即时切换
- 审计所有 `AnimationController` 的 `vsync` 引用，确保无泄漏

### 阶段五：测试与静态验证
- **本机 Flutter SDK 不可用**（路径 `C:\Users\23501\AppData\Local\Temp\flutter\bin\flutter.bat` 不存在），无法运行 `flutter analyze` / `flutter test` / `flutter build`
- 替代验证方案：
  - 使用 Grep 全仓库扫描潜在问题（如 `vsync: this` 缺失、`dispose()` 未调用）
  - 代码审查所有动画相关文件的 `RepaintBoundary` 使用
  - 静态审查 `SpringMotion` 参数符合 Material 3 规范
  - 审查 `_MascotPainter` 的 `shouldRepaint` 实现避免过度重绘
- 如用户能在另一台机器运行 Flutter，建议运行 `flutter analyze && flutter test` 做最终确认

### 阶段六：文档同步与 GitHub Release
- 同步更新 `AGENTS.md`：主题章节新增 `LingxiGradients.dark`、`LingxiShadows`；已知技术债移除已清理项
- 同步更新 `docs/代码百科.md`：主题模块描述、吉祥物模块描述
- 使用 `trae-remote-official:github` 插件创建 GitHub Release：
  - 版本号：`v0.2.0`（从当前 `kAppVersion='0.1.0'` 升级，反映美术与动画大改）
  - 同步更新 `lib/core/constants/app_constants.dart` 中 `kAppVersion`
  - Release notes：中文，总结本次美术与动画优化要点
  - **注意**：因 Flutter SDK 不可用，**不附带构建产物**（APK/Windows/macOS），仅源代码 Release
  - 需用户授权 GitHub 插件访问权限

## Impact

- **Affected specs**: 
  - `build-lingxi-academy`（视觉规范部分需同步）
  - `comprehensive-optimization-cleanup`（已完成，无影响）
- **Affected code**:
  - `lib/core/theme/lingxi_colors.dart`（暗色色值校准）
  - `lib/core/theme/lingxi_gradients.dart`（新增 dark 实例）
  - `lib/core/theme/lingxi_elevations.dart`（新增语义阴影）
  - `lib/core/theme/app_theme.dart`（注册新扩展）
  - `lib/core/motion/spring_motion.dart`（参数对齐 M3）
  - `lib/features/mascot/mascot_widget.dart`（_MascotPainter 精细化 + _AuraGlow 优化）
  - `lib/features/home/home_page.dart`（视觉层次）
  - `lib/features/learning/learning_path_page.dart`（卡片动画 + 色条）
  - `lib/features/learning/lesson_page.dart`（PageView 过渡）
  - `lib/features/learning/widgets/quiz_widget.dart`（色彩反馈）
  - `lib/features/chat/chat_page.dart`（气泡 + 流式指示器）
  - `lib/features/chat/chat_controller.dart`（动态节流）
  - `lib/shared/widgets/lingxi_card.dart`（阴影统一）
  - `lib/core/constants/app_constants.dart`（版本号升级）
- **Affected docs**: `AGENTS.md`、`docs/代码百科.md`
- **Risk**: 
  - 视觉变更可能影响现有 Widget 测试快照（本机无法运行测试验证）
  - `_MascotPainter` 精细化可能增加单帧绘制成本，需确保 `shouldRepaint` 正确
  - GitHub Release 需用户授权，且无构建产物可能不符合用户预期

## ADDED Requirements

### Requirement: LingxiGradients 暗色模式支持

`LingxiGradients` SHALL 提供 `dark` 静态实例，所有渐变在暗色模式下使用深色调适配，确保与暗色背景的视觉协调。

#### Scenario: 暗色模式渐变
- **WHEN** 应用处于暗色模式
- **THEN** `context.lingxiGradients` 返回 `LingxiGradients.dark` 实例
- **AND** `mascotHero` 渐变使用更深的紫色（如 `0x1F9D7CFF`）
- **AND** `streakFire` / `achievementGold` / `celebration` 等渐变在暗色背景下保持视觉辨识度

### Requirement: 吉祥物情绪状态视觉差异化

`_MascotPainter` SHALL 为 6 种 `MascotMood` 状态提供视觉差异明显的绘制：
- `idle`：基础待机，轻微眨眼
- `happy`：微笑 + 腮红 + 上扬眉
- `thinking`：托腮姿态 + 浮动问号
- `sad`：低头 + 滑落泪滴
- `celebrate`：星光粒子辐射 + 毕业帽微弹
- `curious`：歪头 + 放大镜光泽

#### Scenario: 情绪切换
- **WHEN** `MascotController.setMood(MascotMood.celebrate)` 被调用
- **THEN** `_MascotPainter` 绘制星光粒子从中心向外辐射，带轨迹拖尾
- **AND** 毕业帽轻微弹跳
- **AND** `shouldRepaint` 返回 `true` 仅在 mood 或关键字段变化时

### Requirement: 动画 60fps 性能保证

所有 UI 动画 SHALL 在 60fps 下运行，关键路径包括：
- 页面过渡（GoRouter + ShellRoute）
- 列表入场（staggered）
- 流式响应增量渲染
- 吉祥物情绪切换
- 按钮/卡片按压反馈

#### Scenario: 动画性能
- **WHEN** 用户在首页/学习路径/对话页之间切换
- **THEN** 页面过渡动画以 60fps 运行（无丢帧）
- **AND** `PerformanceOverlay` 不出现红色条
- **AND** `reduceMotion` 为 true 时，所有动画降级为即时切换

### Requirement: GitHub Release 发布流程

项目 SHALL 通过 `trae-remote-official:github` 插件创建 `v0.2.0` GitHub Release，包含中文 Release notes。

#### Scenario: 创建 Release
- **WHEN** 所有视觉与动画优化完成
- **THEN** 使用 github 插件创建 `v0.2.0` Release
- **AND** Release notes 包含本次优化的 4 大方向总结
- **AND** 因 Flutter SDK 不可用，不附带构建产物（仅源代码 Release）

## MODIFIED Requirements

### Requirement: LingxiColors 暗色模式对比度

`LingxiColors.dark` 实例的所有语义色 SHALL 在暗色背景下满足 WCAG AA 对比度标准（≥4.5:1），当前 `achievementGold` 与 `streakFire` 在暗色背景下对比度偏低。

### Requirement: SpringMotion 弹簧参数对齐 Material 3

`SpringMotion` 的 6 档弹簧规格 SHALL 对齐 Material Motion 3 的空间与时间量化标准：
- `microSpeed`：duration ≤ 100ms
- `fastSpeed`：duration ≤ 150ms
- `defaultSpeed`：duration ≤ 200ms
- `gentleSpeed`：duration ≤ 250ms
- `slowSpeed`：duration ≤ 300ms
- `bouncySpeed`：允许超调，duration ≤ 350ms

### Requirement: ChatController 流式响应节流

`ChatController._flush` SHALL 采用动态节流策略：
- 首 token 立即刷新（确保流式响应即时可见）
- 后续增量 50ms 节流（避免高频 setState）
- 流式结束时强制刷新（确保最终内容完整）

## REMOVED Requirements

### Requirement: LingxiGradients 仅 light 实例

**Reason**: 暗色模式下渐变回退到亮色实例导致视觉不协调。
**Migration**: 新增 `LingxiGradients.dark` 静态实例，`app_theme.dart` 的 `darkTheme` 注册 dark 实例。

### Requirement: kAppVersion = '0.1.0'

**Reason**: 本次美术与动画大改需版本号升级以反映变更。
**Migration**: `kAppVersion` 升级为 `'0.2.0'`，GitHub Release 标签为 `v0.2.0`。
