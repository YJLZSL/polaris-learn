# 仓库整理·双端专注·前端审查·CI 构建发布 Plan

## 摘要

将灵犀学院从"Android + Windows + macOS 三端"收敛为"Android + Windows 双端"，整理 GitHub 仓库元信息与文档描述，全面审查前端功能/视觉/动画/响应式无障碍实现，最终触发 CI 构建并附带产物到 GitHub Release v0.4.0。

---

## 当前状态分析（基于 Phase 1 探索）

### 仓库元信息缺失
- GitHub `description` 未设置（空）
- GitHub `homepage` 未设置（空）
- GitHub `topics` 未设置
- GitHub 默认分支为 `master`，但项目实际使用 `main`（本地与 origin/main 均已活跃，origin/master 为 stale 分支）

### macOS 支持现状（全链路就位，需彻底移除）
- `macos/` 目录存在且完整（Xcode 工程 + entitlements + AppIcon 全尺寸）
- `pubspec.yaml` 中 `flutter_launcher_icons.macos: true`
- `.github/workflows/release.yml` 含 `build-macos` job
- `lib/core/theme/app_theme.dart` 第 122 行 `TargetPlatform.macOS: ZoomPageTransitionsBuilder()`
- README/AGENTS 文档均宣传 macOS 支持

### 文档与代码差异
- AGENTS.md 写 `_AppShell` 桌面阈值 ≥840，实际代码为 ≥1024
- AGENTS.md 目录约定未列出 `recommendation/` 模块（实际已存在）
- `android/app/build.gradle.kts:37` 有模板默认 TODO 未修改 applicationId

### CI 构建现状
- `release.yml` 触发条件：推送 `v*` tag
- v0.3.0 tag 已推送，但 Release notes 声明"不附带构建产物"
- 需检查 CI 实际运行状态，可能因配置问题失败

### 前端实现待审查点
- 11 个 features 模块 + 18 个 shared/widgets 组件
- 14 个 GoRoute（9 个嵌套在 ShellRoute 下）
- 4 处 TODO（2 个模板默认 + 1 个文档 + 1 个待办测试）

---

## 提议变更

### 阶段一：彻底移除 macOS 支持

#### 1.1 删除 macOS 原生工程目录
- **文件**: `macos/`（整个目录）
- **操作**: 删除
- **原因**: 不再支持 macOS 平台

#### 1.2 移除 pubspec.yaml 中 macOS 配置
- **文件**: `pubspec.yaml`
- **变更**: `flutter_launcher_icons.macos: true` → 移除该行
- **原因**: 不再生成 macOS 图标

#### 1.3 移除 CI 中 macOS 构建任务
- **文件**: `.github/workflows/release.yml`
- **变更**: 删除 `build-macos` job 及 release job 中对 macOS 产物的引用
- **原因**: 不再构建 macOS 产物

#### 1.4 移除代码中 macOS 平台过渡配置
- **文件**: `lib/core/theme/app_theme.dart`
- **变更**: 第 118-126 行 `pageTransitionsTheme` 中移除 `TargetPlatform.macOS: ZoomPageTransitionsBuilder()` 条目
- **原因**: 不再支持 macOS，保留会造成配置冗余
- **注意**: 保留 `TargetPlatform.linux` 和 `TargetPlatform.iOS` 的默认配置无副作用（Flutter 内置回退）

#### 1.5 更新文档移除 macOS 提及
- **文件**: `README.md`
  - Platform 徽章：`Android | Windows | macOS` → `Android | Windows`
  - 下载安装：移除 macOS `.dmg` 说明
  - 构建指南：移除 `flutter build macos --release`
- **文件**: `AGENTS.md`
  - 三端支持：改为"Android + Windows 双端，不包含 iOS / Linux / macOS"
  - 环境要求：移除 macOS 行
  - 构建命令速查：移除 macOS 命令
  - 禁止事项：新增"不要引入仅 iOS/Linux/macOS 可用的依赖"
- **文件**: `docs/代码百科.md`
  - 检查并移除 macOS 相关描述（若有）

### 阶段二：整理 GitHub 仓库元信息

#### 2.1 设置仓库描述
- **操作**: 通过 `gh repo edit YJLZSL/polaris-learn --description "灵犀学院 Lingxi Academy — 引导式 AI 学习应用，苏格拉底式对话为核心，Android + Windows 双端支持"`
- **原因**: 提升仓库可发现性

#### 2.2 设置主页
- **操作**: 通过 `gh repo edit YJLZSL/polaris-learn --homepage "https://github.com/YJLZSL/polaris-learn/releases"`
- **原因**: 指向最新 Release

#### 2.3 设置主题标签
- **操作**: 通过 `gh repo edit YJLZSL/polaris-learn --add-topic flutter,education,ai-learning,socratic,dart,rive,material-3`
- **原因**: 便于 GitHub 搜索分类

#### 2.4 重命名默认分支 master → main
- **操作**: 通过 `gh repo edit YJLZSL/polaris-learn --default-branch main` 将 GitHub 默认分支切到 `main`
- **原因**: 项目实际使用 `main`（本地与 origin/main 均活跃），`master` 为 fork 前遗留的 stale 分支
- **后续**: 删除远端 stale 分支 `git push origin --delete master`（确认无引用后）

#### 2.5 清理 stale 远端 develop 分支（可选）
- **操作**: 评估 `origin/develop` 是否仍有引用，若无则 `git push origin --delete develop`
- **原因**: 仓库应只保留 `main` 一条活跃分支，降低维护成本
- **注意**: 若 develop 分支有未合并的实验性改动，保留并跳过此步

### 阶段三：整理仓库文档描述

#### 3.1 精简 README.md
- **文件**: `README.md`
- **变更**:
  - 精简开场白，突出"双端专注"定位
  - 移除 macOS 相关内容（阶段一已处理）
  - 新增"项目状态"小节（当前版本 v0.4.0、双端支持、CI 状态）
  - 精简"致谢"与"相关文档"列表

#### 3.2 同步 AGENTS.md
- **文件**: `AGENTS.md`
- **变更**:
  - 移除 macOS 相关内容（阶段一已处理）
  - 修正 `_AppShell` 桌面阈值：≥840 → ≥1024（与代码一致）
  - 补充 `recommendation/` 模块到目录约定
  - 新增"v0.4.0 双端专注"到版本演进历史
  - 修正 `android/app/build.gradle.kts` 的 applicationId TODO（若需要）

#### 3.3 同步 docs/代码百科.md
- **文件**: `docs/代码百科.md`
- **变更**: 检查并移除 macOS 提及，补充 recommendation 模块

### 阶段四：前端功能完整性审查

#### 4.1 路由与页面审查
- **操作**: 静态审查 14 个 GoRoute 配置
  - 验证所有 `RouteNames.xxx` 常量与 `xxxPath` 配对完整
  - 验证 redirect 逻辑覆盖 onboarding 引导
  - 验证 ShellRoute 内 9 个主路由的导航壳正确
  - 验证嵌套路由（learning/:courseId/:lessonId、chatList/:conversationId、notes/:noteId）参数传递

#### 4.2 页面状态审查
- **操作**: 静态审查各页面状态管理
  - 验证 ConsumerWidget / ConsumerStatefulWidget 使用规范
  - 验证 ref.watch（build 内）vs ref.read（回调内）使用正确
  - 验证 StateNotifier 的 mounted 检查
  - 验证 FutureProvider 的 invalidate 重建逻辑

#### 4.3 空状态与错误状态审查
- **操作**: 检查各页面的空状态与错误处理
  - 验证 `lib/features/home/empty_states/` 4 个空状态组件被正确引用
  - 验证 AI 请求失败的 ErrorEvent 处理与吉祥物 sad 状态联动
  - 验证数据库查询空结果的友好提示

### 阶段五：frontend-design 视觉设计审查

#### 5.1 调用 frontend-design skill 审查 UI
- **操作**: 使用 `trae-remote-official:frontend-design` skill 审查关键页面
  - 首页（home_page.dart）：hero 区视觉权重、吉祥物尺寸、快捷入口
  - 学习路径页（learning_path_page.dart）：课程卡片色条、进度条、连接线
  - 对话页（chat_page.dart）：消息气泡、流式指示器、苏格拉底开关
  - 课时页（lesson_page.dart）：知识点卡片、测验组件
  - 设置页（settings_page.dart）：表单布局、Provider 编辑
- **审查维度**: 配色一致性、间距节奏、字体层级、阴影深度、动画流畅度
- **产出**: 视觉改进建议清单（若有关键问题则修复，否则记录为后续优化项）

#### 5.2 主题系统一致性验证
- **操作**: 验证 `LingxiColors` / `LingxiGradients` / `LingxiElevations` 三组 ThemeExtension
  - 验证 light/dark 双实例注册正确
  - 验证所有页面通过 `context.lingxiColors` / `context.lingxiGradients` / `context.lingxiElevations` 访问
  - Grep 确认无硬编码颜色残留（除吉祥物矢量绘制固有部分）

### 阶段六：动画与性能审查

#### 6.1 AnimationController 生命周期审查
- **操作**: Grep 扫描所有 `AnimationController` 的 `dispose()` 调用
- **验证**: 19 个文件使用 AnimationController，全部在 dispose() 中释放

#### 6.2 mounted 检查审查
- **操作**: Grep 扫描所有 `Future.delayed` 回调中的 `mounted` 检查
- **验证**: 16 个文件使用 Future.delayed，14 个含 mounted 检查（2 个无 UI 状态豁免）

#### 6.3 RepaintBoundary 隔离审查
- **操作**: Grep 扫描所有 `RepaintBoundary` 使用
- **验证**: 持续动画（_controller.repeat()）全部隔离

#### 6.4 reduceMotion 降级审查
- **操作**: Grep 扫描所有 `MediaQuery.disableAnimationsOf` / `AnimationUtils.reduceMotionOf`
- **验证**: 所有动画组件在 reduceMotion 时正确降级

### 阶段七：响应式与无障碍审查

#### 7.1 响应式布局审查
- **操作**: 静态审查 `_AppShell` 响应式切换
  - 验证桌面端（≥1024）使用 `NavigationRail`
  - 验证移动端（<1024）使用 `NavigationBar`
  - 验证 `chat_desktop_layout.dart` 桌面布局正确触发
  - 验证 `continue_learning_sidebar.dart` 仅桌面端显示

#### 7.2 无障碍审查
- **操作**: 静态审查语义化标签
  - Grep 扫描 `Semantics` widget 使用
  - 验证吉祥物 `MascotWidget` 有语义标签
  - 验证图标按钮有 `tooltip`
  - 验证文字对比度满足 WCAG AA（≥4.5:1）

### 阶段八：版本号升级与 CI 构建发布

#### 8.1 升级版本号至 v0.4.0
- **文件**: `lib/core/constants/app_constants.dart`
  - `kAppVersion: '0.3.0'` → `'0.4.0'`
- **文件**: `pubspec.yaml`
  - `version: 0.3.0+1` → `0.4.0+1`
  - `msix_version: 0.3.0.0` → `0.4.0.0`
- **原因**: 移除 macOS 支持是 breaking change，需 minor 版本升级

#### 8.2 检查 CI 配置正确性
- **文件**: `.github/workflows/release.yml`
- **验证**:
  - `build-android` job 配置正确（APK split-per-abi + AAB + 签名）
  - `build-windows` job 配置正确（Windows 构建 + MSIX + ZIP）
  - `release` job 仅汇总 Android + Windows 产物
  - 触发条件 `v*` tag 正确

#### 8.3 提交并推送 v0.4.0 tag
- **操作**:
  - `git add -A && git commit -m "feat(release): v0.4.0 双端专注版"`
  - `git tag v0.4.0`
  - `git push origin main && git push origin v0.4.0`
- **原因**: 推送 tag 触发 CI 构建工作流

#### 8.4 监控 CI 构建并创建 Release
- **操作**:
  - 通过 `gh run list --workflow=release.yml --limit 3` 监控 CI 运行
  - 等待 build-android 与 build-windows job 完成
  - 通过 `gh release create v0.4.0` 创建 Release（CI 会自动附带产物，或手动上传）
- **验证**: Release 页面包含 APK + MSIX + ZIP 产物

---

## 假设与决策

### 假设
1. GitHub 仓库 `YJLZSL/polaris-learn` 的 admin 权限可用（探索确认 permissions.admin = true）
2. CI 工作流在 Ubuntu runner 上可正常构建 Android/Windows 产物（release.yml 已配置）
3. `gh` CLI 已认证（前序任务已确认）
4. 移除 macOS 不会影响 Android/Windows 构建（三端独立）

### 决策
1. **版本号选择 v0.4.0**：移除 macOS 是 breaking change，需 minor 升级
2. **保留 iOS/Linux 的 pageTransitionsTheme 默认配置**：Flutter 内置回退，移除无副作用但保留更安全
3. **frontend-design 审查以建议为主**：除非发现关键视觉问题，否则不大幅改动 UI（避免引入回归）
4. **CI 构建失败回退**：若 CI 失败，记录失败原因，Release notes 说明限制，不阻塞发布

---

## 验证步骤

### 代码验证
1. Grep 确认 `macos/` 目录已删除（`Glob macos/**` 无结果）
2. Grep 确认 `pubspec.yaml` 无 `macos:` 配置
3. Grep 确认 `.github/workflows/release.yml` 无 `build-macos` job
4. Grep 确认 `lib/core/theme/app_theme.dart` 无 `TargetPlatform.macOS`
5. Grep 确认 README/AGENTS 无 "macOS" 提及（除历史版本说明）

### 仓库元信息验证
1. `gh repo view YJLZSL/polaris-learn --json description,homepageUrl,repositoryTopics,defaultBranchRef` 确认四项已设置且默认分支为 `main`
2. `git ls-remote --heads origin` 确认仅剩 `main` 分支（master/develop 已删除）

### 前端审查验证
1. 路由配置审查报告（14 个 GoRoute 完整）
2. 视觉设计审查报告（frontend-design 产出）
3. 动画性能审查报告（Grep 扫描结果）
4. 响应式无障碍审查报告

### CI 构建验证
1. `gh run list --workflow=release.yml` 确认工作流触发
2. `gh run view <run-id>` 确认 build-android 与 build-windows 成功
3. `gh release view v0.4.0` 确认产物已附带

### 安全红线验证
1. Grep 确认 `SecureStorageService` / `SecureLogInterceptor` / `ProviderConfig.toJson` / `DataExportService` assert / `storeDateTimeAsText` / `.gitignore` 未被修改

---

## 执行顺序

1. **阶段一**：移除 macOS 支持（删除目录 + 修改配置 + 更新文档）
2. **阶段二**：整理 GitHub 仓库元信息（gh repo edit）
3. **阶段三**：整理仓库文档描述（README/AGENTS/代码百科）
4. **阶段四**：前端功能完整性审查（路由/页面/状态）
5. **阶段五**：frontend-design 视觉设计审查
6. **阶段六**：动画与性能审查
7. **阶段七**：响应式与无障碍审查
8. **阶段八**：版本号升级 + CI 构建发布 v0.4.0

阶段四至七可并行执行（审查类任务互不依赖）。
