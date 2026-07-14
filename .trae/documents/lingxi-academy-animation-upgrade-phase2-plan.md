# 灵犀学院动画升级计划 — 第二阶段（Onboarding + Help）

## 摘要

本计划覆盖剩余两个页面模块的动画升级：
1. **Onboarding 页面**：`onboarding_page.dart`（主引导页）+ `api_setup_wizard_page.dart`（API 配置向导）
2. **Help 页面**：`help_center_page.dart`（帮助中心）

所有动画遵循已有模式（SpringMotion / AnimationUtils / LingxiCard / LingxiButton），尊重 reduceMotion 无障碍设置，不引入新依赖，保留全部中文文案与业务逻辑。

---

## 现状分析

### 1. onboarding_page.dart

**当前已有动画**：
- PageView 使用 `SpringMotion.defaultDuration` + `defaultCurve` 切换页面
- 步骤视图内吉祥物和文字内容使用 `SpringMotion.springTransition` 做入场
- 页面指示器使用 `AnimatedContainer` 做宽度/颜色过渡

**问题**：
- `springTransition` 在 PageView 中仅在初次构建时播放一次，页面切换时不会重新触发（因为 PageView 保留已构建页面状态）。需要通过 `ValueKey` 或监听页面变化来重新触发入场动画。
- 吉祥物缺少呼吸脉动效果（要求：Mascot breathing pulse）。
- 最后一步"开始学习"按钮缺少脉冲提示（要求：Next button pulse on last step）。
- 进度指示器虽然已有动画，但可以用更平滑的弹簧曲线增强。
- 顶部"跳过"按钮和底部"上一步"按钮缺少按压反馈。

### 2. api_setup_wizard_page.dart

**当前状态**：
- 纯 StatelessWidget，无任何动画
- 使用 `LingxiCard` 但未启用 `animateEntrance`
- 步骤序号圆圈和连接线无动画
- "立即配置"按钮无特殊效果
- AppBar 是默认 AppBar，不是 LingxiAppBar

**需要添加**：
- 卡片交错入场动画
- 步骤项交错出现
- 按钮按压反馈
- FAB 弹簧入场（虽然此页无 FAB，但卡片内"立即配置"按钮可加脉冲效果）

### 3. help_center_page.dart

**当前状态**：
- 使用 `Card` + `ExpansionTile`（Material 自带），不是 LingxiCard
- 展开/收起依赖 ExpansionTile 内置动画，但使用默认 ClipRect 裁切，不够流畅
- 列表项无入场动画
- FAB（反馈按钮）无入场动画
- AppBar 是默认 AppBar

**需要添加**：
- FAQ 卡片使用 LingxiCard 并启用 animateEntrance 交错入场
- 使用 AnimatedSize 包裹展开内容实现平滑展开/收起（替代或增强 ExpansionTile 默认行为）
- 展开图标使用 AnimatedRotation 做旋转动画
- FAB 弹簧缩放入场
- 替换为 LingxiAppBar 保持一致

---

## 实施方案

### 文件 1：`lib/features/onboarding/onboarding_page.dart`

**改动要点**：

1. **步骤内容切换动画重制**：
   - 问题根源：PageView 的子组件在首次构建后保持状态，`springTransition` 的 AnimationController 只在 initState 时 forward 一次。
   - 解决方案：给 `_OnboardingStepView` 添加 `ValueKey(ValueKey('step_$index'))`，并将其改为 StatefulWidget，在 `didUpdateWidget` 中检测 step 变化时重新触发动画控制器。
   - 动画参数：slide + fade，beginOffset: `Offset(0, 24)`（从下方滑入），duration: 300ms，curve: easeOutCubic，beginScale: 1.0（仅做位移+淡入，不做缩放，避免与 PageView 自身的滑动冲突）。

2. **吉祥物呼吸脉动**：
   - 在 MascotWidget 外层包裹 `SpringMotion.pulseBreathing(minScale: 0.97, maxScale: 1.03, period: Duration(seconds: 3))`。
   - 确保 reduceMotion 下自动降级。

3. **最后一步 CTA 脉冲**：
   - 当 `_currentPage == steps.length - 1`（最后一步）时，将 CTA 按钮（"开始学习"）包裹在 `SpringMotion.pulseBreathing(minScale: 0.97, maxScale: 1.03, period: Duration(seconds: 2))` 中，引导用户点击。

4. **进度指示器增强**：
   - 保留现有 AnimatedContainer 实现，但将指示器容器添加 `SpringMotion.scalePressFeedback` 包裹以支持点击跳转到对应步骤（增强交互性），或至少确保动画曲线使用弹簧。
   - 当前实现已满足"平滑过渡"要求，只需微调时长和曲线与弹簧系统一致即可。

5. **按钮按压反馈**：
   - "跳过"和"上一步"按钮包裹 `SpringMotion.scalePressFeedback(enableHaptic: true)`。

6. **实现细节**：
   - 将 `_OnboardingStepView` 从 StatelessWidget 改为 StatefulWidget，使用 SingleTickerProviderStateMixin。
   - 在 State 中创建 AnimationController，在 initState 和 didUpdateWidget（当 step 变化时）中 forward 动画。
   - 使用 FadeTransition + SlideTransition 实现组合动画（避免与 springTransition 内部的 Scale 叠加导致 PageView 滑动时抖动）。

### 文件 2：`lib/features/onboarding/api_setup_wizard_page.dart`

**改动要点**：

1. **引入动画工具**：添加 `import` 语句引入 `spring_motion.dart`、`animation_utils.dart`、`lingxi_app_bar.dart`。

2. **替换 AppBar**：将默认 `AppBar` 替换为 `LingxiAppBar`。

3. **教程卡片交错入场**：
   - 将 `_ProviderTutorialCard` 改为 StatefulWidget（或在 LingxiCard 上使用 animateEntrance + entranceDelay）。
   - 由于 LingxiCard 已支持 animateEntrance 和 entranceDelay，直接在 LingxiCard 上设置：
     - `animateEntrance: true`
     - `entranceDelay: Duration(milliseconds: 60 * index)`
   - 在 ListView.builder 中传入 index 给卡片。

4. **步骤项交错入场**：
   - 在 `_StepItem` 中添加动画入场效果：每个步骤项在卡片内使用 `SpringMotion.slideFadeTransition`，delay 根据步骤索引递增。
   - 由于卡片本身有入场延迟，步骤项的延迟相对于卡片入场完成后再开始（例如每步 50ms 间隔）。
   - 实现方式：将 _StepItem 改为 StatefulWidget，接收一个 `entranceDelay` 参数，在 initState 中延迟启动动画控制器。
   - 或更简单地：使用 `Future.delayed` 后改变可见性状态，但这会导致状态管理复杂。更好的方式是使用 `AnimatedBuilder` 配合 Interval，在 _ProviderTutorialCard 的 State 中用一个 AnimationController 驱动所有步骤项的交错动画。

5. **"立即配置"按钮效果**：
   - 保持使用 LingxiButton（已内置按压动画），添加 `SpringMotion.hoverLift` 包裹（桌面端悬浮效果）。

6. **Provider 图标容器动画**：
   - 图标 CircleAvatar 可以在入场时使用 `SpringMotion.springTransition(beginScale: 0.5)` 做一个弹出效果。

### 文件 3：`lib/features/help/help_center_page.dart`

**改动要点**：

1. **引入动画工具**：添加 `import` 语句引入 `spring_motion.dart`、`animation_utils.dart`、`lingxi_app_bar.dart`、`lingxi_card.dart`。

2. **替换 AppBar**：将默认 `AppBar` 替换为 `LingxiAppBar`。

3. **重构 _HelpCategoryCard**：
   - 从使用 `Card` + `ExpansionTile` 改为使用 `LingxiCard`（animateEntrance: true）+ 自定义展开逻辑。
   - 具体做法：
     - 外层使用 LingxiCard(animateEntrance: true, entranceDelay: Duration(milliseconds: 40 * index))，需要将 index 传入。
     - 卡片内部使用 InkWell（或 GestureDetector）处理点击切换展开状态。
     - 展开图标使用 `AnimatedRotation(duration: fastDuration, turns: _expanded ? 0.5 : 0)` 做旋转动画。
     - 展开内容区域使用 `AnimatedSize(duration: defaultDuration, curve: defaultCurve, child: _expanded ? Padding(...) : SizedBox.shrink())` 实现平滑展开/收起。
     - 包裹 `SpringMotion.scalePressFeedback(enableHaptic: true)` 提供按压反馈。

4. **FAQ 列表项交错入场**：
   - 通过给每个 LingxiCard 设置 entranceDelay: Duration(milliseconds: 40 * index) 实现。
   - 需要将 _HelpCategoryCard 改为接收 index 参数。
   - 由于是在 ListView.builder 中，可以直接传入 index。

5. **FAB 弹簧入场**：
   - 将 FloatingActionButton.extended 包裹在 `SpringMotion.springTransition(beginScale: 0.0, duration: SpringMotion.bouncyDuration, curve: SpringMotion.bouncyCurve)` 中，实现弹出效果。
   - 包裹 `SpringMotion.scalePressFeedback` 和 `SpringMotion.hoverLift`。
   - 注意：FAB 的 springTransition 需要用 `SpringIn` 或类似方式延迟到列表入场后再出现。可使用 Future.delayed 延迟启动，或直接依赖 build 顺序自然延迟。最简单方式是使用 springTransition 并添加一个短暂延迟。

6. **分类图标容器**：
   - 图标容器在入场时可以加 springTransition 弹出效果，但通过 LingxiCard 整体入场即可，无需单独处理。

7. **反馈对话框**：
   - 保持现有逻辑不变，对话框本身的 Material 动画已由框架提供。

---

## 关键技术决策

| 决策 | 理由 |
|------|------|
| Onboarding 步骤切换使用 FadeTransition + SlideTransition（不做 Scale） | PageView 自身已有滑动过渡，叠加缩放在快速滑动时会产生视觉抖动；slide+fade 更干净 |
| Onboarding 步骤视图改为 StatefulWidget | 需要在 didUpdateWidget 中监听 step 变化来重新触发动画，StatelessWidget 无法做到 |
| API 向导步骤项使用卡片级 AnimationController + Interval | 相比每个步骤项各一个 AnimationController，统一由卡片的 controller 驱动更省资源且同步性更好 |
| Help 页面用 LingxiCard + 自定义展开替代 Card + ExpansionTile | 统一视觉风格（圆角、颜色、阴影），LingxiCard 内置 animateEntrance 支持；AnimatedSize 比 ExpansionTile 默认的 ClipRect 动画更平滑 |
| 所有动画均检查 reduceMotion | 遵循无障碍规范，SpringMotion 工具已内置，自定义 AnimationController 需手动检查 |
| 不引入新依赖 | 所有动画使用 Flutter 内置（AnimatedSize/AnimatedRotation/AnimatedBuilder）和已有的 SpringMotion/AnimationUtils 工具 |

---

## 验证步骤

1. 在每个文件修改后，运行 `flutter analyze` 确保零错误、零警告。
2. 热重载/重启应用，逐一验证：
   - **Onboarding**：
     - 首次进入时吉祥物有呼吸脉动
     - 每步切换时文字内容从下方淡入滑入（300ms，easeOutCubic）
     - 页面指示器圆点平滑伸缩变色
     - 最后一步"开始学习"按钮有轻柔脉冲
     - "跳过"和"上一步"按钮有按压缩放反馈
   - **API 配置向导**：
     - 教程卡片交错弹入（每张间隔约 60ms）
     - 步骤序号和文字在卡片内依次出现
     - LingxiAppBar 替换默认 AppBar
   - **Help**：
     - FAQ 卡片交错入场（每张间隔约 40ms）
     - 点击卡片标题区域，内容区域通过 AnimatedSize 平滑展开/收起
     - 展开箭头图标旋转 180 度
     - FAB 弹簧弹出
     - 点击时有按压反馈和触觉
3. 在系统设置中开启"减少动画"（Android: 设置→辅助功能→移除动画；Windows: 设置→轻松使用→显示→在 Windows 中显示动画），验证所有动画自动降级为无动画/简单淡入。
4. 确认所有中文文案、路由跳转、Provider 逻辑未被修改。
