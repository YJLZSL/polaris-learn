# 灵犀学院 — AI 协作者交接文档

> 本文档面向接手后续开发的 AI 协作者，记录项目当前状态、待完成事项、以及后续更新打磨的规范化流程。
>
> **最后更新**：2026-07-14
> **当前版本**：v0.1.0（baseline）→ 已完成全面开发计划 Phase 0-5

---

## 一、项目概况

| 项 | 说明 |
|----|------|
| 项目名称 | 灵犀学院（Lingxi Academy） |
| GitHub 仓库 | https://github.com/YJLZSL/polaris-learn |
| 技术栈 | Flutter 3.44.4 / Dart 3.12.2 |
| 目标平台 | Android + Windows（macOS 支持但非优先） |
| 状态管理 | flutter_riverpod 2.5.x |
| 数据库 | Drift（SQLite），当前 schema v3 |
| AI 集成 | 4 Provider（OpenAI/Anthropic/Gemini/Ollama）+ SSE 流式 |

---

## 二、当前 Git 状态

```
分支：
  main     — 主分支（已推送到 GitHub master + main）
  develop  — 开发分支

标签：
  v0.1.0   — baseline 标记

提交历史（8 commits）：
  d1e40a9  feat: learning pace reminder, onboarding profile setup, guide bubble
  1598702  feat: implement RiveMascotWidget with fallback to CustomPainter
  05061a9  feat: dependabot, PR template, course contrib guide, DailyPlanWidget
  336d481  feat: confusion detection, desktop chat layout, final Phase 2-3 items
  0ed6a3a  feat: Phase 3-5 - UI components, learning events, spaced repetition, CI
  96e07b1  feat: add recommendation engine, AGENTS.md behavioral specs
  941f2c9  feat: Phase 0-2 implementation - courses, prompts, learner profile
  9f55b97  chore: initial commit - Lingxi Academy v0.1.0 baseline
```

---

## 三、已完成的工作

### Phase 0 — 基础修复
- [x] Git 仓库初始化 + v0.1.0 tag + develop 分支
- [x] 首页硬编码数据替换为真实 CourseRepository + ProgressRepository
- [x] 冗余 `features/achievements/achievements_page.dart` 删除
- [x] 响应式断点确认统一为 1024px
- [x] CI workflow 确认可运行

### Phase 1 — 课程内容
- [x] `KnowledgePoint` 新增 difficulty / estimatedMinutes / prerequisites 字段
- [x] `schema.json` 同步更新
- [x] L0 Python 课程扩展至 4 模块 17 知识点
- [x] L1 Python 数据结构课程新建（4 模块）
- [x] CONTRIBUTING.md 添加课程贡献指南 + PR Review Checklist

### Phase 2 — 智能引导
- [x] `LearnerProfiles` Drift 表 + Repository + Provider
- [x] `LearnerProfileSetupPage`（Onboarding 画像采集）
- [x] `RecommendationService`（规则推荐引擎）
- [x] `DailyPlanWidget`（每日学习计划）
- [x] `ConfusionDetectionService`（困惑检测 + 自适应降级）
- [x] `LearningPaceReminder`（Streak 鼓励/休息建议）
- [x] `GuideBubble`（首次使用引导气泡）
- [x] 多年龄段苏格拉底 Prompt（young_learner + advanced）
- [x] `PromptManager` 扩展 `LearnerAgeGroup`

### Phase 3 — UI/UX
- [x] `RiveMascotWidget` 实现（含 CustomPainter fallback）
- [x] `LingxiTextField` / `LingxiDialog` / `LingxiToast` 组件
- [x] `ChatDesktopLayout`（桌面端对话双栏布局）

### Phase 4 — 数据智能
- [x] `LearningEvents` Drift 表 + `LearningEventRepository`
- [x] `SpacedRepetitionService`（遗忘曲线 1/3/7/14/30 天）

### Phase 5 — 质量保证
- [x] CI 增强（dart fix + coverage + artifact upload）
- [x] `.github/dependabot.yml`
- [x] `.github/pull_request_template.md`
- [x] AGENTS.md 补充（AI 行为规范 + 课程编写规范 + 吉祥物规范 + 性能预算）

---

## 四、待完成事项（后续 AI 接手）

### 紧急 — GitHub 仓库设置（需人工操作）

1. **修改仓库描述**：
   - 位置：https://github.com/YJLZSL/polaris-learn → About 齿轮图标
   - 新描述：`灵犀学院 — 开源 AI 学习应用 | Flutter 跨端（Android + Windows）| 苏格拉底式引导 | 用户自备 LLM Key | 课程+对话+笔记+成就`

2. **删除旧 Releases**：
   - 位置：https://github.com/YJLZSL/polaris-learn/releases
   - 旧标签已删除（v1.0.0-v5.0.0），但 Release 条目可能仍存在
   - 操作：逐个进入 release → Delete

3. **设置默认分支**：
   - 考虑将默认分支从 `master` 改为 `main`（Settings → Branches → Default branch）
   - 或者删除多余的 `main` 分支只保留 `master`

### 高优先级 — 代码完善

| 任务 | 说明 | 涉及文件 |
|------|------|----------|
| Drift 代码生成 | 新增的表需要重新生成 `database.g.dart` | 运行 `flutter pub run build_runner build --delete-conflicting-outputs` |
| L0 课程补全至 20 KP | 当前 17 个知识点，需补 3 个 | `assets/courses/l0_python_basics.json` |
| README 仓库链接更新 | 徽章 URL 从 `lingxiacademy/lingxi-academy` 改为 `YJLZSL/polaris-learn` | `README.md` |
| 首页集成 LearningPaceReminder | 已创建但未嵌入 home_page.dart | `lib/features/home/home_page.dart` |
| 首页集成 DailyPlanWidget | 已创建但未嵌入 home_page.dart | `lib/features/home/home_page.dart` |
| Onboarding 集成 LearnerProfileSetupPage | 已创建但未集成到引导流程 | `lib/features/onboarding/onboarding_page.dart` |
| 学习页集成 GuideBubble | 已创建但未嵌入 lesson_page.dart | `lib/features/learning/lesson_page.dart` |

### 中优先级 — 功能深化

| 任务 | 说明 |
|------|------|
| L2 课程创建 | AI 基础概念 + Prompt 工程（5 模块 × 4 课时） |
| L3 课程创建 | AI 应用开发（API 调用、Agent 构建） |
| L4 课程创建 | AI 系统设计 + 开源贡献 |
| 统计页增强 | 知识点热力图、测验正确率折线图（需引入 fl_chart） |
| PDF 导出 | 学习报告 PDF 导出（需引入 pdf package） |
| 测试补充 | Widget 测试覆盖 lingxi_* 组件、集成测试覆盖核心旅程 |

### 低优先级 — 锦上添花

| 任务 | 说明 |
|------|------|
| Rive 动画文件 | 需用 Rive Editor 设计 `assets/rive/lingxi_mascot.riv`（代码已就绪） |
| 国际化 | 英文支持（当前仅中文） |
| NavigationBar 指示器动画 | 添加滑动过渡效果 |
| Semantics 可访问性 | 所有交互元素添加语义标签 |
| 暗色模式对比度审计 | 确保 >= 4.5:1 |

---

## 五、后续更新流程规范

### 分支策略

```
main/master  ← 稳定发布版本
  └── develop  ← 开发集成
       ├── feature/xxx  ← 功能开发
       ├── fix/xxx      ← Bug 修复
       └── docs/xxx     ← 文档更新
```

### Commit 规范

遵循 Conventional Commits：
```
<type>(<scope>): <description>

类型：feat / fix / docs / style / refactor / test / chore
范围：core / data / features/chat / shared / assets / ci
```

### PR 流程

1. 从 `develop` 创建 feature 分支
2. 开发完成后提交 PR 到 `develop`
3. PR 模板已配置（`.github/pull_request_template.md`）：需填写影响模块 + 测试验证方式
4. CI 自动运行 `flutter analyze` + `flutter test --coverage`
5. Review 通过后 merge

### 版本发布流程

1. `develop` 积累足够功能后 merge 到 `main`
2. 在 `main` 上打 tag（如 `v0.2.0`）
3. push tag 触发 `release.yml` 自动构建 Android APK + Windows zip + macOS DMG
4. GitHub Release 自动创建

### 新功能开发检查清单

- [ ] 阅读 `AGENTS.md` 相关章节
- [ ] 新增依赖确认支持 Android + Windows + macOS 三端
- [ ] 不引入 API Key 到代码/日志/导出
- [ ] 使用 `debugPrint` 而非 `print`
- [ ] Drift 表变更递增 `schemaVersion` + 添加 migration
- [ ] 新 Provider 在 `db_providers.dart` 注册
- [ ] 新路由在 `route_names.dart` + `app_router.dart` 添加
- [ ] 运行 `flutter analyze` 零 error
- [ ] 运行 `flutter test` 通过
- [ ] 修改了 Drift/Riverpod 注解后运行 `build_runner build`

---

## 六、关键文件索引

| 文件 | 说明 |
|------|------|
| `AGENTS.md` | AI 协作者完整规范（944 行） |
| `README.md` | 项目主文档 |
| `CONTRIBUTING.md` | 贡献指南 + 课程内容贡献规范 |
| `docs/architecture.md` | 架构设计（五层分层、数据流、AI 调用） |
| `docs/mascot-design.md` | 吉祥物设计规范 |
| `docs/design-tokens.json` | 设计令牌（颜色/字体/间距） |
| `docs/frontend-redesign-guide.md` | 前端重设计指南 |
| `.github/workflows/ci.yml` | CI 流水线 |
| `.github/workflows/release.yml` | Release 构建流水线 |
| `.github/dependabot.yml` | 自动依赖更新 |
| `.github/pull_request_template.md` | PR 模板 |
| `pubspec.yaml` | 依赖声明 |
| `lib/data/db/database.dart` | Drift 数据库定义（10 表，schema v3） |

---

## 七、安全提醒

以下为强制约束（详见 AGENTS.md 安全红线章节）：

1. **API Key 只存 SecureStorage**，绝不入数据库/日志/导出文件
2. **所有 Dio 请求经过 SecureLogInterceptor** 自动脱敏
3. **DataExportService 的 toJson() 不含 apiKey**（有 assert 断言）
4. **.gitignore 包含** `*.keystore`、`*.jks`、`*.env`
5. **不在代码中硬编码任何真实 API Key**

---

## 八、构建验证命令

```bash
# 安装依赖
flutter pub get

# 代码生成（Drift / Riverpod）
flutter pub run build_runner build --delete-conflicting-outputs

# 静态分析
flutter analyze

# 运行测试
flutter test

# 构建 Android
flutter build apk --release --split-per-abi

# 构建 Windows
flutter build windows --release
```

---

*本交接文档为后续 AI 协作者的起点参考。开始工作前请先阅读 AGENTS.md 完整规范。*
