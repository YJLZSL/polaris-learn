# 灵犀学院 前端界面重设计指南

> **文档目的**：面向下一个接手前端重设计的 AI 协作者，提供从现状分析到重设计蓝图的完整指南。阅读本文档后即可独立开始重设计工作。
>
> **项目技术栈**：Flutter 3.44.4 / Dart 3.12.2，支持 Android + Windows + macOS 三端
>
> **配套文件**：`docs/design-tokens.json`（结构化设计令牌）、`docs/page-wireframes/README.md`（文字线框图）
>
> **最后更新**：2026-07-11

---

## 目录

- [一、当前界面现状分析](#一当前界面现状分析)
- [二、用户痛点与改进方向](#二用户痛点与改进方向)
- [三、设计系统规范](#三设计系统规范)
- [四、各页面重设计蓝图](#四各页面重设计蓝图)
- [五、响应式断点策略](#五响应式断点策略)
- [六、吉祥物视觉升级方案](#六吉祥物视觉升级方案)
- [七、趣味式交互设计清单](#七趣味式交互设计清单)
- [八、无障碍设计要求](#八无障碍设计要求)
- [九、设计交付物清单](#九设计交付物清单)

---

## 一、当前界面现状分析

### 1.1 配色系统现状

**种子色与动态配色**

当前主题定义在 `lib/core/theme/app_theme.dart` 中，使用 Material 3 的 `ColorScheme.fromSeed` 从种子色 `#6750A4`（紫色调）动态生成浅色与深色两套配色方案。种子色契合"灵犀"意境，整体视觉风格统一为紫色系。

- 浅色主题：`ColorScheme.fromSeed(seedColor: #6750A4, brightness: light)`
- 深色主题：`ColorScheme.fromSeed(seedColor: #6750A4, brightness: dark)`

**LingxiColors 自定义颜色扩展**

定义在 `lib/core/theme/lingxi_colors.dart` 中，通过 `ThemeExtension<LingxiColors>` 注册到主题，提供 6 个场景化语义色：

| 颜色名 | 浅色 HEX | 深色 HEX | RGB（浅色） | 用途 |
|--------|----------|----------|-------------|------|
| mascotPrimary | #7C4DFF | #9D7CFF | 124, 77, 255 | 吉祥物主色-星空紫 |
| mascotSecondary | #FFB74D | #FFCC80 | 255, 183, 77 | 吉祥物辅色-温暖橙 |
| streakFire | #FF5722 | #FF7043 | 255, 87, 34 | Streak 火焰红 |
| achievementGold | #FFD700 | #FFE082 | 255, 215, 0 | 成就金 |
| socraticBlue | #42A5F5 | #64B5F6 | 66, 165, 245 | 苏格拉底引导蓝 |
| misconceptionRed | #EF5350 | #EF9A9A | 239, 83, 80 | 常见误解红 |

**浅深色差异**：深色模式下各色明度提升（向白色偏移），饱和度略降，以适应深色背景的可读性。吉祥物色在深色模式下从 `#7C4DFF` 提亮至 `#9D7CFF`。

**使用情况**：
- `streakFire`：首页 AppBar Streak 徽章、统计页 Streak 卡片
- `achievementGold`：成就页徽章高亮、总进度条
- `socraticBlue`：学习卡片"为什么重要"方框、对话页苏格拉底开关
- `misconceptionRed`：学习卡片常见误解区域、MisconceptionSticker 组件
- `mascotPrimary/Secondary`：学习卡片主图区渐变背景

**现状痛点**：
1. 缺少渐变色系统化定义，渐变仅在 `LearningCardWidget._buildGradientHero` 中硬编码
2. 无中性色阶的语义化命名（直接使用 `surfaceContainerLow` 等 M3 内置色）
3. 吉祥物颜色（bodyGradientTop/Bottom、capColor 等）全部硬编码在 `MascotPainter` 中，未纳入主题系统

### 1.2 布局系统现状

**Responsive 响应式工具**（`lib/shared/utils/responsive.dart`）

当前使用三个断点划分设备类型：

| 类型 | 宽度范围 | 说明 |
|------|----------|------|
| Mobile（移动） | < 600 | 单栏布局、底部 NavigationBar |
| Tablet（平板） | 600 ≤ w < 1024 | 双栏布局 |
| Desktop（桌面） | ≥ 1024 | 三栏/宽限居中、NavigationRail |

提供 `Responsive.valueByDevice<T>(context, mobile, tablet, desktop)` 方法按设备返回不同值。

**断点不一致问题**：`lib/core/router/app_router.dart` 中的 `_AppShell` 使用 `width >= 840` 作为 NavigationRail 切换阈值，与 `Responsive` 的 1024 不一致。这导致 840-1024 宽度区间内既显示 NavigationRail 又被 `Responsive` 判定为平板，布局逻辑可能冲突。

**各端布局现状**：
- **移动端**：底部 `NavigationBar`（6 个目的地：首页/学习/对话/笔记/成就/设置），页面内单栏
- **桌面端**：左侧 `NavigationRail`（`labelType: all`），右侧内容区无最大宽度限制（仅对话页限 900px）
- **平板端**：实际回退到桌面端 NavigationRail（因 840 阈值），但页面内布局可能使用移动端参数

### 1.3 组件库现状

#### LingxiCard（`lib/shared/widgets/lingxi_card.dart`）

- 基于 `Card`，elevation 0、圆角 16、背景 `surfaceContainerLow`
- API：`child`、`onTap`（InkWell 水波纹）、`padding`（默认 16）、`color`、`margin`
- 痛点：无 elevation 参数化、无 hover 效果、无进出场动画

#### LingxiButton（`lib/shared/widgets/lingxi_button.dart`）

- 统一封装 `FilledButton`/`ElevatedButton`/`TextButton`
- 三变体：`filled`（主要）、`elevated`（凸起）、`text`（文本）
- 三尺寸：`small`（padding 6/12）、`medium`（padding 10/16）、`large`（padding 14/24, fontSize 16）
- 圆角 12，有 icon 时自动使用 `.icon` 构造函数
- 痛点：无 `tonal` 变体、无 loading 态、无 outline 变体、尺寸仅靠 padding 区分

#### LingxiChip（`lib/shared/widgets/lingxi_chip.dart`）

- 三变体：`filter`（FilterChip 可选中）、`info`（Chip 仅展示）、`action`（ActionChip 可点击）
- 圆角 8，支持 `avatar`、`onDeleted`
- 痛点：无自定义颜色、无图标变体、选中态颜色依赖 M3 默认

#### LingxiBadge（`lib/shared/widgets/lingxi_badge.dart`）

- 成就徽章组件，支持圆形/圆角矩形两种形状
- 未解锁：灰色锁定（`lock_outline` 图标）；解锁：成就金高亮（alpha 0.16 背景）
- 参数：`icon`、`label`、`unlocked`、`shape`、`size`（默认 64）
- 痛点：无解锁动画、无进度环、图标尺寸固定

#### LingxiAppBar（`lib/shared/widgets/lingxi_app_bar.dart`）

- 基于 `AppBar`，默认居中标题，可选吉祥物头像作为 leading
- 实现 `PreferredSizeWidget`，支持 `bottom`（TabBar 等）
- elevation 0、scrolledUnderElevation 0
- 痛点：无滚动变色效果、无搜索栏集成、吉祥物头像无标准化

#### MarkdownRenderer（`lib/shared/widgets/markdown_renderer.dart`）

- 基于 `flutter_markdown`，支持代码块、LaTeX 数学公式（`$inline$` / `$$block$$`）、可点击链接
- 链接点击：复制到剪贴板并 SnackBar 提示
- 痛点：无代码高亮、链接行为仅复制不打开、无图片渲染优化

#### EmptyStateWidget（`lib/shared/widgets/empty_state_widget.dart`）

- 通用空状态：吉祥物（指定情绪）+ 标题 + 描述 + 可选 CTA
- 弹簧动画入场（`SpringMotion.springTransition`）
- 点击整个组件触发吉祥物彩蛋互动
- mascotSize 范围 120-180（clamp 限制）
- 痛点：布局固定垂直居中、无自定义插图灵活度

#### LevelExplorationButtons（`lib/shared/widgets/level_exploration_buttons.dart`）

- 分级探索三按钮：简化 / 深入 / 图示
- 点击后调用 AI Provider 重新生成内容，通过 `onNewAnswer` 回调
- 加载态：按钮内显示 `CircularProgressIndicator`
- 痛点：三按钮均使用 text 变体、视觉区分度低、无快捷键

#### MisconceptionSticker（`lib/shared/widgets/misconception_sticker.dart`）

- 红色左边框 + 浅红背景的贴纸，展示常见误解
- 圆角 8，左边框宽 3px
- 痛点：样式单一、无折叠/展开

### 1.4 动效系统现状

**SpringMotion**（`lib/core/motion/spring_motion.dart`）

提供三速度弹簧物理描述：

| 速度 | mass | stiffness | damping | 时长 | 曲线 | 使用场景 |
|------|------|-----------|---------|------|------|----------|
| default | 1 | 100 | 15 | 300ms | easeOutCubic | 常规过渡 |
| fast | 1 | 200 | 20 | 150ms | easeOut | 小元素 |
| slow | 1 | 50 | 12 | 500ms | easeInOutCubicEmphasized | 大元素/页面切换 |

`springTransition` 封装：淡入（opacity 0→1）+ 缩放（scale 0.92→1）+ 位移（offset 可选），适用于卡片、徽章入场。

**使用情况**：
- `EmptyStateWidget`：整个空状态内容弹簧入场
- `AchievementsPage._BadgeCard`：已解锁徽章 `springTransition(beginScale: 0.85)` 入场
- `OnboardingPage`：吉祥物 `springTransition(beginScale: 0.8)`、文字 `springTransition(beginOffset: Offset(0, 20))`、页面指示器 `AnimatedContainer`
- `OnboardingPage._goToPage`：`animateToPage` 使用 `defaultDuration` + `defaultCurve`

**痛点**：
1. 页面切换（go_router）无自定义过渡动画，使用默认平台切换
2. 列表项进入无 staggered 动画
3. 按钮按压无弹性反馈
4. 无 `MediaQuery.platformAccessibilityFeatures.disableAnimations` 减少动效支持

### 1.5 吉祥物现状

**MascotPainter**（`lib/features/mascot/mascot_painter.dart`）

使用 `CustomPainter` + 纯矢量 API（`Path`/`drawCircle`/`drawOval`/`drawArc`）绘制萌系圆润的星空小犀牛"小犀"。

**角色设定**：
- 大头小身体萌系比例（头部约占整体 60%）
- 主体灰紫色渐变（`#7C4DFF` → `#B39DDB`）
- 学士帽黑色（`#1C1B2E`），流苏金色（`#FFD54F`）
- 半透明白色翅膀（`#59FFFFFF`）
- 头顶小犀角（白→紫渐变）
- 翅尖/角尖/身体星光装饰（`#FFE082`）

**6 状态机**（`lib/features/mascot/mascot_state.dart`）：

| 状态 | 动画 | 时长 | 表情特征 | 附加元素 |
|------|------|------|----------|----------|
| idle | 上下浮动 sin(2πt)×0.015s | 3s | 半开眼+轻微微笑+周期性眨眼 | 腮红 |
| happy | 抛物线跳跃 0→1→0 | 1s | ^_^ 弯眼+张嘴微笑+舌头 | 翅膀大幅扇动 |
| thinking | 头部点头 | 4s | 左眼上看+右眼微闭+o 型小嘴 | 头顶问号 |
| sad | 下沉 | 3s | 下垂眼+皱眉+倒弧嘴 | 泪滴下滴 |
| celebrate | 跳跃+缩放+旋转 | 2s | 星星眼+大张嘴 | 10-16 粒撒花 |
| curious | 轻微浮动+歪头 | 3s | 左小右大眼+? 型小嘴 | 右侧放大镜 |

**动画驱动**：`AnimationController.repeat()` 循环播放，`animationValue`（0.0-1.0）驱动所有动画偏移。不同 mood 对应不同 duration。

**交互彩蛋**（`lib/features/mascot/mascot_widget.dart`）：
- 单次点击：随机切换 happy/curious 1.5 秒后恢复
- 2 秒内连续点击 5 次：触发 celebrate 3 秒 + `extraSparkle` 额外星光粒子

**MascotOverlay**（`lib/features/mascot/mascot_overlay.dart`）：
- 包裹子页面，AI 思考态时在右下角（bottom: 100, right: 24）悬浮 80px 小犀
- 仅 thinking 状态显示，其余状态不显示

**MascotController**（`lib/features/mascot/mascot_controller.dart`）：
- Riverpod `StateNotifier<MascotState>`，全局单例
- 方法：`setMood`、`setAiThinking`、`triggerTap`、`celebrate`、`reset`
- 状态联动：AI 发送消息→thinking、流式完成→celebrate、出错→sad

**RiveMascotWidget**（`lib/features/mascot/rive_mascot_widget.dart`）：
- 预留接口，`build` 返回空 `SizedBox`，等待 `.riv` 文件替换

**痛点**：
1. 无骨骼动画——所有动画通过整体 transform（平移/缩放/旋转）实现，身体各部位无法独立运动
2. 表情简单——每种 mood 仅一套固定表情，无过渡形变
3. 无声效——点击/庆祝无声效反馈
4. 矢量绘制性能——每帧重建 Paint 对象（渐变/描边），虽然实色 Paint 已缓存
5. 彩蛋单一——仅"连点 5 次"一种彩蛋
6. 尺寸适配——小尺寸（40px AppBar）时细节模糊，五官比例失调

### 1.6 各页面现状逐页分析

#### 首页（`lib/features/home/home_page.dart`）

- **信息层级**：AppBar（标题"首页" + Streak 徽章）→ 居中吉祥物(200px) → 欢迎标题 → 副标题
- **交互流**：进入页面→记录 streak→streak≥3 触发吉祥物 happy；点击 Streak 徽章跳转统计页
- **痛点**：内容极度稀疏，仅有欢迎语和吉祥物；无快捷入口、无学习进度摘要、无最近对话/笔记入口；大屏空间完全浪费

#### 学习路径页（`lib/features/learning/learning_path_page.dart`）

- **信息层级**：AppBar（"学习路径 🦏" + 40px 吉祥物）→ 垂直 ListView（L0-L4 五层）→ 每层左侧圆点+连接线+右侧课程卡片
- **课程卡片**：emoji 图标 + 标题 + 描述 + 进度条 + "X/Y 知识点"
- **桌面**：课程卡片宽 360px，`Wrap` 布局
- **痛点**：路线图可视化过于简单（仅圆点+竖线），无解锁/锁定状态、无路径分支、无进度总览；连接线高度固定 100px 不随内容伸缩

#### 课程页（`lib/features/learning/lesson_page.dart`）

- **信息层级**：AppBar（返回 + 课程标题 + 40px 吉祥物）→ PageView（知识点轮播）→ 底部进度条
- **知识点学习流程**：学习卡片 → 测验 → 苏格拉底入口 → 苏格拉底对话 → 完成
- **桌面三栏**：左主内容（PageView）+ 右 `ContinueLearningSidebar`（280px 固定宽度）
- **移动端**：单栏 + FAB（`explore` 图标）触发底部抽屉显示 sidebar
- **章节完成**：吉祥物 celebrate(160px) + "🎉 章节完成！" + 返回按钮
- **痛点**：PageView 切换无过渡动画（仅默认滑动）；测验 UI 使用 RadioListTile/CheckboxListTile 原生样式，与自定义组件风格不统一；苏格拉底入口页过于简单

#### 对话页（`lib/features/chat/chat_page.dart` + `chat_controller.dart`）

- **信息层级**：LingxiAppBar（可点击标题切换对话 + 苏格拉底开关 + 新建 + 历史 PopupMenu）→ 消息列表（反向 ListView）→ 输入区
- **消息气泡**：用户右对齐（primary 色，不对称圆角 16/16/16/4）、AI 左对齐（surfaceContainerHighest，不对称圆角 4/16/16/16）
- **流式光标**：500ms 闪烁竖线（width 2, height 18, primary 色）
- **分级探索按钮**：仅末条 AI 消息下方显示，三按钮 text 变体
- **桌面**：内容居中限宽 900px
- **快捷键**：Ctrl+Enter 发送
- **痛点**：气泡最大宽度固定（用户 420px / AI 680px）不随屏幕缩放；无消息时间戳；无消息复制按钮（仅 AI 消息有 PopupMenu "保存为笔记"）；苏格拉底开关位置不显眼；无 typing indicator（仅光标）

#### 笔记页（`lib/features/notes/notes_page.dart` + `note_editor_page.dart`）

- **列表页**：LingxiAppBar + 标签筛选栏（FilterChip 横向滚动）+ 桌面网格(maxCrossAxisExtent 360, ratio 1.1)/移动列表 + FAB
- **笔记卡片**：标题 + 内容预览(80字) + 标签 Chip + 创建时间
- **编辑器**：LingxiAppBar（删除/保存）→ 标题输入 + 内容多行(6-12行) + 标签(逗号分隔) + 保存按钮
- **痛点**：编辑器无 Markdown 预览、无富文本、标签输入无 Chip 化展示；列表无搜索；卡片无置顶/收藏

#### 设置页（`lib/features/settings/settings_page.dart` + `api_settings_page.dart`）

- **设置主页**：分组卡片（外观/语言/学习偏好/数据/AI 服务/关于/帮助），每组用 `_SectionTitle` + `LingxiCard`
- **外观**：SegmentedButton 三选（跟随系统/浅色/深色）
- **语言**：SegmentedButton 二选（中文/English）
- **API 配置页**：说明卡片 + Provider 卡片列表（图标+名称+URL+模型+状态+操作按钮）+ FAB 添加
- **Provider 编辑对话框**：类型下拉 + BaseURL + APIKey(密码切换) + 模型 + Temperature 滑块 + MaxTokens 滑块 + 设为活跃开关 + 测试连接/保存
- **痛点**：设置项拥挤在一个 ListView 中无折叠；API 配置卡片信息密度高但层级不清；导入数据通过粘贴 JSON 文本（无文件选择）

#### 成就页（`lib/features/progress/achievements_page.dart`）

- **信息层级**：LingxiAppBar → 统计栏（奖杯图标 + X/总数 + 总进度条）→ 徽章网格（移动 2 列 / 平板 3 列 / 桌面 5 列）
- **徽章卡片**：emoji 图标（未解锁灰度 ColorFilter.matrix）+ 名称 + 描述 + 进度条/解锁时间
- **已解锁**：金色边框(width 2) + elevation 4 + alpha 0.08 金色背景 + springTransition 入场
- **痛点**：徽章用 emoji 而非自定义图标；无解锁详情弹窗；无分类筛选；解锁动画仅入场无持续效果

#### 统计页（`lib/features/progress/statistics_page.dart`）

- **信息层级**：时间范围 SegmentedButton（本周/本月/全部）→ 4 个统计卡片（连续天数/苏格拉底对话/笔记数/知识点）→ 柱状图 → 课程完成度 → 热力图
- **图表**：全部 `CustomPainter` 手绘——柱状图（紫色柱+灰色网格线+底部标签）、热力图（10×3 格子，火焰色渐变透明度）
- **痛点**：图表无交互（无 tooltip/点击）；柱状图标签拥挤（30 天时每 5 天显示）；热力图仅 30 天无年视图；无动画

#### 引导页（`lib/features/onboarding/onboarding_page.dart`）

- **5 步 PageView**：欢迎→自备API→点击彩蛋→学习路径→苏格拉底
- **每步内容**：吉祥物(指定 mood) + 标题 + 描述 + CTA 按钮
- **桌面**：双列（左吉祥物 240px / 右文字）
- **移动**：单列垂直（吉祥物 180px + 文字）
- **底部**：上一页按钮 + 页面指示器（5 圆点，当前页放大为 24×8 胶囊）+ 下一页/开始学习按钮
- **联动**：页面切换时 `mascotControllerProvider.setMood` 联动吉祥物情绪
- **痛点**：引导内容文字密集；CTA 按钮行为不一致（有的跳转有的下一步）；无进度保存（跳过后直接完成）

#### API 设置向导页（`lib/features/onboarding/api_setup_wizard_page.dart`）

- **信息层级**：AppBar（返回）→ ListView（4 个 Provider 教程卡片）
- **教程卡片**：Provider 图标(48×48 圆角方块) + 名称 + 步骤数 → 步骤列表（圆圈序号+连接线+标题+描述+网址标签）→ 立即配置按钮
- **痛点**：步骤描述全为文字无截图；4 个 Provider 平铺无折叠

#### 帮助页（`lib/features/help/help_center_page.dart`）

- **信息层级**：AppBar → ListView（8 个可展开 `ExpansionTile` 分类卡片）→ 右下角反馈 FAB
- **分类**：快速开始/学习路径/苏格拉底引导/小犀互动/数据安全/快捷键/常见问题/开源贡献
- **内容渲染**：`MarkdownRenderer` 渲染 Markdown 文本（含表格、列表、引用块）
- **痛点**：无搜索功能；分类全展开后页面过长；反馈按钮仅弹对话框无实际提交

---

## 二、用户痛点与改进方向

### 2.1 视觉层级不够鲜明

**现状**：几乎所有卡片使用相同的 elevation 0 + surfaceContainerLow 背景，无视觉权重区分。首页、学习路径页、设置页的卡片风格完全一致，用户难以快速识别重要信息。

**改进方向**：
- 引入 5 级 elevation 系统（见设计系统规范），重要操作卡片使用 level 1-2
- 使用颜色权重区分：主要操作用 `primaryContainer`，信息展示用 `surfaceContainerLow`，警告用 `errorContainer`
- 字号阶梯严格执行：页面标题 `headlineSmall`(24)、区域标题 `titleLarge`(22)、卡片标题 `titleMedium`(16)

### 2.2 吉祥物与 Rive 矢量动画的差距

**现状**：`MascotPainter` 使用 `CustomPainter` 纯矢量绘制，动画通过整体 transform 实现。与 Rive 的骨骼动画+形变+状态机过渡相比，表现力差距显著。

**改进方向**：
- 短期：优化 `MascotPainter`，增加更多独立动画部件（眼睛眨动、嘴巴形变、翅膀独立扇动）
- 中期：使用 Rive Editor 设计 `.riv` 文件，通过骨骼动画实现流畅过渡（见第六章详细方案）
- 长期：引入声效，吉祥物配合音效反馈

### 2.3 趣味性不足

**现状**：微动效仅在空状态和成就页入场使用；彩蛋仅"连点 5 次"一种；状态联动仅 AI 思考→thinking、完成→celebrate。

**改进方向**：
- 微动效：按钮按压弹性回弹、卡片悬浮 elevation 变化、页面切换弹簧过渡、列表项 staggered 进入
- 彩蛋：吉祥物连点（已有）、特定操作触发（如首次完成课程、连续 7 天打卡）、节日彩蛋（春节/圣诞特殊皮肤）
- 状态联动：AI 思考→thinking（已有）、完成知识点→celebrate（已有）、出错→sad（已有）、测验答对→happy、答错→curious、空闲超时→idle+随机俏皮

### 2.4 桌面端大屏空间利用不充分

**现状**：除课程页有三栏布局外，其他页面在桌面端均为单栏。对话页限宽 900px 居中，两侧大量留白。统计页图表宽度固定不随屏幕伸缩。

**改进方向**：
- 首页：桌面三栏（左导航+中主内容+右快捷面板）
- 学习路径页：桌面横向滚动路线图（而非纵向 ListView）
- 对话页：桌面三栏（左对话列表+中消息+右笔记/上下文面板）
- 笔记页：桌面三栏（左标签树+中列表+右编辑器预览）
- 统计页：桌面双列图表网格

### 2.5 空状态过于平淡

**现状**：空状态为吉祥物+标题+描述+CTA 的固定垂直布局，虽有弹簧入场但缺乏场景化设计。

**改进方向**：
- 4 个场景化空状态：无对话/无笔记/无成就/无 API 配置，每个场景使用不同吉祥物情绪和文案
- 增加装饰性背景（渐变/粒子/图案）
- CTA 按钮使用不同变体区分优先级

### 2.6 学习路径可视化不够吸引人

**现状**：L0-L4 使用简单的圆点+竖线纵向排列，无锁定/解锁状态、无路径分支、无进度总览。

**改进方向**：
- 节点设计：已完成(金色填充+勾选)/进行中(主色填充+进度环)/已解锁(主色描边)/未解锁(灰色虚线)
- 连接线：已完成段渐变填充、未解锁段虚线
- 桌面横向滚动路线图，移动纵向
- 增加路径总览卡片（整体进度环+下一推荐课程）

---

## 三、设计系统规范

> 完整结构化令牌见 `docs/design-tokens.json`。以下为关键规范摘要。

### 3.1 色板

#### 主色与辅助色

| 令牌 | 浅色 | 深色 | RGB（浅色） | 用途 |
|------|------|------|-------------|------|
| primary | #6750A4 | #D0BCFF | 103, 80, 164 | 主品牌色，按钮/选中态 |
| onPrimary | #FFFFFF | #381E72 | 255, 255, 255 | primary 上的文字 |
| primaryContainer | #EADDFF | #4F378B | 234, 221, 255 | 主色容器背景 |
| secondary | #625B71 | #CCC2DC | 98, 91, 113 | 辅助色 |
| tertiary | #7D5260 | #EFB8C8 | 125, 82, 96 | 第三色 |

#### 语义色

| 令牌 | 浅色 | 深色 | 用途 |
|------|------|------|------|
| error | #B3261E | #F2B8B5 | 错误/删除 |
| errorContainer | #F9DEDC | #8C1D18 | 错误背景 |
| streakFire | #FF5722 | #FF7043 | 连续学习火焰 |
| achievementGold | #FFD700 | #FFE082 | 成就金 |
| socraticBlue | #42A5F5 | #64B5F6 | 苏格拉底引导 |
| misconceptionRed | #EF5350 | #EF9A9A | 常见误解 |

#### 中性色

| 令牌 | 浅色 | 深色 | 用途 |
|------|------|------|------|
| background | #FEF7FF | #141218 | 页面背景 |
| surface | #FEF7FF | #141218 | 表面 |
| surfaceContainerLow | #F7F2FA | #1D1B20 | 卡片背景（默认） |
| surfaceContainerHigh | #ECE6F0 | #2B2930 | 高强调表面 |
| outline | #79747E | #938F99 | 边框 |
| outlineVariant | #CAC4D0 | #49454F | 分割线 |

#### 吉祥物色

| 令牌 | HEX | RGB | 用途 |
|------|-----|-----|------|
| mascotPrimary | #7C4DFF | 124, 77, 255 | 吉祥物主体-星空紫 |
| mascotSecondary | #FFB74D | 255, 183, 77 | 吉祥物辅色-温暖橙 |
| bodyGradientTop | #7C4DFF | 124, 77, 255 | 身体渐变顶部 |
| bodyGradientBottom | #B39DDB | 179, 157, 219 | 身体渐变底部 |
| capColor | #1C1B2E | 28, 27, 46 | 学士帽 |
| tasselColor | #FFD54F | 255, 213, 79 | 流苏 |
| starColor | #FFE082 | 255, 224, 130 | 星光 |

#### 渐变色

| 令牌 | 色值 | 方向 | 用途 |
|------|------|------|------|
| mascotHero | [#7C4DFF, #FFB74D] | 左上→右下 | 学习卡片主图区（alpha 0.6） |
| celebrateConfetti | [#FFE082, #FF8A95, #81D4FA, #B39DDB, #FFAB91] | — | 庆祝撒花 |
| streakFire | [#FF5722, #FFB74D] | 下→上 | Streak 火焰 |

### 3.2 字体

**字体族**：
- 标题：`Quicksand`（圆润字体，通过 `google_fonts` 包加载）
- 正文：`Noto Sans SC`（中文优先，通过 `google_fonts` 包加载）
- 重设计建议：升级为 `Google Sans Flex Rounded`（标题）+ `Noto Sans SC`（正文）

**字号阶梯**（基于 M3 type scale）：

| 令牌 | fontSize | fontWeight | lineHeight | letterSpacing | 使用场景 |
|------|----------|------------|------------|---------------|----------|
| displayLarge | 57 | 400 | 64 | -0.25 | 超大展示（极少使用） |
| displayMedium | 45 | 400 | 52 | — | 大型展示 |
| displaySmall | 36 | 400 | 44 | — | 展示标题 |
| headlineLarge | 32 | 400 | 40 | — | 页面主标题 |
| headlineMedium | 28 | 400 | 36 | — | 区域标题 |
| headlineSmall | 24 | 400 | 32 | — | 卡片标题、章节完成 |
| titleLarge | 22 | 400 | 28 | — | AppBar 标题 |
| titleMedium | 16 | 500 | 24 | 0.15 | 列表项标题 |
| titleSmall | 14 | 500 | 20 | 0.1 | 分组标题 |
| bodyLarge | 16 | 400 | 24 | 0.5 | 正文主要 |
| bodyMedium | 14 | 400 | 20 | 0.25 | 正文次要 |
| bodySmall | 12 | 400 | 16 | 0.4 | 辅助文字 |
| labelLarge | 14 | 500 | 20 | 0.1 | 按钮文字 |
| labelMedium | 12 | 500 | 16 | 0.5 | Chip/Badge |
| labelSmall | 11 | 500 | 16 | 0.5 | 极小标签 |

**字重**：regular(400) / medium(500) / semibold(600) / bold(700)

### 3.3 间距

**基准网格**：4px

| 令牌 | 值 | 使用场景 |
|------|----|----------|
| xs | 4 | 图标与文字间距 |
| sm | 8 | Chip 间距、列表项内部 |
| md | 12 | 卡片内子元素、按钮间距 |
| lg | 16 | 卡片内边距（默认）、页面边距 |
| xl | 24 | 区域间距、空状态间距 |
| 2xl | 32 | 大区域间距、空状态内边距 |
| 3xl | 48 | 引导页步骤间距 |
| 4xl | 64 | 页面级大间距 |

### 3.4 圆角

| 令牌 | 值 | 使用场景 |
|------|----|----------|
| sm | 4 | 进度条、极小元素 |
| md | 8 | Chip、贴纸、小按钮 |
| lg | 12 | Button、Input、NavRail 指示器 |
| xl | 16 | Card、FAB、消息气泡 |
| 2xl | 24 | Dialog（建议从 20 升级）、大卡片 |
| 3xl | 32 | 大型弹出层 |
| full | 9999 | 头像、圆形按钮、胶囊 |

### 3.5 阴影（elevation）

| 级别 | 阴影参数 | 使用场景 |
|------|----------|----------|
| level0 | none | 默认卡片、表面容器 |
| level1 | 0 1 2 rgba(0,0,0,.08), 0 1 3 rgba(0,0,0,.06) | 悬浮卡片、hover 态 |
| level2 | 0 2 4 rgba(0,0,0,.10), 0 1 5 rgba(0,0,0,.06) | 拖拽、弹出菜单 |
| level3 | 0 4 8 rgba(0,0,0,.12), 0 3 6 rgba(0,0,0,.08) | 对话框、底部抽屉 |
| level4 | 0 6 12 rgba(0,0,0,.14), 0 4 8 rgba(0,0,0,.10) | 已解锁徽章、悬浮 FAB |

### 3.6 动效曲线

**弹簧参数**：

| 速度 | mass | stiffness | damping | 使用场景 |
|------|------|-----------|---------|----------|
| default | 1 | 100 | 15 | 常规过渡 |
| fast | 1 | 200 | 20 | 小元素 |
| slow | 1 | 50 | 12 | 大元素/页面切换 |

**时长阶梯**：

| 令牌 | 毫秒 | 使用场景 |
|------|------|----------|
| fast | 150 | 按钮按压、图标切换 |
| normal | 250 | Chip 选中、开关切换 |
| default | 300 | 卡片入场、弹簧过渡 |
| slow | 400 | 页面切换、展开/收起 |
| slower | 500 | 大页面切换、引导页步骤 |

**曲线**：
- default: `Curves.easeOutCubic`
- fast: `Curves.easeOut`
- slow: `Curves.easeInOutCubicEmphasized`

### 3.7 形状变体使用映射

当前 `lib/core/theme/shape_variants.dart` 定义了 35 种变体（5 形状模式 × 7 圆角程度），但实际使用中几乎未使用该枚举，圆角值在各组件中硬编码。

**推荐使用场景映射**：

| 变体 | 圆角值 | 使用场景 |
|------|--------|----------|
| roundedMedium | 12 | 默认卡片、容器 |
| roundedLarge | 16 | 大型卡片、消息气泡 |
| roundedExtraLarge | 28 | 特殊大卡片、引导页元素 |
| roundedFull | 9999 | 胶囊按钮、标签 |
| circleFull | CircleBorder | 头像、圆形徽章、FAB |
| rectangleSmall | 8 | 进度条、贴纸 |
| capsuleFull | 9999 | 筛选 Chip、状态标签 |
| octagonLarge | 16 | 成就徽章（升级后） |

**重设计建议**：将各组件中的硬编码 `BorderRadius.circular(x)` 替换为 `ShapeVariants.xxx.borderRadius`，统一形状管理。

---

## 四、各页面重设计蓝图

### 4.1 首页

**当前问题**：内容极度稀疏，仅吉祥物+欢迎语，大屏空间浪费。

**重设计方案**：

**移动端布局**（单栏，从上到下）：
1. **AppBar**：左侧吉祥物头像(32px, 可点击触发彩蛋) + 居中标题"灵犀学院" + 右侧 Streak 徽章
2. **欢迎区**：200px 吉祥物(idle) + 个性化问候语（"早上好/下午好/晚上好" + 用户名） + 副标题
3. **Streak 卡片**：LingxiCard 展示当前连续天数 + 最长记录 + 火焰渐变图标 + "查看统计"链接
4. **继续学习卡片**：LingxiCard 展示上次学习课程 + 进度条 + "继续学习"按钮（filled 变体）
5. **快捷入口网格**：2×2 网格（学习路径/自由对话/我的笔记/学习统计），每个为 LingxiCard + 图标 + 标题
6. **最近成就预览**：横向滚动展示最近 3 个已解锁徽章

**桌面端布局**（三栏）：
- 左：NavigationRail（80px）
- 中：主内容区（maxWidth 800px 居中），包含欢迎区 + Streak 卡片 + 继续学习 + 快捷入口
- 右：侧栏（280px），展示今日目标 + 最近对话 + 最近笔记

**信息层级**：欢迎语(headlineSmall) > 卡片标题(titleMedium) > 卡片描述(bodyMedium) > 辅助文字(bodySmall)

**吉祥物位置**：欢迎区中央，200px，idle 状态，可点击交互

**Streak 展示**：AppBar 中简化徽章（火焰图标+数字），卡片中详细展示（火焰渐变+天数+最长记录+进度环）

**动效**：
- 页面进入：欢迎区 springTransition 入场
- Streak 数字：数字滚动动画（从 0 滚到当前值）
- 快捷入口卡片：staggered 淡入（每项延迟 50ms）
- 吉祥物：streak≥3 时切换 happy

### 4.2 学习路径页

**当前问题**：简单圆点+竖线，无锁定状态，无路径分支。

**重设计方案**：

**路线图节点设计**（4 种状态）：
- **已完成**：金色填充圆 + 勾选图标 + 金色连接线（到下一节点）
- **进行中**：主色填充圆 + 进度环（百分比）+ 主色连接线
- **已解锁**：主色描边圆 + 级别标签(L0/L1...) + 虚线连接线
- **未解锁**：灰色虚线圆 + 锁图标 + 灰色虚线连接线

**移动端布局**（纵向路线图）：
- AppBar（"学习路径" + 吉祥物 40px）
- 路径总览卡片：整体进度环 + "下一推荐：L1 Python 基础" + "开始学习"按钮
- 纵向路线图：L0→L1→L2→L3→L4，左侧节点+连接线，右侧级别标题+课程卡片列表
- 连接线高度随课程数量动态伸缩（使用 `IntrinsicHeight` + `Expanded`）

**桌面端布局**（横向滚动路线图）：
- AppBar
- 路径总览卡片（同上但更宽）
- 横向 `SingleChildScrollView`：L0→L1→L2→L3→L4 横向排列，每个级别为一个垂直列（节点+标题+课程卡片），级别间用横向连接线
- 每列宽度固定 360px，课程卡片纵向排列

**课程卡片设计**：
- LingxiCard + onTap 跳转
- 桌面宽度 320px，移动全宽
- 内容：emoji 图标(32px) + 标题(titleMedium bold) + 描述(bodySmall 2行) + 进度条 + "X/Y 知识点" + 状态标签（已完成/进行中/未开始）

**动效**：
- 路线图入场：节点 staggered 出现（从上到下/从左到右）
- 进度条：springTransition 填充动画
- 连接线：已完成段渐变绘制动画

### 4.3 课程页

**当前问题**：PageView 无过渡动画，测验 UI 原生样式，桌面三栏仅 sidebar。

**重设计方案**：

**桌面三栏布局**（≥1024）：
- 左栏（240px）：章节导航侧栏，展示当前课程所有章节列表，高亮当前知识点，显示完成状态
- 中栏（自适应）：主学习区域
- 右栏（280px）：ContinueLearningSidebar（相关主题）+ 学习进度面板

**移动端单栏布局**：
- 主学习区域 + 底部进度条 + FAB 触发底部抽屉

**知识点学习流程**（保持 learning→quiz→socraticEntry→socratic→done 状态机）：

**学习卡片**（`LearningCardWidget` 升级）：
- 标题区：知识点标题(headlineSmall bold) + 难度标签 Chip
- 主图区：有图片显示图片，否则渐变背景+吉祥物(96px, enableTapInteraction: false)
- 核心解释：LingxiCard + MarkdownRenderer（支持代码高亮）
- "为什么重要"：socraticBlue 边框卡片（保持现有设计）
- 词汇建立：LingxiChip(info) 横向 Wrap
- 常见误解：MisconceptionSticker（使用共享组件而非内联）
- 底部："开始测验" LingxiButton(filled, large)

**测验交互**（`QuizWidget` 升级）：
- 题目卡片使用 LingxiCard 而非 Column
- 选项使用自定义可点击卡片（替代 RadioListTile/CheckboxListTile）：选中态 primaryContainer 背景 + 主色边框
- 提交后：正确选项绿色边框+勾选图标，错误选项红色边框+叉号图标
- 结果展示：通过用 celebrate 色+吉祥物 happy，未通过用 orange+吉祥物 curious
- 进度指示：顶部"第 X/Y 题" + 进度条

**苏格拉底面板**（`SocraticDialogPanel` 升级）：
- 种子问题展示卡片（socraticBlue 边框）
- 对话气泡：用户右对齐(primary)/AI 左对齐(surfaceContainerHighest)，圆角 16
- 输入框 + 发送按钮
- "完成对话"按钮（至少 1 轮后显示）

**继续学习侧栏**（`ContinueLearningSidebar` 升级）：
- 桌面：右侧固定 280px 侧栏，LingxiCard 包裹
- 移动：FAB 触发底部抽屉
- 内容：相关主题列表（LingxiCard onTap + 箭头图标）

**动效**：
- PageView 切换：使用 `Curves.easeInOutCubicEmphasized` + 400ms
- 知识点完成：吉祥物 celebrate + 撒花粒子
- 章节完成：全屏庆祝页 + springTransition

### 4.4 对话页

**当前问题**：气泡宽度固定，无时间戳，苏格拉底开关不显眼，无 typing indicator。

**重设计方案**：

**桌面三栏布局**（≥1024）：
- 左栏（260px）：对话列表（最近对话 + 新建按钮），类似 ChatListPage 但内嵌
- 中栏（自适应，maxWidth 800）：消息区域 + 输入区
- 右栏（280px，可选）：上下文面板（当前对话笔记关联 + 苏格拉底模式说明 + 分级探索历史）

**移动端单栏**：
- AppBar + 消息区域 + 输入区
- 对话切换通过标题点击触发底部 Sheet

**消息气泡设计**：
- 用户气泡：右对齐，primary 背景，onPrimary 文字，不对称圆角（左上16/右上16/左下16/右下4）
- AI 气泡：左对齐，surfaceContainerHighest 背景，MarkdownRenderer 渲染，不对称圆角（左上4/右上16/左下16/右下16）
- 最大宽度：桌面 `maxWidth: 720`（从 680 提升），移动 `maxWidth: screenWidth * 0.8`
- 时间戳：每条消息下方 bodySmall + onSurfaceVariant 色
- AI 头像：气泡左侧 32px 吉祥物头像

**流式光标**：
- 闪烁竖线（保持 500ms 周期）
- 增加 typing indicator：三个圆点波浪动画（AI 正在思考时显示在气泡底部）

**分级探索按钮位置**：
- 仅末条 AI 消息下方显示
- 三按钮使用不同变体：简化(text+compress 图标) / 深入(filled+unfold_more 图标) / 图示(text+image 图标)
- 按钮间距 8px

**苏格拉底开关**：
- AppBar 中使用 Switch + socraticBlue 色 + psychology 图标
- 开启时 AppBar 底部显示提示条："苏格拉底引导模式已开启，AI 将通过提问引导你思考"

**吉祥物联动**：
- AI 思考时：MascotOverlay 在右下角显示 80px thinking 吉祥物（保持现有）
- 流式完成：celebrate 3 秒
- 出错：sad 3 秒

**输入区**：
- 多行 TextField（1-5 行）+ 圆角 16
- 发送按钮：IconButton.filled，有文字时 primary 色，无文字时禁用
- 流式中：停止按钮（error 色）
- 桌面快捷键：Ctrl+Enter 发送（保持现有）

### 4.5 笔记页

**当前问题**：无搜索，标签输入无 Chip 化，编辑器无 Markdown 预览。

**重设计方案**：

**列表页**：
- AppBar + 搜索框（桌面端嵌入 AppBar，移动端展开按钮）
- 标签筛选栏：FilterChip 横向滚动 + "全部"选项
- 桌面：网格（maxCrossAxisExtent 360, ratio 1.1）
- 移动：单列列表
- FAB："新建笔记"

**笔记卡片**（升级）：
- LingxiCard + onTap
- 标题(titleMedium bold) + 内容预览(80字, bodyMedium) + 标签 Chip(info) + 时间(bodySmall)
- 增加：置顶图标（如有）、关联对话图标（如有）

**编辑器**（升级）：
- AppBar：删除 + 保存 + 预览切换（桌面端）
- 标题输入：TextField + headlineSmall 样式
- 内容编辑：桌面端双栏（左编辑/右 Markdown 预览），移动端单栏 + 预览切换按钮
- 标签输入：Chip 化展示 + 输入框添加（替代逗号分隔文本）
- 保存按钮：FilledButton.icon

**动效**：
- 列表项：staggered 淡入
- 卡片点击：scale 0.98 → 1.0 弹性反馈
- 标签筛选：FilteredListView 动画

### 4.6 设置页

**当前问题**：设置项拥挤无折叠，API 配置卡片信息密度高。

**重设计方案**：

**设置主页**（升级）：
- AppBar："设置"
- 分组卡片（保持外观/语言/学习偏好/数据/AI 服务/关于/帮助）
- 每组使用 LingxiCard + `_SectionTitle`
- **改进**：每组可折叠/展开（ExpansionTile 或自定义），默认展开当前正在编辑的组
- 桌面端：双栏布局（左分组列表 + 右选中组详情），类似系统设置
- 移动端：单栏 ListView

**API 配置列表页**（升级）：
- AppBar："API 配置"
- 说明卡片（保持 secondaryContainer 背景 + lock 图标）
- Provider 列表：每个 Provider 一张卡片
- **改进卡片设计**：
  - 头部：Provider 图标(48×48 圆角方块) + 名称 + 状态标签(活跃/非活跃)
  - 中部：Base URL + 模型名（bodySmall）
  - 底部：操作按钮行（设为活跃/编辑/删除）
  - 活跃卡片使用 primaryContainer 背景 + 主色边框
- FAB："添加 Provider"

**Provider 编辑对话框**（保持现有结构，升级样式）：
- 类型下拉 → 自定义 Provider 选择卡片（4 个图标卡片网格）
- Base URL / API Key / 模型输入（保持）
- Temperature / MaxTokens 滑块（保持）
- 测试连接按钮：增加测试结果可视化（成功/失败图标 + 延迟显示）
- 保存按钮：filled

### 4.7 成就页

**当前问题**：徽章用 emoji，无解锁详情，无分类。

**重设计方案**：

**布局**：
- AppBar："成就"
- 统计栏：奖杯图标 + X/总数 + 总进度条（保持现有设计，升级视觉）
- 分类筛选：FilterChip（全部/学习/对话/笔记/探索）— 需在 `AchievementDefinition` 中增加 category 字段
- 徽章网格：移动 3 列 / 平板 4 列 / 桌面 6 列（增加列数）

**徽章卡片**（升级）：
- 使用自定义 SVG 图标替代 emoji（需设计图标集）
- 形状：`octagonLarge`（八角形，升级后）
- 已解锁：金色边框(width 2) + elevation 4 + alpha 0.08 金色背景 + 光芒效果
- 未解锁：灰度 + 锁图标
- 进度环：未解锁时在徽章外圈显示进度环
- 点击：弹出详情对话框（解锁条件 + 解锁时间 + 庆祝动画）

**解锁动画**：
- 新解锁时：全屏粒子撒花 + 吉祥物 celebrate + 徽章 scale 0→1.2→1.0 弹性入场
- 已解锁入场：springTransition(beginScale: 0.85)

### 4.8 统计页

**当前问题**：图表无交互，热力图仅 30 天，无动画。

**重设计方案**：

**布局**：
- AppBar："学习统计"
- 时间范围切换：SegmentedButton（本周/本月/全部）— 保持
- 统计卡片行：4 个卡片（连续天数/苏格拉底对话/笔记数/知识点）— 保持，升级视觉
- **改进图表**：
  - 柱状图：使用 `fl_chart` 替代 CustomPainter，支持点击 tooltip + 渐变柱 + 动画
  - 热力图：扩展为可切换 30 天/365 天视图，点击格子显示详情
  - 课程完成度：水平进度条（保持），增加颜色渐变
- 桌面端：图表双列网格（柱状图+热力图一行，统计卡片+课程完成度一行）

**动效**：
- 图表入场：从 0 增长到目标值的动画（800ms easeOutCubic）
- 统计数字：数字滚动动画
- 时间范围切换：图表平滑过渡

### 4.9 引导页

**当前问题**：文字密集，CTA 行为不一致。

**重设计方案**：

**5 步 PageView**（保持）：
1. 欢迎来到灵犀学院（happy）
2. 自备 API，安全无忧（curious）
3. 点击小犀，发现彩蛋（thinking）
4. 从 L0 到 L4，循序渐进（happy）
5. 苏格拉底式引导（curious）

**每步设计**（升级）：
- 桌面双列：左吉祥物(240px, springTransition) + 右文字(springTransition offset)
- 移动单列：吉祥物(180px) + 文字
- **改进**：增加步骤插图/图标（替代纯文字描述），每步配一个装饰性 SVG 插图
- CTA 按钮统一行为：默认"下一步"，最后一步"开始学习"
- 特殊 CTA（"去设置 API"、"看看路径"）改为次级按钮（text 变体），主 CTA 始终为"下一步"

**底部**：
- 上一页按钮 + 页面指示器（5 胶囊圆点，当前页放大）+ 下一页/开始学习按钮
- **改进**：指示器可点击跳转

**动效**：
- 页面切换：`easeInOutCubicEmphasized` + 400ms
- 吉祥物情绪联动（保持）
- CTA 按钮：springTransition

### 4.10 帮助页

**当前问题**：无搜索，分类全展开过长。

**重设计方案**：

**布局**：
- AppBar："帮助中心" + 搜索图标（桌面端嵌入搜索框）
- 搜索功能：输入关键词，过滤分类和内容
- 分类列表：ExpansionTile（保持），默认全部收起
- 每个分类卡片：图标(40×40 圆角方块) + 标题 + 展开/收起
- 内容：MarkdownRenderer（保持）
- 右下角反馈 FAB（保持）

**桌面端**：
- 双栏：左分类列表 + 右选中分类内容
- 搜索框嵌入 AppBar

**移动端**：
- 单栏：搜索按钮 + 分类列表

### 4.11 空状态

**4 个场景化空状态**：

| 场景 | 吉祥物情绪 | 标题 | 描述 | CTA |
|------|-----------|------|------|-----|
| 无对话 | curious | "还没有对话" | "和小犀开始第一次对话吧" | "开始对话" → /chat |
| 无笔记 | curious | "还没有笔记" | "在学习或对话中，重要内容可一键保存为笔记" | "去学习" → /learning |
| 无成就 | thinking | "还没有成就" | "完成课程和对话，解锁属于你的徽章" | "去学习" → /learning |
| 无 API 配置 | sad | "还没有 API 配置" | "添加第一个 API 配置，开启 AI 对话与学习功能" | "添加配置" → /settings/api |

**设计**：
- 使用 `EmptyStateWidget`（保持现有组件）
- mascotSize: 150（默认）
- 增加装饰性背景：吉祥物后方渐变光晕（mascotPrimary alpha 0.05 圆形）
- CTA 按钮：filled 变体 + arrow_forward 图标
- 整个区域可点击触发吉祥物彩蛋（保持）

---

## 五、响应式断点策略

### 5.1 断点定义

| 类型 | 宽度范围 | 导航形式 | 内容最大宽度 |
|------|----------|----------|-------------|
| Mobile | < 600 | 底部 NavigationBar | 100%（全宽） |
| Tablet | 600-1023 | NavigationRail（可折叠） | 100%（全宽） |
| Desktop | ≥ 1024 | NavigationRail（固定） | 1200px（居中） |

**重要修复**：统一 `app_router.dart` 中 `_AppShell` 的 NavigationRail 切换阈值从 840 改为 1024，与 `Responsive` 保持一致。

### 5.2 移动端（<600）

- **导航**：底部 `NavigationBar`，6 个目的地（首页/学习/对话/笔记/成就/设置）
- **布局**：单栏全宽
- **间距**：紧凑（页面边距 16，卡片内边距 16）
- **AppBar**：居中标题，高度 56
- **FAB**：右下角，距底部 16（避开 NavigationBar）
- **对话框**：全宽底部 Sheet 优先于中央 Dialog
- **网格**：单列列表

### 5.3 平板端（600-1023）

- **导航**：`NavigationRail`（`labelType: all`），宽度 80px，可折叠
- **布局**：双栏（导航 + 内容）
- **间距**：中等（页面边距 24）
- **网格**：2 列
- **侧栏**：可折叠右侧侧栏（如课程页 ContinueLearningSidebar）

### 5.4 桌面端（≥1024）

- **导航**：`NavigationRail`（固定），宽度 80px
- **布局**：三栏（导航 + 主内容 + 侧栏）或宽限居中
- **间距**：宽松（页面边距 32）
- **内容最大宽度**：1200px 居中（对话页 900px → 提升至 1000px）
- **网格**：3-6 列（根据内容）
- **三栏页面**：课程页（章节导航+学习+侧栏）、对话页（对话列表+消息+上下文）、笔记页（标签树+列表+编辑器）
- **键盘导航**：Tab 焦点切换、Enter 确认、Esc 取消

---

## 六、吉祥物视觉升级方案

### 6.1 从 CustomPainter 升级到 Rive 的路径

**当前状态**：`MascotPainter` 使用纯矢量 API 绘制，`RiveMascotWidget` 为空占位。

**升级步骤**：

1. **Rive Editor 设计阶段**：
   - 在 [Rive Editor](https://rive.app) 中创建新项目
   - 导入小犀矢量路径（从 `MascotPainter` 的 Path 数据转换）
   - 建立骨骼系统：头部骨骼、身体骨骼、左/右翅膀骨骼、左/右眼骨骼、嘴巴骨骼
   - 创建 6 个状态机：idle / happy / thinking / sad / celebrate / curious
   - 每个状态机定义动画：骨骼关键帧 + 形变 + 混合模式
   - 设置状态间过渡（blend duration 300ms）

2. **导出 .riv 文件**：
   - 导出为 `mascot.riv`
   - 放置到 `assets/rive/mascot.riv`
   - 在 `pubspec.yaml` 中声明 assets

3. **Flutter 集成**：
   - 添加 `rive` 依赖到 `pubspec.yaml`
   - 实现 `RiveMascotWidget`（替换当前空占位）：
     - 使用 `RiveAnimation.asset('assets/rive/mascot.riv')`
     - 通过 `StateMachineController` 获取 `SMIInput` 控制状态切换
     - 保持与 `MascotWidget` 一致的构造参数（size, mood, onTap, enableTapInteraction）
   - 在 `MascotWidget` 中增加 fallback 逻辑：优先使用 Rive，加载失败时回退到 `MascotPainter`

4. **状态机输入映射**：
   - `SMIInput<String>` mood：idle / happy / thinking / sad / celebrate / curious
   - `SMIInput<bool>` isTap：点击触发
   - `SMITrigger` celebrate：庆祝彩蛋触发
   - `SMIInput<bool>` extraSparkle：额外星光

### 6.2 小犀角色设定细化

**体态**：
- 大头小身体萌系比例（头部占整体 55-60%）
- 圆润的椭圆形身体，无明显四肢
- 身体高度约为画布的 50%
- 头部直径约为画布的 52%

**表情系统**：
- 眼睛：6 种形态（半开/圆睁/^_^^弯/微闭/星形/一大一小）
- 嘴巴：6 种形态（微笑/张嘴/小o/倒弧/?形/大笑）
- 腮红：有/无（sad/thinking 无）
- 眉毛：有/无（sad 有下垂眉毛）
- 附加：泪滴/放大镜/问号

**配件**：
- 学士帽（菱形帽板+帽箍+帽钮+流苏+穗）— 始终佩戴
- 翅膀（左右各一，半透明白色，可独立扇动）
- 头顶小犀角（白→紫渐变三角形）

**翅膀**：
- 形状：羽毛风格，quadraticBezier 曲线
- 颜色：填充 #59FFFFFF + 描边 #99FFFFFF
- 羽脉：两条内部细线
- 翅尖星光：五角星 #FFE082
- 扇动幅度：按 mood 不同（happy 0.28, celebrate 0.32, idle 0.10, sad 0.02）

**星光装饰**：
- 身体上 3 颗小星星（twinkle 闪烁）
- 角尖 1 颗星星
- 环绕 7 颗 ambient 星星（画布边缘分布）
- 庆祝时 10-16 粒撒花（5 色旋转）

### 6.3 六状态机视觉差异

| 状态 | 姿势 | 表情 | 动画曲线 | 附加元素 | 时长 |
|------|------|------|----------|----------|------|
| idle | 轻微上下浮动(±1.5%s) | 半开眼+周期眨眼(0.5-0.58区间)+微笑弧 | sin(2πt) | 腮红+常驻星光 | 3s 循环 |
| happy | 抛物线跳跃(0→8%s→0) | ^_^弯眼+张嘴微笑+舌头 | 4t(1-t)抛物线 | 翅膀大幅扇动(0.28)+腮红 | 1s 循环 |
| thinking | 整体静止+头部点头 | 左眼上看+右眼微闭+o型小嘴 | (1-cos(2πt))/2 | 头顶问号(跟随头部) | 4s 循环 |
| sad | 下沉(1.2%s) | 下垂眼+皱眉(内外高低)+倒弧嘴 | 静态偏移 | 泪滴下滴(sin周期)+无腮红 | 3s 循环 |
| celebrate | 跳跃+缩放(1+5%sin)+旋转(πt) | 星形眼+大张嘴+舌头 | (1-cos(2πt))/2跳跃 + sin缩放 | 10-16粒撒花(5色旋转)+翅膀最大扇动(0.32) | 2s 循环 |
| curious | 轻微浮动+歪头(0.12+0.04sin) | 左小右大眼+?型小嘴 | sin(2πt)浮动 + 0.12+0.04sin歪头 | 右侧放大镜+腮红 | 3s 循环 |

### 6.4 交互彩蛋设计

**现有彩蛋**（保持）：
- 2 秒内连续点击 5 次 → celebrate 3 秒 + extraSparkle 额外 12 粒星光

**新增彩蛋**：
- **点击 10 次**：小犀戴上墨镜 😎 + 撒花 + 显示"你发现了一个秘密！"
- **长按 3 秒**：小犀睡觉 zzz 动画（新增 sleeping 状态）
- **摇晃设备**（Android）：小犀 dizzy 眩晕动画
- **节日彩蛋**：
  - 春节（农历新年）：小犀穿红色唐装 + 烟花撒花
  - 圣诞节（12/25）：小犀戴圣诞帽 + 雪花撒花
  - 生日（用户注册日）：小犀戴生日帽 + 蛋糕出现

### 6.5 吉祥物位置与尺寸规范

| 场景 | 尺寸 | 位置 | enableTapInteraction | mood |
|------|------|------|----------------------|------|
| 首页欢迎区 | 200px | 居中 | true | idle（或全局） |
| AppBar 头像 | 32-40px | leading | true | 全局 |
| 学习路径 AppBar | 40px | actions[0] | true | 全局 |
| 课程页 AppBar | 40px | actions[0] | true | 全局 |
| 空状态 | 150px | 居中 | true | 指定 |
| 引导页（桌面） | 240px | 左列居中 | true | 步骤指定 |
| 引导页（移动） | 180px | 顶部居中 | true | 步骤指定 |
| MascotOverlay（AI 思考） | 80px | bottom:100, right:24 | false | thinking |
| 章节完成庆祝 | 160px | 居中 | true | celebrate |
| 学习卡片主图区 | 96px | 右下角 | false | 全局 |
| 对话页空状态 | 160px | 居中 | false | 全局 |

### 6.6 .riv 文件制作流程

1. **设计阶段**（Rive Editor）：
   - 创建项目，画布 400×400
   - 导入矢量路径（可从 SVG 转换或手动重绘）
   - 建立骨骼层级：root → body → head → (eyes, mouth, horn, cap) + (leftWing, rightWing)
   - 绑定网格：将矢量形状绑定到骨骼
   - 创建 6 个动画状态（每个状态一个时间轴）
   - 创建状态机：定义 6 个状态节点 + 过渡线 + 输入参数

2. **导出**：
   - File → Export → 选择 `.riv` 格式
   - 文件名：`mascot.riv`
   - 大小目标：< 500KB

3. **集成**（Flutter）：
   - `pubspec.yaml` 添加 `rive: ^0.13.0`（或最新版）
   - 声明 `assets/rive/mascot.riv`
   - 实现 `RiveMascotWidget`：
     ```dart
     // 伪代码
     RiveAnimation.asset(
       'assets/rive/mascot.riv',
       artboard: 'mascot',
       fit: BoxFit.contain,
       controllers: [_controller],
     )
     ```
   - 通过 `StateMachineController` 获取 `SMIInput` 控制 mood 切换

4. **Fallback**：
   - `MascotWidget` 内部判断：优先加载 Rive，加载失败/超时回退到 `MascotPainter`
   - 保持 API 完全一致，实现无缝替换

---

## 七、趣味式交互设计清单

### 7.1 微动效清单

| 场景 | 动效 | 参数 | 实现方式 |
|------|------|------|----------|
| 按钮按压 | scale 0.96→1.0 弹性回弹 | fastSpeed spring | `AnimatedScale` 或 `GestureDetector` + `Transform.scale` |
| 卡片悬浮（桌面） | elevation 0→1 + scale 1.0→1.02 | 150ms easeOut | `MouseRegion` + `AnimatedContainer` |
| 卡片点击 | scale 0.98→1.0 | fastSpeed spring | `GestureDetector` + `Transform.scale` |
| 页面切换 | 淡入+滑入 | 300ms easeInOutCubicEmphasized | go_router `CustomTransitionPage` |
| 列表项进入 | staggered 淡入+上移 | 每项延迟 50ms, 300ms easeOut | `AnimatedList` 或自定义 stagger |
| Chip 选中 | 背景色渐变+scale 弹性 | 150ms easeOut | `AnimatedContainer` |
| 进度条填充 | 0→目标值 spring 动画 | defaultSpeed spring | `TweenAnimationBuilder` |
| 开关切换 | track 色渐变+thumb 弹性滑动 | fastSpeed spring | M3 `Switch` 自带 |
| 图标切换（如发送/停止） | crossfade + rotation | 200ms easeOut | `AnimatedSwitcher` |
| 对话气泡出现 | 淡入+上移+scale 0.95→1.0 | defaultSpeed spring | `SpringMotion.springTransition` |
| 底部 Sheet 滑入 | 上移+淡入 | 250ms easeOut | `showModalBottomSheet` 自带 |
| SnackBar 出现 | 下移+淡入 | 250ms easeOut | M3 自带 |
| 数字变化 | 数字滚动 0→目标值 | 600ms easeOutCubic | `TweenAnimationBuilder<int>` |

### 7.2 彩蛋清单

| 触发条件 | 效果 | 实现位置 |
|----------|------|----------|
| 吉祥物连点 5 次（2 秒内） | celebrate 3 秒 + 额外星光 | `MascotWidget._handleTap`（已有） |
| 吉祥物连点 10 次 | 墨镜 😎 + 撒花 + "你发现了一个秘密！" | `MascotWidget._handleTap`（新增） |
| 长按吉祥物 3 秒 | sleeping zzz 动画 | `MascotWidget`（新增 long press） |
| 首次完成课程 | 全屏粒子撒花 + 吉祥物 celebrate + 成就解锁动画 | `LessonPage._buildCelebration`（升级） |
| 连续 7 天打卡 | 火焰特效 + 吉祥物 celebrate + 特殊徽章 | `HomePage._recordStudyActivity`（升级） |
| 首次苏格拉底对话 | 吉祥物 curious + "你迈出了思考的第一步"提示 | `SocraticDialogPanel`（新增） |
| 春节（农历新年） | 吉祥物穿红色唐装 + 烟花撒花 | `MascotPainter`/Rive（新增节日皮肤） |
| 圣诞节（12/25） | 吉祥物戴圣诞帽 + 雪花撒花 | `MascotPainter`/Rive（新增节日皮肤） |
| 用户注册日 | 吉祥物戴生日帽 + 蛋糕出现 | `HomePage`（新增） |

### 7.3 状态联动清单

| 触发事件 | 吉祥物状态 | 持续时间 | 实现位置 |
|----------|-----------|----------|----------|
| AI 发送消息（流式开始） | thinking | 直至流式完成 | `ChatController.sendMessage` → `setAiThinking(true)`（已有） |
| 流式完成 | celebrate | 3 秒 | `ChatController._commitAssistant` → `celebrate()`（已有） |
| 流式出错 | sad | 3 秒 | `ChatController._finishStreamingWithError` → `setMood(sad)`（已有） |
| 知识点完成 | celebrate | 3 秒 | `LessonPage._onKnowledgePointCompleted` → `celebrate()`（已有） |
| 测验答对 | happy | 1.5 秒 | `QuizWidget._submit`（新增 `setMood(happy)`） |
| 测验答错 | curious | 1.5 秒 | `QuizWidget._submit`（新增 `setMood(curious)`） |
| Streak ≥ 3 | happy | 3 秒 | `HomePage._recordStudyActivity`（已有） |
| 成就解锁 | celebrate | 3 秒 | `AchievementService`（新增联动） |
| 笔记保存 | happy | 1.5 秒 | `NoteEditorPage._save`（新增） |
| 空闲超时（30 秒无操作） | idle + 随机俏皮 | 持续 | `MascotController`（新增 timer） |

### 7.4 触觉反馈（Android）

| 场景 | 震动模式 | 实现 |
|------|----------|------|
| 按钮点击 | lightImpact | `HapticFeedback.lightImpact()` |
| 卡片点击 | selectionClick | `HapticFeedback.selectionClick()` |
| 测验答对 | mediumImpact + 100ms 延迟 + lightImpact | `HapticFeedback.mediumImpact()` |
| 测验答错 | heavyImpact | `HapticFeedback.heavyImpact()` |
| 成就解锁 | mediumImpact × 3（间隔 100ms） | 循环调用 |
| 吉祥物连点 5 次彩蛋 | heavyImpact + 200ms + mediumImpact | `HapticFeedback` |
| 拖拽开始/结束 | lightImpact | `HapticFeedback.lightImpact()` |
| 下拉刷新 | selectionClick | `HapticFeedback.selectionClick()` |

**实现方式**：在 `LingxiButton`、`LingxiCard` 的 `onTap` 中注入 `HapticFeedback`。在 `QuizWidget._submit`、`MascotWidget._handleTap` 中添加对应模式。

---

## 八、无障碍设计要求

### 8.1 对比度（WCAG AA）

- **标准**：WCAG 2.1 AA，正文文字对比度 ≥ 4.5:1，大文字（≥18pt 或 14pt bold）≥ 3.0:1
- **验证**：所有浅深色配色组合需通过对比度检查
- **关键检查项**：
  - `onSurface`(#1D1B20) on `surface`(#FEF7FF)：对比度 15.9:1 ✓
  - `onSurfaceVariant`(#49454F) on `surface`(#FEF7FF)：对比度 9.4:1 ✓
  - `onPrimary`(#FFFFFF) on `primary`(#6750A4)：对比度 7.6:1 ✓
  - `streakFire`(#FF5722) on `surface`(#FEF7FF)：对比度 3.4:1（仅用于大文字/图标）
  - `achievementGold`(#FFD700) on `surface`(#FEF7FF)：对比度 1.9:1（仅用于装饰，不用于文字）

### 8.2 字体缩放支持

- **要求**：支持系统字体缩放（`MediaQuery.textScaleFactor`），最大 2.0x
- **实现**：所有文字使用 `theme.textTheme` 样式，不硬编码 fontSize
- **布局适应**：使用 `Flexible`/`Expanded` + `maxLines` + `TextOverflow.ellipsis` 防止溢出
- **测试**：在 0.85x、1.0x、1.3x、2.0x 缩放下验证布局

### 8.3 语义标签（Semantics）

- **要求**：所有交互元素添加 `Semantics` 标签
- **关键场景**：
  - 吉祥物：`Semantics(label: '小犀吉祥物，点击互动', button: true)`
  - 图标按钮：`tooltip` 参数（已有，需补全）
  - 进度条：`Semantics(label: '学习进度 60%')`
  - 图表：`Semantics(label: '学习活动柱状图，最高值 5 次')`
  - 消息气泡：`Semantics(label: 'AI 回复：...')`

### 8.4 键盘导航（桌面端）

- **Tab 焦点**：所有交互元素可通过 Tab 键聚焦，焦点顺序从左到右、从上到下
- **焦点指示器**：2px solid primary 描边 + 4px 圆角
- **快捷键**：
  - `Tab` / `Shift+Tab`：焦点切换
  - `Enter` / `Space`：激活当前焦点元素
  - `Esc`：关闭对话框/取消操作
  - `Ctrl+Enter`：发送消息（对话页，已有）
  - `Ctrl+N`：新建对话（新增）
  - `Ctrl+S`：保存笔记（新增）
- **实现**：使用 `Shortcuts` + `Actions`（参照对话页现有实现）
- **FocusNode**：为关键交互元素分配 `FocusNode`，确保焦点可见

### 8.5 减少动效模式

- **检测**：`MediaQuery.platformAccessibilityFeatures.disableAnimations`
- **行为**：
  - 弹簧动画 → 替换为 150ms 线性淡入
  - 循环动画（吉祥物浮动/星光闪烁）→ 停止
  - 页面切换 → 150ms 淡入淡出（无滑动）
  - 撒花/粒子效果 → 不显示
- **实现**：
  ```dart
  final reduceMotion = MediaQuery.platformAccessibilityFeaturesOf(context)
      .disableAnimations;
  if (reduceMotion) {
    // 使用线性短时长动画
  } else {
    // 使用弹簧动画
  }
  ```
- **更新 `SpringMotion.springTransition`**：内部检测 reduceMotion 并降级

---

## 九、设计交付物清单

### 9.1 Figma 设计板

**需创建的 Figma 页面**：
- **设计 Token 页**：色板（浅/深色）、字体阶梯、间距、圆角、阴影、动效参数
- **组件库页**：LingxiCard / LingxiButton / LingxiChip / LingxiBadge / LingxiAppBar / MarkdownRenderer / EmptyStateWidget / LevelExplorationButtons / MisconceptionSticker（每个组件多状态变体）
- **页面设计页**：首页 / 学习路径页 / 课程页 / 对话页 / 笔记页 / 设置页 / 成就页 / 统计页 / 引导页 / 帮助页（每个页面桌面+移动双版式）
- **吉祥物页**：6 状态机姿势参考、骨骼系统图、彩蛋设计
- **图标集页**：导航图标、操作图标、状态图标、Provider 图标

### 9.2 design-tokens.json

✅ 已创建：`docs/design-tokens.json`（已验证 JSON 语法合法）

包含完整的 color / typography / spacing / radius / elevation / motion / shape / breakpoints / iconography / accessibility 令牌定义。

### 9.3 页面线框图（文字描述版）

✅ 已创建：`docs/page-wireframes/README.md`

包含所有 11 个页面的信息层级、组件选型、交互流、桌面/移动布局差异描述。

### 9.4 吉祥物 .riv 文件

**待制作**：`assets/rive/mascot.riv`

制作流程见 [第六章 6.6 节](#66-riv-文件制作流程)。

### 9.5 图标集（SVG）

**需制作的图标集**：
- 导航图标：首页 / 学习 / 对话 / 笔记 / 成就 / 设置（6 个 × 2 状态 = 12 个）
- 操作图标：发送 / 停止 / 新建 / 删除 / 编辑 / 保存 / 搜索 / 筛选 / 排序 / 更多（10 个）
- 状态图标：完成 / 进行中 / 锁定 / 警告 / 错误 / 成功（6 个）
- Provider 图标：OpenAI / Claude / Gemini / Ollama（4 个）
- 成就徽章图标：根据 `AchievementDefinition` 列表设计（约 10-15 个）
- 吉祥物情绪图标：idle / happy / thinking / sad / celebrate / curious（6 个，用于状态指示）

**格式**：SVG 24×24 viewBox，stroke-width 2，currentColor 继承

### 9.6 插图集

**需制作的插图**：
- **空状态插图**（4 个）：无对话 / 无笔记 / 无成就 / 无 API 配置
- **引导页插图**（5 个）：欢迎 / API 安全 / 彩蛋 / 学习路径 / 苏格拉底
- **章节完成庆祝插图**（1 个）：可用于替换纯吉祥物展示
- **帮助页分类插图**（8 个）：对应 8 个帮助分类

**风格**：与吉祥物一致的萌系圆润风格，使用 mascotPrimary + mascotSecondary 配色

---

## 附录：关键代码文件索引

| 文件 | 路径 | 说明 |
|------|------|------|
| AppTheme | `lib/core/theme/app_theme.dart` | 主题定义 |
| LingxiColors | `lib/core/theme/lingxi_colors.dart` | 自定义颜色扩展 |
| ShapeVariants | `lib/core/theme/shape_variants.dart` | 35 种形状变体 |
| SpringMotion | `lib/core/motion/spring_motion.dart` | 弹簧动效 |
| Responsive | `lib/shared/utils/responsive.dart` | 响应式工具 |
| LingxiCard | `lib/shared/widgets/lingxi_card.dart` | 卡片组件 |
| LingxiButton | `lib/shared/widgets/lingxi_button.dart` | 按钮组件 |
| LingxiChip | `lib/shared/widgets/lingxi_chip.dart` | Chip 组件 |
| LingxiBadge | `lib/shared/widgets/lingxi_badge.dart` | 徽章组件 |
| LingxiAppBar | `lib/shared/widgets/lingxi_app_bar.dart` | AppBar 组件 |
| MarkdownRenderer | `lib/shared/widgets/markdown_renderer.dart` | Markdown 渲染 |
| EmptyStateWidget | `lib/shared/widgets/empty_state_widget.dart` | 空状态 |
| LevelExplorationButtons | `lib/shared/widgets/level_exploration_buttons.dart` | 分级探索按钮 |
| MisconceptionSticker | `lib/shared/widgets/misconception_sticker.dart` | 误解贴纸 |
| MascotPainter | `lib/features/mascot/mascot_painter.dart` | 吉祥物绘制 |
| MascotWidget | `lib/features/mascot/mascot_widget.dart` | 吉祥物组件 |
| MascotState | `lib/features/mascot/mascot_state.dart` | 吉祥物状态枚举 |
| MascotController | `lib/features/mascot/mascot_controller.dart` | 吉祥物控制器 |
| MascotOverlay | `lib/features/mascot/mascot_overlay.dart` | 吉祥物浮层 |
| RiveMascotWidget | `lib/features/mascot/rive_mascot_widget.dart` | Rive 吉祥物（占位） |
| AppRouter | `lib/core/router/app_router.dart` | 路由+导航壳 |
| HomePage | `lib/features/home/home_page.dart` | 首页 |
| LearningPathPage | `lib/features/learning/learning_path_page.dart` | 学习路径页 |
| LessonPage | `lib/features/learning/lesson_page.dart` | 课程页 |
| LearningCardWidget | `lib/features/learning/widgets/learning_card_widget.dart` | 学习卡片 |
| QuizWidget | `lib/features/learning/widgets/quiz_widget.dart` | 测验组件 |
| SocraticDialogPanel | `lib/features/learning/widgets/socratic_dialog_panel.dart` | 苏格拉底面板 |
| ContinueLearningSidebar | `lib/features/learning/widgets/continue_learning_sidebar.dart` | 继续学习侧栏 |
| ChatPage | `lib/features/chat/chat_page.dart` | 对话页 |
| ChatController | `lib/features/chat/chat_controller.dart` | 对话控制器 |
| ChatListPage | `lib/features/chat/chat_list_page.dart` | 对话列表页 |
| NotesPage | `lib/features/notes/notes_page.dart` | 笔记列表页 |
| NoteEditorPage | `lib/features/notes/note_editor_page.dart` | 笔记编辑器 |
| SettingsPage | `lib/features/settings/settings_page.dart` | 设置页 |
| ApiSettingsPage | `lib/features/settings/api_settings_page.dart` | API 配置页 |
| ProviderEditDialog | `lib/features/settings/provider_edit_dialog.dart` | Provider 编辑对话框 |
| AchievementsPage | `lib/features/progress/achievements_page.dart` | 成就页 |
| StatisticsPage | `lib/features/progress/statistics_page.dart` | 统计页 |
| OnboardingPage | `lib/features/onboarding/onboarding_page.dart` | 引导页 |
| ApiSetupWizardPage | `lib/features/onboarding/api_setup_wizard_page.dart` | API 设置向导 |
| HelpCenterPage | `lib/features/help/help_center_page.dart` | 帮助页 |
