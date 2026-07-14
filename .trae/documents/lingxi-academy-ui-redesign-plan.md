# 灵犀学院前端 UI 动画重设计计划

## 概要

本计划对灵犀学院（Flutter 学习平台）进行全面的 UI 动画重设计。核心设计哲学：**"润物细无声的小惊喜"**。动画增强操作反馈、引导注意力流向、强化情绪价值，但严格控制在"有趣而不夺人眼球"的尺度内，避免分散学习注意力。

设计原则：
- 所有动画时长控制在 100-800ms 区间，避免拖沓
- 循环动画周期 ≥2s、幅度 ≤3%，不抢内容风头
- 粒子/庆祝动画 2 秒内自动消失，不阻断操作
- 严格支持 `disableAnimations` 无障碍降级
- 不引入新依赖，全部使用 Flutter 内置 API 实现
- 遵循 Material 3 Expressive 弹簧物理动效语言

---

## 现状分析

### 已有基础
- **主题系统**：Material 3 + 紫色种子色 (#6750A4)、Noto Sans SC + Quicksand 字体、`LingxiColors` 6 色语义扩展、`ShapeVariants` 35 种形状枚举（已定义但未统一使用）
- **动效工具**：`SpringMotion` 有 3 组弹簧参数和一个基础 `springTransition`
- **共享组件**：LingxiCard（无动画）、LingxiButton（无按压反馈）、LingxiBadge（静态）、LingxiChip（基础）、EmptyStateWidget（仅入场）
- **吉祥物**：CustomPainter 绘制的"小犀"犀牛，6 种情绪，点击彩蛋，RiveMascotWidget 占位
- **页面骨架**：首页/学习路径/课程/对话/笔记/成就/统计/设置/引导/帮助共 10+ 页面
- **导航**：ShellRoute + NavigationRail/NavigationBar 响应式切换

### 动画缺口
1. 无自定义页面转场动画（仅默认 Material 过渡）
2. 按钮/卡片无按压弹性反馈、无桌面 hover 悬浮效果
3. 列表项无交错入场动画
4. 无骨架屏/微光加载态（全部用 CircularProgressIndicator）
5. 无数字滚动/翻牌动画
6. 庆祝场景无粒子/撒花效果
7. 进度条无平滑弹簧填充动画
8. 吉祥物情绪切换无平滑过渡、眨眼频率低、小尺寸拥挤
9. 导航栏选中指示器无弹性滑动动画
10. 测验答题无正确/错误动画反馈
11. 无呼吸脉动引导动画
12. 主题切换无平滑过渡
13. ShapeVariants 定义了但组件中大量硬编码圆角
14. AppBar 无滚动联动效果

---

## 提议变更

### 第一阶段：动效基础系统

#### 1. 扩展 SpringMotion
**修改**：`lib/core/motion/spring_motion.dart`

新增弹簧规格：
- `microSpeed`（stiffness=300, damping=22, 100ms）：按钮按压、图标切换
- `gentleSpeed`（stiffness=80, damping=14, 350ms）：卡片悬浮、元素入场
- `bouncySpeed`（stiffness=150, damping=10, 600ms）：庆祝、成就解锁弹性回弹

新增曲线集：`entranceCurve`、`exitCurve`、`emphasizedDecelerate`、`bouncyCurve`

新增过渡组件：
- `staggeredList()`：列表交错入场，每项延迟 50ms
- `pulseBreathing()`：呼吸脉动（scale 0.97↔1.03，3s 周期），用于 CTA 按钮
- `shimmerLoading()`：骨架屏微光扫过
- `animatedNumber()` / `AnimatedCountText`：数字滚动动画（0→N）
- `slideFadeTransition()`：方向滑入+淡入
- `scalePressFeedback()`：按下 scale 0.96→1.0 弹性回弹
- `hoverLift()`：桌面端 hover 时 elevation + scale 1.015
- `shimmerGlow()`：流光扫过（Streak 火焰徽章等）
- `confettiBurst()`：粒子喷发（CustomPainter 绘制，不引入依赖）
- `sparkleRing()`：光环扩散（成就解锁、正确反馈）

所有组件内部检测 `MediaQuery.disableAnimations` 并降级。

#### 2. 新建页面转场
**新建**：`lib/core/motion/page_transitions.dart`

为 GoRouter 提供三种统一转场：
- `buildPage`：淡入 + 上移 12px + 弹性缩放 0.98→1.0（主转场）
- `buildSlidePage`：右滑入（对话子页面）
- `buildModalPage`：底部滑入（笔记编辑器等全屏模态）

**修改**：`lib/core/router/app_router.dart`
- 所有 GoRoute 从默认 `builder` 改为 `pageBuilder` 使用自定义转场
- 对话子页面用 `buildSlidePage`，笔记编辑器用 `buildModalPage`

#### 3. 新建动画工具类
**新建**：`lib/core/motion/animation_utils.dart`

包含：交错 Interval 计算器、触觉反馈包装（hapticLight/Medium/Success/Error）、reduceMotion 检测方法。

---

### 第二阶段：共享组件动画升级

#### 4. LingxiButton 升级
**修改**：`lib/shared/widgets/lingxi_button.dart`

改造为 StatefulWidget：
- 按压弹性反馈（scale 0.96→1.0，fastSpeed 弹簧）
- 新增 `tonal`（FilledButton.tonal）和 `outlined` 变体
- 新增 `isLoading` 参数，显示 20px 进度指示器
- 新增 `pulse` 参数，CTA 按钮呼吸脉动
- 圆角统一升级为 `ShapeVariants.roundedLarge`（16px）
- 点击时 `HapticFeedback.lightImpact()`

#### 5. LingxiCard 升级
**修改**：`lib/shared/widgets/lingxi_card.dart`

改造为 StatefulWidget：
- 桌面 `MouseRegion` hover 效果：elevation 0→level1 + scale 1.0→1.015（150ms）
- 按压 scale 0.98→1.0 弹性回弹
- `animateEntrance` + `entranceDelay` 参数支持 staggered 入场
- `backgroundGradient` + `glassEffect`（BackdropFilter 毛玻璃）可选参数
- `LingxiCardVariant` 枚举（default/primary/secondary/glass）
- 圆角统一 `ShapeVariants.roundedLarge`

#### 6. LingxiBadge 升级
**修改**：`lib/shared/widgets/lingxi_badge.dart`

- `newlyUnlocked` 参数：scale 0→1.2→1.0 bouncy 入场 + SparkleRing 光环 + 金色 shimmerGlow
- 未解锁徽章外圈进度圆弧动画
- 已解锁徽章金色光晕呼吸脉动
- 新增 `octagon` 形状变体
- 添加 InkResponse 水波纹

#### 7. LingxiChip 升级
**修改**：`lib/shared/widgets/lingxi_chip.dart`

- 选中/取消时 scale 0.9→1.05→1.0 弹簧动画
- 新增 `color` 参数自定义颜色
- 圆角升级为 `ShapeVariants.roundedMedium`（12px）
- onDeleted 触发缩小淡出动画

#### 8. 新建动画进度条
**新建**：`lib/shared/widgets/animated_progress_bar.dart`

- 值变化时弹簧动画平滑过渡（非跳变）
- 可选渐变填充色（火焰渐变、金色渐变等）
- 进度更新末端脉冲光点
- 支持 indeterminate 流光动画
- 用于替换全项目 `LinearProgressIndicator`

#### 9. 新建骨架屏组件
**新建**：`lib/shared/widgets/shimmer_loading.dart`

- `ShimmerLoading`：通用微光扫过容器
- `ShimmerCard`/`ShimmerListItem`/`ShimmerChatBubble`：预设骨架
- 替换所有页面级 `CircularProgressIndicator`

#### 10. 新建庆祝粒子组件
**新建**：`lib/shared/widgets/celebration_overlay.dart`
**新建**：`lib/shared/widgets/particles/particle_painter.dart`

- `CelebrationOverlay`：粒子撒花覆盖层，支持 confetti/sparkles/firework 三种类型
- `ParticlePainter`：CustomPainter 绘制五角星/矩形纸屑/小圆点粒子，含重力+阻力+自转物理
- `SuccessCheckmark`：绿勾圆圈绘制动画（500ms）
- `ErrorCross`：红叉 + 水平 shake 动画
- 粒子数量上限 30 粒，2 秒自动淡出

#### 11. 新建毛玻璃容器
**新建**：`lib/shared/widgets/glass_container.dart`

- `BackdropFilter` + 半透明背景实现
- 用于滚动 AppBar、Dialog 背景、MascotOverlay 气泡

#### 12. 新建成就解锁弹窗
**新建**：`lib/shared/widgets/achievement_unlock_dialog.dart`

- 半透明遮罩淡入 + 徽章 bouncy 弹入 + firework 粒子
- 吉祥物 celebrate 联动
- 延迟 800ms 出现 CTA 按钮

#### 13. LingxiAppBar 升级
**修改**：`lib/shared/widgets/lingxi_app_bar.dart`

- 滚动联动：滚动 >4px 时渐变添加 surfaceContainerLow 背景 + 底部分割线
- leading/title/actions staggered 入场（每项 30ms 延迟）
- `backgroundGradient` 可选参数

#### 14. EmptyStateWidget 升级
**修改**：`lib/shared/widgets/empty_state_widget.dart`

- 吉祥物后方圆形渐变光晕 + 呼吸脉动
- CTA 按钮 pulseBreathing
- 3-5 颗 twinkling 小星星装饰

#### 15. MisconceptionSticker 升级
**修改**：`lib/shared/widgets/misconception_sticker.dart`

- 入场时红色边条从 0 宽度展开 + 内容淡入
- warning 图标 2° 左右微摇（4s 周期）

---

### 第三阶段：导航与全局层升级

#### 16. 导航动画升级
**修改**：`lib/core/router/app_router.dart`（_AppShell 部分）

- 选中指示器 `AnimatedPositioned` 弹性滑动 + 到达时 overshoot（scale 1.05→1.0）
- 图标 outlined→filled 使用 `AnimatedSwitcher` + scale 过渡
- 选中项文字 fontWeight regular→medium 平滑过渡，颜色渐变
- NavigationRail 背景添加极淡 primary 渐变
- 响应式断点从 840 统一为 1024
- 内容区使用 `AnimatedSwitcher` 配合页面转场

#### 17. 全局庆祝服务
**新建**：`lib/features/progress/celebration_service.dart`

- StreamController 广播 `CelebrationEvent`
- 跨页面触发撒花（成就解锁等场景）

**修改**：`lib/app.dart`
- 在 ShellRoute 外层包裹全局 `CelebrationOverlay` 监听 celebrationService
- 包裹 `AnimatedTheme` 支持主题切换 500ms 平滑过渡

#### 18. 主题与视觉润色
**新建**：`lib/core/theme/lingxi_gradients.dart`
**新建**：`lib/core/theme/lingxi_elevations.dart`

- `LingxiGradients` ThemeExtension：mascotHero/streakFire/achievementGold/primarySurface/celebration 语义化渐变
- `LingxiElevations`：5 级阴影系统（level0-level4）

**修改**：`lib/core/theme/app_theme.dart`
- 注册 LingxiGradients extension
- Card 添加 surfaceTintColor 增加色彩层次
- Dialog 圆角升级为 `ShapeVariants.roundedExtraLarge`（28px）

**修改**：`lib/core/theme/lingxi_colors.dart`
- 微调颜色确保对比度与渐变协调

#### 19. ShapeVariants 统一落地
**全局替换**：将各组件中硬编码的 `BorderRadius.circular(x)` 替换为 `ShapeVariants.xxx.borderRadius`

| 硬编码值 | 替换为 | 应用场景 |
|---------|--------|---------|
| 16px | `ShapeVariants.roundedLarge` | Card、Dialog、FAB、消息气泡 |
| 12px | `ShapeVariants.roundedLarge` | Button、Input（从 12 升级到 16） |
| 8px | `ShapeVariants.roundedMedium` | Chip、MisconceptionSticker（从 8 升级到 12） |
| 4px | `ShapeVariants.rectangleSmall` | ProgressBar、Shimmer |
| 胶囊 | `ShapeVariants.capsuleFull` | Streak 徽章、标签 |
| 20px→28px | `ShapeVariants.roundedExtraLarge` | Dialog |

---

### 第四阶段：逐页动画重设计

#### 20. 首页 HomePage
**修改**：`lib/features/home/home_page.dart`

- 页面入场序列（staggered）：吉祥物(0ms) → 问候语(100ms) → Streak 卡片(200ms) → 继续学习卡片(300ms) → 快捷入口网格(400-550ms)
- Streak 火焰图标：shimmerGlow 流光（2s 周期）+ streak≥3 放大 1.1x 微跳 + ≥7 天火星粒子上浮
- 天数数字用 `AnimatedCountText` 从 0 滚动
- 继续学习卡片进度条用 `AnimatedProgressBar`（渐变填充），按钮 pulse
- 快捷入口卡片 hover lift + 按压缩放
- 顶部极淡渐变光晕背景（mascotPrimary alpha 0.03）
- 首页布局从简单居中重构为功能卡片仪表盘（欢迎区+Streak+继续学习+快捷入口）

#### 21. 学习路径页 LearningPathPage
**修改**：`lib/features/learning/learning_path_page.dart`

- 路线节点从上到下 staggered 入场（每节点 100ms 延迟，spring 弹跳）
- 已完成节点：金色填充 + 对勾 spring 出现 + 金色光晕 pulse
- 进行中节点：主色填充 + 圆弧进度环动画 + pulseBreathing
- 已解锁节点：主色描边 + 上下 2px 浮动（3s 周期）
- 连接线：已完成段从起点到终点渐变绘制动画（400ms CustomPainter）
- 课程卡片 animateEntrance staggered，进度条 AnimatedProgressBar
- 顶部新增路径总览卡片：整体进度圆环 + "下一推荐课程" CTA(pulse)
- Loading 态替换为 ShimmerCard

#### 22. 课程页 LessonPage
**修改**：`lib/features/learning/lesson_page.dart`
**修改**：`lib/features/learning/widgets/quiz_widget.dart`
**修改**：`lib/features/learning/widgets/learning_card_widget.dart`

- PageView 切换曲线升级为 `easeInOutCubicEmphasized`（400ms），吉祥物 mood 跟随
- 底部进度条替换为 AnimatedProgressBar（弹簧填充 + 渐变 + 末端脉冲光点）
- 章节完成庆祝页：CelebrationOverlay(confetti, 24 粒) 从吉祥物位置喷发 + 标题 springTransition(scale 0.5) + 统计数字 AnimatedCountText + 按钮延迟 500ms 入场+pulse
- LearningCardWidget 入场序列：标题左滑入 → 主图区 spring → 卡片区 staggered
- QuizWidget 从 RadioListTile 改为自定义 LingxiCard 选项：
  - 选中：primaryContainer 背景 + 主色 2px 边框 + scale 0.98→1.0
  - 答对：success 绿色边框 + SuccessCheckmark + scale 1.0→1.05→1.0 bouncy
  - 答错：error 红色边框 + ErrorCross + 水平 shake
- 提交按钮全部作答后 pulse
- 结果面板 springTransition 高度展开（0→实际高度）
- SocraticEntry 页：celebration 图标从 0 弹到 64px（bouncy），按钮 staggered

#### 23. 对话页 ChatPage
**修改**：`lib/features/chat/chat_page.dart`

- 用户消息：springTransition（scale 0.95→1.0 + 从右侧 8px 滑入）
- AI 消息：springTransition（scale 0.95→1.0 + 从左侧 8px 滑入）
- 流式光标升级为渐变圆角竖线
- 新增 Typing Dots 指示器（AI 开始思考但未输出文字时，三点波浪跳动）
- 发送/停止按钮 `AnimatedSwitcher` 旋转过渡
- 苏格拉底开关开启时下方 socraticBlue 色条从左到右展开
- TextField 聚焦时边框渐变到 primary（150ms），发送按钮颜色渐变
- 保存为笔记成功时 SuccessCheckmark 出现 800ms
- 空对话状态使用升级后的 EmptyStateWidget

#### 24. 笔记页 NotesPage / NoteEditorPage
**修改**：`lib/features/notes/notes_page.dart`
**修改**：`lib/features/notes/note_editor_page.dart`

- 笔记列表 staggered 入场（每项 50ms）
- 卡片 hover lift + 按压缩放
- 保存成功 SuccessCheckmark + SnackBar slide 入
- FAB pulseBreathing（无笔记时），点击 scale 0.9→1.1→1.0
- 标签筛选 LingxiChip 选中弹性

#### 25. 成就页 AchievementsPage
**修改**：`lib/features/progress/achievements_page.dart`

- 统计数字 AnimatedCountText 从 0 滚动
- 总进度条 AnimatedProgressBar 弹簧填充
- 徽章网格 staggered 入场（左上到右下，每枚 40ms，beginScale 0.8）
- 新解锁徽章：CelebrationOverlay(sparkles) + scale 0→1.2→1.0 bouncy
- 已解锁徽章持续金色 shimmerGlow（3s 周期）+ 呼吸光晕
- 未解锁徽章外圈进度圆弧动画
- 徽章点击 scale 0.95→1.0，Dialog spring 缩放入场

#### 26. 统计页 StatisticsPage
**修改**：`lib/features/progress/statistics_page.dart`

- 4 个统计卡片 staggered 入场，数字 AnimatedCountText
- 柱状图柱体从 0 高度弹簧生长（800ms easeOutCubic，staggered 每柱 50ms）
- 热力图格子颜色依次从透明渐变到目标色
- 时间范围切换时数据 AnimatedBuilder 平滑插值

#### 27. 设置页 SettingsPage
**修改**：`lib/features/settings/settings_page.dart`

- 分组卡片 staggered 入场
- SegmentedButton thumb 弹性滑动
- Switch/滑块使用 fastSpeed 弹簧
- API 测试连接：按钮 loading → SuccessCheckmark/ErrorCross+shake
- 主题切换通过 AnimatedTheme 500ms 平滑过渡

#### 28. 引导页 OnboardingPage
**修改**：`lib/features/onboarding/onboarding_page.dart`

- 吉祥物情绪切换 200ms 交叉淡入（旧 mood 缩小 0.9 + 新 mood 从 1.1 弹入）
- 文字内容 slideFadeTransition（方向跟随翻页方向）
- 页面指示器当前页 pulse 效果
- "试试点我"CTA 点击后吉祥物 triggerTap + 按钮 scale 反馈
- "开始学习"按钮 pulseBreathing + rocket 图标上下漂浮（3px，2s 周期）

#### 29. 帮助页 HelpCenterPage
**修改**：`lib/features/help/help_center_page.dart`

- ExpansionTile 展开/收起使用 AnimatedSize（300ms easeOutCubic）+ 箭头 rotation
- 分类卡片 staggered springTransition
- 搜索框聚焦时边框颜色渐变 + 宽度微展

---

### 第五阶段：吉祥物动画增强

#### 30. MascotPainter 增强
**修改**：`lib/features/mascot/mascot_painter.dart`

- Mood 间插值过渡（500ms）：通过 moodProgress 参数在不同情绪间形变（眼睛、嘴巴平滑过渡）
- 眨眼改进：随机间隔 2-5 秒眨眼一次（Timer 驱动），150ms 闭合动画
- 翅膀扇动增强：happy/celebrate 时频率加快，羽尖微变形
- idle：角尖星光 twinkle 与呼吸同步
- happy：跳跃顶点额外 2 粒小星光
- thinking：问号旁 2-3 个思考气泡（小圆点浮动后消失）
- curious：放大镜镜片反光横扫（2s 周期）
- sad：双眼各一滴泪（错时下落）
- 小尺寸优化（AppBar 40px）：detailLevel 参数省略羽脉线、身体星星、腮红，保留核心轮廓
- 可选墨镜模式彩蛋路径（连点 10 次触发）

#### 31. MascotWidget 增强
**修改**：`lib/features/mascot/mascot_widget.dart`

- Mood 过渡 AnimationController（500ms 插值）
- 眨眼 Timer + AnimationController（150ms），传给 Painter blinkProgress
- 长按 1.5 秒触发"睡觉 zzz"本地临时动画（3 秒后恢复）+ haptic feedback
- 连点 10 次彩蛋：墨镜模式 + 额外撒花 + OverlayEntry 气泡文字"你发现了一个秘密！"
- 首次 build 时 springTransition 入场（bouncySpeed scale 0→1.0），可通过 animateEntrance 关闭

#### 32. MascotOverlay 增强
**修改**：`lib/features/mascot/mascot_overlay.dart`

- 入场：从右下角滑入(20,20)→zero + scale 0.5→1.0 spring
- 出场：滑出 + scale 1.0→0.5
- 思考时吉祥物上下 2px 浮动
- enableTapInteraction 设为 true（等待 AI 时可点击解闷）

---

### 第六阶段：FAB 与刷新动画

#### 33. FAB 动画统一
**修改所有使用 FAB 的页面**

- 入场：底部 20px 滑入 + 淡入 + scale 0.8→1.0
- 按压：scale 0.9→1.1→1.0 弹性
- 页面滚动时：AnimatedScale + AnimatedOpacity 隐藏/显示
- 空列表时 FAB 添加 pulseBreathing

#### 34. 自定义下拉刷新
**新建**：`lib/shared/widgets/lingxi_refresh_indicator.dart`

- 吉祥物头像作为刷新指示器
- 下拉时 idle→thinking（跟随手势），刷新中 thinking 动画，完成 happy 1 秒
- 应用于首页、学习路径、笔记页

---

## 文件完整清单

### 新建文件（13 个）
| 文件路径 | 用途 |
|---------|------|
| `lib/core/motion/page_transitions.dart` | GoRouter 页面转场动画 |
| `lib/core/motion/animation_utils.dart` | 动画工具方法（stagger 计算、触觉反馈） |
| `lib/core/theme/lingxi_gradients.dart` | 语义化渐变 ThemeExtension |
| `lib/core/theme/lingxi_elevations.dart` | 5 级阴影系统 |
| `lib/shared/widgets/animated_progress_bar.dart` | 弹簧动画进度条（直线+圆弧） |
| `lib/shared/widgets/shimmer_loading.dart` | 骨架屏微光组件 + 预设骨架 |
| `lib/shared/widgets/animated_count_text.dart` | 数字滚动动画文本 |
| `lib/shared/widgets/celebration_overlay.dart` | 庆祝粒子/撒花覆盖层 |
| `lib/shared/widgets/particles/particle_painter.dart` | 粒子绘制器（星形/纸屑/光点） |
| `lib/shared/widgets/glass_container.dart` | 毛玻璃容器 |
| `lib/shared/widgets/achievement_unlock_dialog.dart` | 成就解锁弹窗 |
| `lib/shared/widgets/lingxi_refresh_indicator.dart` | 吉祥物下拉刷新指示器 |
| `lib/features/progress/celebration_service.dart` | 全局庆祝事件服务 |

### 修改文件（约 27 个）
| 文件路径 | 修改要点 |
|---------|---------|
| `lib/core/motion/spring_motion.dart` | 新增弹簧规格、曲线、过渡组件、reduceMotion 支持 |
| `lib/core/router/app_router.dart` | 自定义 pageBuilder 转场、导航选中动画、断点统一 1024 |
| `lib/core/theme/app_theme.dart` | 注册 Gradients extension、升级圆角阴影、配合 AnimatedTheme |
| `lib/core/theme/lingxi_colors.dart` | 颜色微调确保对比度与渐变协调 |
| `lib/app.dart` | 包裹全局 CelebrationOverlay 层、AnimatedTheme |
| `lib/shared/widgets/lingxi_button.dart` | StatefulWidget、按压弹性、tonal/outlined、loading、pulse |
| `lib/shared/widgets/lingxi_card.dart` | StatefulWidget、hover lift、press scale、入场动画、glass、gradient |
| `lib/shared/widgets/lingxi_badge.dart` | 解锁 bouncy 动画、进度环、shimmer、呼吸光晕、octagon |
| `lib/shared/widgets/lingxi_chip.dart` | 选中弹性、颜色变体、圆角升级 12 |
| `lib/shared/widgets/lingxi_app_bar.dart` | 滚动联动、stagger 入场、渐变背景 |
| `lib/shared/widgets/empty_state_widget.dart` | 光晕背景、CTA pulse、装饰星星 |
| `lib/shared/widgets/misconception_sticker.dart` | 入场展开、图标微摇 |
| `lib/features/home/home_page.dart` | 仪表盘布局重构、staggered 入场、Streak 动画、快捷入口 |
| `lib/features/learning/learning_path_page.dart` | 节点动画、连接线绘制动画、卡片升级、AnimatedProgressBar |
| `lib/features/learning/lesson_page.dart` | PageView 曲线升级、庆祝页粒子、FAB 动画 |
| `lib/features/learning/widgets/learning_card_widget.dart` | 入场动画序列、使用升级后 LingxiCard |
| `lib/features/learning/widgets/quiz_widget.dart` | 自定义选项卡片、正确/错误动画、结果弹簧展开 |
| `lib/features/chat/chat_page.dart` | 气泡入场、typing dots、按钮 AnimatedSwitcher、保存反馈 |
| `lib/features/notes/notes_page.dart` | 列表 staggered、卡片 hover、FAB pulse |
| `lib/features/notes/note_editor_page.dart` | 保存反馈、输入焦点动画 |
| `lib/features/progress/achievements_page.dart` | 数字滚动、徽章 staggered、shimmerGlow、点击涟漪 |
| `lib/features/progress/statistics_page.dart` | 图表生长动画、数字滚动、数据平滑过渡 |
| `lib/features/settings/settings_page.dart` | 分组卡片入场、主题切换动画、测试连接反馈 |
| `lib/features/onboarding/onboarding_page.dart` | 情绪过渡、页面切换增强、CTA pulse、指示器 pulse |
| `lib/features/help/help_center_page.dart` | ExpansionTile 动画、搜索框聚焦、卡片 staggered |
| `lib/features/mascot/mascot_painter.dart` | mood 插值、眨眼改进、小尺寸优化、翅膀细节、墨镜彩蛋 |
| `lib/features/mascot/mascot_widget.dart` | mood 过渡、眨眼控制器、长按、10 连彩蛋、入场动画 |
| `lib/features/mascot/mascot_overlay.dart` | 滑入/滑出动画、浮动、点击交互 |

---

## 假设与决策

1. **不引入新依赖**：所有动画效果（粒子、shimmer、数字滚动、毛玻璃）均使用 Flutter 内置 API（CustomPainter、AnimationController、BackdropFilter、TweenAnimationBuilder）实现。已有的 `rive` 和 `lottie` 依赖保留但不新增使用（Rive 资源未就绪是已知技术债）。

2. **三端兼容**：动画不使用 iOS 专属组件（如 CupertinoPageRoute）。`HapticFeedback` 在桌面端安全降级。`BackdropFilter` 在所有平台支持。

3. **首页布局重构**：当前首页仅为居中吉祥物+欢迎文字，功能单薄。重构为仪表盘式布局（欢迎区+Streak 卡片+继续学习卡片+快捷入口 2x2 网格），这是页面丰富度提升的关键，也是 staggered 入场动画的载体。

4. **测验选项卡片化**：当前 QuizWidget 使用原生 RadioListTile/CheckboxListTile，样式受限且无法添加选中/对错动画。改为自定义 LingxiCard 选项，视觉更统一、动画空间更大。

5. **吉祥物 Rive 替代暂不实施**：AGENTS.md 明确 Rive 资源未就绪为技术债，本方案聚焦 CustomPainter 增强（mood 插值、眨眼、粒子细节、小尺寸优化），保留 RiveMascotWidget 占位。

6. **动画时长规范**：严格遵循参数总表（见下），所有动画值在规范内，避免自定义随意时长。

7. **Reduce Motion 无障碍**：每个动画组件必须检测 `MediaQuery.platformAccessibilityFeatures.disableAnimations`，循环动画停止、弹性动画替换为 150ms 线性淡入、粒子/撒花不显示。

---

## 动画参数总表

| 场景 | 时长 | 曲线/弹簧 |
|------|------|---------|
| 按钮按压回弹 | 100ms | microSpeed spring |
| 卡片 hover lift | 150ms | easeOut |
| 卡片 press scale | 100ms | fastSpeed spring |
| Chip 选中 | 150ms | fastSpeed spring |
| 元素入场（卡片） | 300ms | default spring + easeOutCubic |
| 元素入场（页面级） | 400ms | gentleSpeed + easeOutCubic |
| 列表 staggered | 300ms + 50ms/项 | default spring |
| 页面转场 | 400ms | easeInOutCubicEmphasized |
| 页面转场反向 | 250ms | easeInCubic |
| 进度条填充 | 600ms | defaultSpeed spring |
| 数字滚动 | 600ms | easeOutCubic |
| 主题切换 | 500ms | easeInOutCubic |
| 对话框入场 | 300ms | defaultSpeed spring |
| 成就解锁 bouncy | 800ms | bouncySpeed spring |
| 粒子喷发 | 2000ms | 自定义物理 |
| 吉祥物 mood 过渡 | 500ms | default spring |
| 眨眼 | 150ms | easeInOut |
| 呼吸脉冲 | 3000ms 周期 | sin 曲线 |
| 流光 shimmer | 2000ms 周期 | linear |
| SnackBar 入场 | 250ms | easeOut |

---

## 验证步骤

1. **静态分析**：`flutter analyze` 必须零 error、零 warning
2. **现有测试通过**：`flutter test` 全部通过（注意动画测试中使用 `pumpAndSettle` 等待动画完成）
3. **视觉验证**：
   - 首页：检查 staggered 入场序列、Streak 火焰流光、卡片 hover 效果
   - 学习路径：节点弹跳入场、连接线绘制动画、进度条弹簧填充
   - 课程页：PageView 切换曲线、测验答对/答错动画、章节完成撒花
   - 对话页：气泡入场、typing dots、发送按钮旋转切换
   - 成就页：徽章网格 staggered、解锁 bouncy + 粒子
   - 引导页：mood 过渡、页面指示器 pulse
4. **Reduce Motion 测试**：在系统设置中开启"移除动画"，验证所有动画降级为简单淡入/直接显示，粒子不出现
5. **性能验证**：粒子场景（≤30 粒）下 DevTools 检查帧率，列表滚动无 jank，CustomPainter 使用 RepaintBoundary 隔离
6. **三端验证**：
   - Android：NavigationBar 动画、按压反馈、触觉震动正常
   - Windows/macOS：NavigationRail、hover lift 效果、键盘快捷键正常
7. **响应式验证**：在 840-1024px 断点区间验证导航切换无闪烁

---

## 实现进度

- **Phase 1（动效基础系统）**：
  - SpringMotion 扩展 ✅ 已完成（新增 microSpeed/fastSpeed/gentleSpeed/slowSpeed/bouncySpeed 弹簧规格、曲线集、过渡组件 pulseBreathing/scalePressFeedback/hoverLift/shimmerGlow/sparkleRing）
  - PageTransitions ✅ 已完成（buildPage/buildSlidePage/buildModalPage 三种转场）
  - AnimationUtils ✅ 已完成（staggerInterval、触觉反馈、reduceMotion 检测）
  - GoRouter 页面转场接入 ✅ 已完成（所有路由已改为 pageBuilder 使用自定义转场）
  - LingxiButton/LingxiCard 升级 ⏳ 待实现
- **Phase 2-6**：⏳ 待实现

---

## 实现顺序

**第一阶段（动效基础）**：SpringMotion 扩展 → PageTransitions → AnimationUtils → LingxiButton/LingxiCard 按压/hover → 页面转场接入 GoRouter

**第二阶段（组件升级）**：AnimatedProgressBar → ShimmerLoading → AnimatedCountText → CelebrationOverlay/ParticlePainter → LingxiBadge/Chip 升级 → LingxiAppBar/EmptyState 升级 → 导航动画

**第三阶段（页面动画）**：首页重构+动画 → 学习路径 → 课程页/测验 → 对话页 → 成就/统计 → 设置/笔记/帮助/引导

**第四阶段（庆祝与吉祥物）**：CelebrationService 全局层 → MascotPainter/Widget 增强 → AchievementUnlockDialog → MascotOverlay

**第五阶段（视觉润色）**：LingxiGradients → LingxiElevations → GlassContainer → ShapeVariants 全局统一替换 → AppBar 滚动效果 → 主题切换 AnimatedTheme → FAB/刷新动画
