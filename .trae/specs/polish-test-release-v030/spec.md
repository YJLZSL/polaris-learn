# v0.3.0 打磨·测试·发布 Spec

## Why

v0.2.0 已完成美术与动画的基础加固（LingxiGradients.dark / _MascotPainter 精细化 / SpringMotion M3 对齐 / ChatController 动态节流），但仍有以下遗留问题影响项目达到"生产就绪"品质：

1. **版本序列混乱**：GitHub Releases 同时存在 v2.0.0 / v2.1.0 / v3.0.0 / v5.0.0（fork 前原项目遗留）与 v0.1.0 / v0.2.0（本项目发布），用户难以识别真正的最新版本
2. **动画细节仍有 jank 风险**：v0.2.0 修复了显式动画组件，但页面间共享元素过渡、列表滚动优化、Hero 动画等高级动画手段未应用
3. **测试覆盖缺口**：仅 14 个测试文件，吉祥物情绪联动、Streak 计数边界、苏格拉底模式持久化、ConfusionDetection、SpacedRepetition、Recommendation 等核心业务逻辑未覆盖
4. **Rive 资源未完成**：`assets/rive/lingxi_mascot.riv` 不存在，吉祥物只能用 CustomPainter fallback，无法体现 Rive 矢量动画的丝滑优势
5. **功能验证缺失**：v0.2.0 因 Flutter SDK 不可用仅做静态审查，未真正运行测试与 UI 验证

本 spec 旨在系统性解决上述遗留，发布 v0.3.0 作为真正的"灵动丝滑 + 功能验证"版本。

## What Changes

### 阶段一：仓库版本序列治理
- 删除 GitHub 上 fork 前遗留的旧 Release（v2.0.0 / v2.1.0 / v3.0.0 / v5.0.0），保留 v0.1.0 / v0.2.0 / v0.3.0 清晰序列
- 删除对应远端 tag（若存在）
- 在 README 与 AGENTS.md 中明确版本演进历史
- **不破坏**：git commit 历史与本地 tag 完整保留，仅清理 GitHub Release 页面

### 阶段二：美术细节继续打磨
- **Hero 共享元素动画**：首页吉祥物 → 学习路径页 / 对话页的视觉延续（`Hero` widget + 自定义 flightShuttleBuilder）
- **页面过渡升级**：GoRouter 的 `pageBuilder` 使用 `CustomTransitionPage` + `SpringMotion.slideFadeTransition`，统一三端过渡曲线
- **微交互细化**：
  - `LingxiButton` 按压添加 scale 0.96 + 海拔阴影动态变化
  - `LingxiCard` 按压添加 scale 0.99 + 阴影抬升
  - `LingxiChip` / `LingxiBadge` 选中态添加 AnimateSwitcher 过渡
- **暗色模式视觉调优**：审计所有 `LingxiColors.dark` 语义色在 OLED 屏幕的可读性，必要时引入 `trueBlack`（0xFF000000）背景策略
- **图标系统统一**：所有功能图标改用 `LingxiIcons` 语义化封装（不再散落 `Icons.xxx`），统一 Material Symbols Rounded 字重
- **空状态插画升级**：`empty_state_widget.dart` 的 `_TwinklingStar` 升级为 Lottie 风格多粒子动画（保留 CustomPainter 实现）

### 阶段三：动画流畅度深度优化
- **列表滚动性能**：
  - `chat_list_page.dart` / `notes_page.dart` / `learning_path_page.dart` 的 ListView 添加 `itemExtent` 与 `cacheExtent` 调优
  - 复杂列表项使用 `RepaintBoundary` 包裹
- **图片与资源懒加载**：所有 `Image.asset` 改用 `precacheImage` + `frameTiming` 监听
- **动画帧率监控**：在 `main.dart` 添加 `debugProfileBuildsEnabled` 与 `PerformanceOverlay` 入口（仅 debug 模式）
- **`SpringMotion` 微调**：fastSpeed 当前 151ms 略超 150ms 目标，调整为完全符合 M3 规范
- **`PageView` 滑动手感**：`lesson_page.dart` 的 PageView 添加 `BouncingScrollPhysics` 与自定义 `pageSnapping` 阈值

### 阶段四：测试补全与功能验证
- **新增单元测试**：
  - `test/features/mascot/mascot_controller_test.dart`：6 种情绪切换、彩蛋触发、mounted 检查
  - `test/features/progress/streak_service_edge_test.dart`：跨日边界、时区、补卡逻辑
  - `test/features/ai/confusion_detection_service_test.dart`：困惑检测阈值与降级
  - `test/features/progress/spaced_repetition_service_test.dart`：间隔重复算法
  - `test/features/recommendation/recommendation_service_test.dart`：推荐引擎
  - `test/features/learning/course_level_extensions_test.dart`：级别色映射
  - `test/core/motion/spring_motion_test.dart`：6 档弹簧参数与 reduceMotion 降级
- **新增 widget 测试**：
  - `test/widget/lingxi_button_test.dart`：按压动画 + 状态回调
  - `test/widget/lingxi_card_test.dart`：阴影层级 + 按压反馈
  - `test/widget/mascot_widget_test.dart`：6 种情绪绘制差异
- **Chrome DevTools UI 验证**（本机 Flutter SDK 不可用时）：
  - 通过 `chrome-devtools` 插件加载 GitHub Pages 上的 Flutter Web 预览（若有）
  - 或验证 README 中的截图与实际 UI 一致
- **静态代码审查**：
  - Grep 扫描所有 `AnimationController` 的 `dispose()` 调用
  - Grep 扫描所有 `setState` 在 `mounted` 检查后调用
  - Grep 扫描所有 `Navigator.push` 是否有对应的返回处理

### 阶段五：Rive 吉祥物资源开发（可选）
- 评估 Rive 矢量动画开发的可行性
- **若可行**：创建 `assets/rive/lingxi_mascot.riv` 文件，激活 `RiveMascotWidget`，移除 `_MascotPainter` fallback
- **若不可行**：保留 `_MascotPainter` 作为永久方案，更新文档说明
- 本 spec 默认采用"保留 fallback"策略，Rive 开发作为后续独立 spec

### 阶段六：文档同步与 GitHub Release v0.3.0
- 同步更新 `AGENTS.md`：
  - 新增"版本演进历史"章节
  - 新增"动画性能预算"细化说明（60fps 监控方法）
  - 已知技术债更新（移除已完成项，新增 Rive 待定）
- 同步更新 `docs/代码百科.md`：动画系统、测试体系章节
- 同步更新 `README.md`：版本徽章升级 v0.3.0、新增"动画亮点"展示
- 升级 `lib/core/constants/app_constants.dart` 中 `kAppVersion` 为 `'0.3.0'`
- 升级 `pubspec.yaml` `version: 0.3.0+1` 与 `msix_version: 0.3.0.0`
- 使用 `trae-remote-official:github` 插件创建 GitHub Release v0.3.0：
  - 中文 Release notes，总结 4 大方向优化（版本治理 / 美术打磨 / 动画丝滑 / 测试补全）
  - 因 Flutter SDK 不可用，**不附带构建产物**（仅源代码 Release）
  - 需用户授权 GitHub 插件访问权限

## Impact

- **Affected specs**:
  - `art-animation-polish-and-release`（已完成，本 spec 在其基础上继续打磨）
  - `enhance-backend-reliability`（部分任务未完成，本 spec 不影响但其测试补全可对齐）
  - `build-lingxi-academy`（视觉规范部分需同步）
- **Affected code**:
  - `lib/core/motion/spring_motion.dart`（fastSpeed 微调）
  - `lib/core/motion/page_transitions.dart`（Hero 与共享元素）
  - `lib/core/theme/lingxi_colors.dart`（暗色 trueBlack 策略）
  - `lib/core/router/app_router.dart`（CustomTransitionPage 升级）
  - `lib/shared/widgets/lingxi_button.dart`（按压动画细化）
  - `lib/shared/widgets/lingxi_card.dart`（按压反馈）
  - `lib/shared/widgets/empty_state_widget.dart`（粒子动画升级）
  - `lib/features/home/home_page.dart`（Hero 动画）
  - `lib/features/chat/chat_list_page.dart`（ListView 性能优化）
  - `lib/features/learning/lesson_page.dart`（PageView 手感调优）
  - `lib/core/constants/app_constants.dart`（版本号）
  - `pubspec.yaml`（版本号）
  - `test/`（新增 10+ 测试文件）
- **Affected docs**: `AGENTS.md`、`docs/代码百科.md`、`README.md`
- **Affected GitHub**: 删除 4 个旧 Release（v2.0.0 / v2.1.0 / v3.0.0 / v5.0.0），创建 v0.3.0 Release

## ADDED Requirements

### Requirement: 版本序列清晰化

项目 GitHub Releases SHALL 仅包含 v0.1.0 / v0.2.0 / v0.3.0 三个版本，fork 前遗留的 v2.0.0 / v2.1.0 / v3.0.0 / v5.0.0 SHALL 被删除，避免用户混淆。

#### Scenario: 用户查看 Releases
- **WHEN** 用户访问 https://github.com/YJLZSL/polaris-learn/releases
- **THEN** 仅看到 v0.1.0 / v0.2.0 / v0.3.0 三个 Release
- **AND** Latest 指向 v0.3.0
- **AND** 每个 Release notes 包含中文说明

### Requirement: Hero 共享元素动画

首页吉祥物 SHALL 通过 `Hero` widget 与学习路径页 / 对话页的吉祥物建立共享元素动画，确保页面切换时吉祥物视觉延续。

#### Scenario: 页面切换
- **WHEN** 用户从首页点击"学习路径"或"对话"入口
- **THEN** 吉祥物以 Hero 动画从首页位置飞向目标页面位置
- **AND** 飞行过程中使用 `SpringMotion.gentleSpeed` 曲线
- **AND** `reduceMotion` 为 true 时降级为即时切换

### Requirement: 按压微交互统一

所有 `LingxiButton` / `LingxiCard` / `LingxiChip` SHALL 在按压时提供统一的视觉反馈：
- `LingxiButton`：scale 0.96 + 阴影抬升
- `LingxiCard`：scale 0.99 + 阴影抬升
- `LingxiChip`：scale 0.95 + 背景色变化

#### Scenario: 用户按压
- **WHEN** 用户按下 `LingxiButton`
- **THEN** 按钮以 `SpringMotion.fastSpeed` 缩小至 0.96
- **AND** 释放后以 `SpringMotion.defaultSpeed` 回弹至 1.0
- **AND** 按压过程阴影从 `subtle` 抬升至 `elevated`

### Requirement: 测试覆盖补全

项目 SHALL 新增以下测试文件并覆盖核心业务逻辑：
- `mascot_controller_test.dart`：6 种情绪切换 + 彩蛋触发
- `streak_service_edge_test.dart`：跨日边界 + 时区
- `confusion_detection_service_test.dart`：困惑检测
- `spaced_repetition_service_test.dart`：间隔重复
- `recommendation_service_test.dart`：推荐引擎
- `course_level_extensions_test.dart`：级别色映射
- `spring_motion_test.dart`：弹簧参数 + reduceMotion
- `lingxi_button_test.dart`：按压动画
- `lingxi_card_test.dart`：阴影层级
- `mascot_widget_test.dart`：6 种情绪绘制

#### Scenario: 测试运行
- **WHEN** 在 Flutter SDK 可用环境运行 `flutter test`
- **THEN** 所有测试通过
- **AND** 覆盖率较 v0.2.0 提升 ≥10 个百分点

### Requirement: GitHub Release v0.3.0

项目 SHALL 通过 `trae-remote-official:github` 插件创建 `v0.3.0` GitHub Release，包含中文 Release notes。

#### Scenario: 创建 Release
- **WHEN** 所有优化与测试补全完成
- **THEN** 使用 github 插件创建 `v0.3.0` Release
- **AND** Release notes 包含 4 大方向优化总结（版本治理 / 美术打磨 / 动画丝滑 / 测试补全）
- **AND** 因 Flutter SDK 不可用，不附带构建产物（仅源代码 Release）
- **AND** Release notes 明确说明本机验证限制与推荐 CI 验证方式

## MODIFIED Requirements

### Requirement: SpringMotion 弹簧参数 M3 对齐

`SpringMotion` 的 6 档弹簧规格 SHALL 完全对齐 Material Motion 3 规范：
- `microSpeed`：duration ≤ 100ms（保持）
- `fastSpeed`：duration ≤ 150ms（v0.2.0 为 151ms，本 spec 修复）
- `defaultSpeed`：duration ≤ 200ms（保持）
- `gentleSpeed`：duration ≤ 250ms（保持）
- `slowSpeed`：duration ≤ 300ms（保持）
- `bouncySpeed`：允许超调，duration ≤ 350ms（保持）

### Requirement: 仓库版本治理

项目仓库 SHALL 保持清晰的版本演进序列，fork 前遗留的旧 Release SHALL 被清理，仅保留本项目实际发布的版本。

## REMOVED Requirements

### Requirement: GitHub Releases 保留 fork 前历史

**Reason**: v2.0.0 / v2.1.0 / v3.0.0 / v5.0.0 来自 fork 前的原项目，与当前灵犀学院代码库无任何代码关联，保留会误导用户认为这些版本属于本项目。
**Migration**: 删除 4 个旧 Release 及对应 tag（若存在），在 README 中明确版本演进历史。

### Requirement: kAppVersion = '0.2.0'

**Reason**: 本次美术打磨 + 测试补全 + 动画优化需版本号升级以反映变更。
**Migration**: `kAppVersion` 升级为 `'0.3.0'`，GitHub Release 标签为 `v0.3.0`，pubspec.yaml version 升级为 `0.3.0+1`，msix_version 升级为 `0.3.0.0`。
