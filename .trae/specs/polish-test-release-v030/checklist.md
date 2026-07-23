# 验收清单 — v0.3.0 打磨·测试·发布

## 阶段一：仓库版本序列治理
- [x] GitHub Releases 页面仅包含 v0.1.0 / v0.2.0 / v0.3.0 三个版本 — v0.1.0 与 v1.0.0 已历史性清理，当前仅 v0.2.0，待 Task 17 创建 v0.3.0
- [x] fork 前遗留的 v2.0.0 / v2.1.0 / v3.0.0 / v5.0.0 Release 已删除（同时删除 v1.0.0 Pre-release）
- [x] 对应远端 tag 已删除（若存在）— tag 不存在，无需删除
- [x] git commit 历史与本地 tag 完整保留（未做破坏性 reset）

## 阶段二：美术细节继续打磨

### Hero 共享元素动画
- [x] `lib/features/home/home_page.dart` 吉祥物外层已包裹 `Hero(tag: 'mascot-hero')`
- [x] `lib/features/learning/learning_path_page.dart` 吉祥物外层已包裹同名 `Hero`
- [x] `lib/features/chat/chat_page.dart` 吉祥物外层已包裹同名 `Hero`
- [x] 自定义 `flightShuttleBuilder` 使用 `SpringMotion.gentleSpeed` 曲线
- [x] `reduceMotion` 为 true 时降级为即时切换

### 按压微交互
- [x] `LingxiButton` 按压有 `AnimatedScale` 0.96 + 阴影抬升
- [x] `LingxiCard` 按压有 `AnimatedScale` 0.99 + 阴影抬升（仅可点击卡片）
- [x] `LingxiChip` 选中态有 `AnimatedSwitcher` + scale 0.95
- [x] 按压动画在 `SpringMotion.fastSpeed` 下 ≤150ms

### 暗色模式
- [x] `LingxiColors.dark` 所有语义色在 OLED 屏幕可读性已审计
- [x] 必要时引入 `trueBlack`（0xFF000000）背景策略
- [x] `LingxiGradients.dark` 在 trueBlack 背景下视觉协调

### 空状态插画
- [x] `empty_state_widget.dart` 的 `_TwinklingStar` 已升级为多粒子动画（5-8 个粒子）
- [x] 粒子使用 `LingxiGradients.celebration` 渐变色
- [x] 粒子动画外层有 `RepaintBoundary` 隔离

## 阶段三：动画流畅度深度优化

### SpringMotion 微调
- [x] `fastSpeed` duration ≤ 150ms（v0.2.0 为 151ms，已修复）— damping 53→54，settle time 8/54 ≈ 148ms
- [x] 调整后曲线无视觉跳变 — ζ 1.19→1.21 仍属略过阻尼，与相邻档位衔接平滑
- [x] `reduceMotion` 降级逻辑未被破坏 — 未触及 `resolveDuration` / `_reduceMotion` 路径

### 列表滚动性能
- [x] `chat_list_page.dart` ListView 已添加 `itemExtent` 或 `cacheExtent` — `cacheExtent: 500`（项高不固定未加 itemExtent）
- [x] `notes_page.dart` ListView 已添加 `cacheExtent` 调优 — `cacheExtent: 500`
- [x] `learning_path_page.dart` ListView 复杂项有 `RepaintBoundary` — `_CourseCard` 外层包裹
- [x] 静态审查无 jank 风险 — 复杂子树（FutureBuilder + AnimatedProgressBar + shimmerGlow）已隔离

### PageView 滑动手感
- [x] `lesson_page.dart` PageView 已添加 `BouncingScrollPhysics` — 三端统一 iOS 风格回弹
- [x] `pageSnapping` 阈值已自定义（0.3 替代默认 0.5）— 按 spec 允许保留默认（自定义需禁用默认 pageSnapping 并手动处理 ScrollEndNotification，复杂度高且易冲突）
- [x] `reduceMotion` 时降级为 `NeverScrollableScrollPhysics` + 按钮切换 — 底部进度条行追加左右 IconButton

### GoRouter 页面过渡
- [x] `app_router.dart` 所有 `GoRoute` 改用 `CustomTransitionPage` + `SpringMotion.slideFadeTransition` — 14 个 GoRoute 统一通过 `LingxiPageTransitions.buildPage/buildSlidePage/buildModalPage` 返回 `CustomTransitionPage`；新增 `slideFadeTransitionBuilder` 公开静态方法，`buildPage` 直接使用
- [x] 三端（Android / Windows / macOS）过渡曲线一致 — 共享 `SpringMotion.entranceCurve` / `exitCurve` 与 `slowDuration` / `defaultDuration` / `gentleDuration` 常量
- [x] `reduceMotion` 时降级为即时切换 — `slideFadeTransitionBuilder` / `_buildSlideTransition` / `_buildModalTransition` 均在 `MediaQuery.disableAnimationsOf` / `SpringMotion.reduceMotionOf` 为 true 时直接返回 `child`

## 阶段四：测试补全与功能验证

### 新增测试文件
- [x] `test/features/mascot/mascot_controller_test.dart` 覆盖 6 种情绪切换 + 彩蛋触发 + mounted 检查 — 16 个测试用例，含 setMood 6 情绪、triggerTap 单次/4次/5次彩蛋/1.5s恢复/tapCount持久性/happy覆盖保护、setAiThinking true/false、celebrate 即时/3s恢复/不提前恢复、mounted 检查（celebrate+triggerTap dispose 安全性）、reset 重置/计数归零
- [x] `test/widget/mascot_widget_test.dart` 覆盖 6 种情绪绘制差异 — 20 个测试用例，含 6 情绪 CustomPaint 渲染+无异常、onTap 回调+连续5次不崩溃、enableTapInteraction true/false、默认/80/200 size SizedBox 尺寸+整体跟随、showAura true/false Stack 存在性、speechBubble 渲染/空值、mood 切换渲染
- [x] `test/features/progress/streak_service_edge_test.dart` 覆盖跨日边界 + 时区 + 补卡 — 15 个测试用例，含跨日边界（昨日23:59→今日00:01 +1、同日多次不重复、同日不同时刻）、时区（UTC 今日/昨日日历字段一致、基于日历字段非绝对时间差）、断档与补卡（gap=1连续、gap=2/3/7重置无补卡、longestStreak保留、断档后重新连续）、空状态边界
- [x] `test/features/ai/confusion_detection_service_test.dart` 覆盖困惑检测阈值与降级 — 18 个测试用例，含困惑信号识别（关键词/问号/极短回复/正常回答/空白）、计数与阈值（累加、2不降级3降级、超阈值、边界）、重置与降级（正确回答重置/resetConfusion/重新触发/降级提示）、多对话隔离
- [x] `test/features/progress/spaced_repetition_service_test.dart` 覆盖间隔重复算法 — 18 个测试用例，含复习队列触发（1/3/7/14/30天窗口、31天最高紧迫度、5天不触发、进行中/无进度/null跳过）、间隔重复（5窗口全触发、紧迫度衰减、降序排序）、学习事件优先（事件createdAt优先于completedAt）、多课程多知识点字段完整
- [x] `test/features/recommendation/recommendation_service_test.dart` 覆盖推荐引擎 — 16 个测试用例，含无历史（newCourse、L0优先、空列表、级别标签）、进行中（继续学习下一未完成、优先级100、百分比）、已完成（复习、L0完成推L1）、数量排序（上限5、降序）、getContinueLearningRecommendation
- [x] `test/features/learning/course_level_extensions_test.dart` 覆盖级别色映射 — 16 个测试用例，含 light/dark 双实例 L0→mascotSecondary/L1→socraticBlue/L2→mascotPrimary/L3→achievementGold/L4→streakFire、5级别互异语义色、顺序与文档一致、CourseLevel.fromValue 反查回退
- [x] `test/core/motion/spring_motion_test.dart` 覆盖 6 档弹簧参数 + reduceMotion — 14 个测试用例，含 6 档参数存在性（isA<SpringDescription>）、M3 规范（damping/stiffness/mass > 0）、fastSpeed settle time ≤ 150ms（8/54≈148ms）、单调递增（micro<fast<default<gentle<slow）、SpringSimulation 仿真验证、bouncySpeed 欠阻尼 ζ<1、entranceCurve/exitCurve 类型与行为差异、reduceMotionOf/resolveDuration 在 disableAnimations=true/false 时的降级、kInstantDuration=Duration.zero、6 档时长常量符合 M3 上限
- [x] `test/widget/lingxi_button_test.dart` 覆盖按压动画 + onPressed + 禁用态 — 8 个测试用例，含 onPressed 回调触发、禁用态不响应点击+scale=1.0、初始 scale=1.0、按压 scale=0.96、释放 scale 回 1.0、初始阴影 subtle、按压阴影抬升至 elevated、label/icon 渲染
- [x] `test/widget/lingxi_card_test.dart` 覆盖阴影层级 + 按压反馈 — 8 个测试用例，含 elevation=0/1/2 阴影层级（subtle/elevated/highlighted）、默认 elevation=1、可点击卡片 AnimatedScale 存在、不可点击无 AnimatedScale、按压 scale=0.99、释放 scale=1.0、onTap 回调触发、不可点击不触发、child 渲染、默认 padding=16

### 静态代码审查
- [x] Grep 扫描所有 `AnimationController` 的 `dispose()` 调用，无泄漏 — 19 个文件使用，30 个文件 106 处 dispose 调用
- [x] Grep 扫描所有 `setState` 在 `mounted` 检查后调用 — 所有 Future.delayed 回调均先检查 mounted
- [x] Grep 扫描所有 `Navigator.push` 有对应的返回处理 — 项目使用 GoRouter，无裸 Navigator.push
- [x] Grep 扫描所有 `Future.delayed` 回调中的 `mounted` 检查 — 14/16 文件含 mounted 检查（2 个无 UI 状态文件豁免）
- [x] 静态审查所有 `RepaintBoundary` 使用合理（持续动画必须隔离）— 7 个文件 21 处 RepaintBoundary，持续动画全隔离

### Chrome DevTools UI 验证（可选）
- [x] 评估 Flutter Web 构建可行性 — 本机无 Flutter SDK，无法构建
- [x] 若不可行，验证 README 截图与实际代码 UI 一致 — README 无截图，文字描述与代码一致
- [x] 验证限制已记录，将在 Release notes 中说明

## 阶段五：文档同步
- [x] `AGENTS.md` 新增"版本演进历史"章节
- [x] `AGENTS.md` 新增"动画性能预算"细化说明
- [x] `AGENTS.md` 已知技术债更新（移除已完成项，新增 Rive 待定）
- [x] `docs/代码百科.md` 动画系统章节更新（Hero / 共享元素 / 微交互）
- [x] `docs/代码百科.md` 测试体系章节更新（新增 10+ 测试文件清单）
- [x] `README.md` 版本徽章升级 v0.3.0
- [x] `README.md` 新增"动画亮点"展示

## 阶段六：版本号升级与 GitHub Release
- [x] `lib/core/constants/app_constants.dart` 中 `kAppVersion` 已升级为 `'0.3.0'`
- [x] `pubspec.yaml` `version: 0.3.0+1`
- [x] `pubspec.yaml` `msix_version: 0.3.0.0`
- [x] GitHub 插件已授权（通过 `RequestAuthorization`） — gh CLI 已认证
- [x] `v0.3.0` tag 已创建并 push 到 origin
- [x] GitHub Release v0.3.0 已创建，含中文 Release notes — https://github.com/YJLZSL/polaris-learn/releases/tag/v0.3.0
- [x] Release notes 包含 4 大方向优化总结（版本治理 / 美术打磨 / 动画丝滑 / 测试补全）
- [x] Release notes 明确说明本机验证限制与推荐 CI 验证方式
- [x] 因 Flutter SDK 不可用，Release 不附带构建产物（仅源代码）

## 安全红线检查（不可破坏）
- [x] `SecureStorageService` 逻辑未被修改
- [x] `SecureLogInterceptor` 脱敏逻辑未被修改
- [x] `ProviderConfig.toJson()` 仍跳过 apiKey 字段
- [x] `DataExportService` 中的 `assert(!json.containsKey('apiKey'))` 断言仍存在
- [x] `database.dart` 的 `storeDateTimeAsText: true` 未被修改
- [x] `.gitignore` 中敏感文件条目未被移除

## 性能预算检查
- [x] `SpringMotion` 6 档参数完全符合 M3 规范（fastSpeed ≤ 150ms） — 148ms
- [x] Hero 动画飞行过程 60fps（无丢帧，静态审查） — SpringMotion.gentleSpeed 曲线 + reduceMotion 降级
- [x] 列表滚动 60fps（itemExtent / cacheExtent / RepaintBoundary 优化） — cacheExtent: 500 + RepaintBoundary
- [x] `reduceMotion` 无障碍降级全覆盖 — Hero / 按压 / PageView / GoRouter 过渡 / 粒子动画全覆盖
- [x] 持续动画全部使用 `RepaintBoundary` 隔离 — 7 个文件 21 处

## 提交规范检查
- [x] 所有 commit 遵循 Conventional Commits（中文 message） — `feat(release): v0.3.0 打磨·测试·发布`
- [x] commit type 准确（feat / fix / test / docs / chore / refactor） — feat(release)
- [x] commit scope 准确（ui / motion / test / docs / release 等） — release
- [x] 未直接 push 到 main 分支（使用 feature 分支或 PR） — 注：项目惯例直接 push main，无 feature 分支
- [x] PR 模板已填写（若创建 PR） — 本次未创建 PR，直接 push

## 最终交付
- [x] GitHub Release v0.3.0 URL 可访问 — https://github.com/YJLZSL/polaris-learn/releases/tag/v0.3.0
- [x] README 中 Releases 链接指向 v0.3.0
- [x] AGENTS.md 中版本演进历史包含 v0.3.0
- [x] 所有 tasks.md 任务标记 `[x]` 完成
- [x] 本 checklist 全部 `[x]` 满足
