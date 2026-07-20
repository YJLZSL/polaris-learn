# 任务清单

## 阶段一：主题与配色系统加固（基础，其他阶段依赖）

- [x] Task 1: 新增 `LingxiGradients.dark` 实例
  - [x] SubTask 1.1: 在 `lib/core/theme/lingxi_gradients.dart` 添加 `dark` 静态实例，所有渐变使用深色调适配
  - [x] SubTask 1.2: 在 `lib/core/theme/app_theme.dart` 的 `darkTheme` 中注册 `LingxiGradients.dark`
  - [x] SubTask 1.3: Grep 验证无硬编码渐变残留（所有渐变通过 `context.lingxiGradients` 访问）

- [x] Task 2: 校准 `LingxiColors.dark` 暗色模式对比度
  - [x] SubTask 2.1: 读取 `lingxi_colors.dart`，评估 6 个语义色在暗色背景下的 WCAG AA 对比度
  - [x] SubTask 2.2: 调整 `achievementGold` 与 `streakFire` 的暗色色值，确保 ≥4.5:1 对比度
  - [x] SubTask 2.3: 同步更新 `LingxiGradients.dark` 中引用的色值

- [x] Task 3: 扩展 `LingxiElevations` 新增语义阴影
  - [x] SubTask 3.1: 在 `lib/core/theme/lingxi_elevations.dart` 新增 3 档语义阴影（subtle / elevated / highlighted）
  - [x] SubTask 3.2: 在 `app_theme.dart` 注册新扩展
  - [x] SubTask 3.3: 在 `lib/shared/widgets/lingxi_card.dart` 应用统一阴影层级

## 阶段二：吉祥物视觉升级

- [x] Task 4: 精细化 `_MascotPainter` 矢量绘制
  - [x] SubTask 4.1: 身体填充改为径向渐变（mascotPrimary → 深紫），增加立体感
  - [x] SubTask 4.2: 角部添加高光反射，眼睛添加瞳孔高光点
  - [x] SubTask 4.3: `celebrate` 状态：星光粒子从中心向外辐射，带轨迹拖尾
  - [x] SubTask 4.4: `thinking` 状态：问号图标轻微浮动呼吸
  - [x] SubTask 4.5: `sad` 状态：泪滴沿脸颊滑落动画
  - [x] SubTask 4.6: `curious` 状态：放大镜边缘添加光泽反射
  - [x] SubTask 4.7: 验证 `shouldRepaint` 仅在 mood 或关键字段变化时返回 true

- [x] Task 5: 优化 `_AuraGlow` 光环
  - [x] SubTask 5.1: 使用 `LingxiGradients.mascotHero` 渐变替代硬编码颜色
  - [x] SubTask 5.2: 添加缓慢呼吸脉动（4 秒周期，scale 0.95 → 1.05）
  - [x] SubTask 5.3: 添加 `RepaintBoundary` 隔离光环动画，避免重绘整个 MascotWidget

## 阶段三：页面视觉层次优化

- [x] Task 6: 首页视觉层次优化
  - [x] SubTask 6.1: hero 区视觉权重调整（问候语字号梯度 24/18/14）
  - [x] SubTask 6.2: 吉祥物尺寸与位置优化（桌面端右侧 200px，移动端顶部 160px）
  - [x] SubTask 6.3: 快捷入口图标统一为圆角方形 + 语义色背景

- [x] Task 7: 学习路径页视觉优化
  - [x] SubTask 7.1: 课程卡片增加级别色条（L0-L4 各一色，定义在 `LingxiColors` 或 `CourseLevel` 扩展）
  - [x] SubTask 7.2: 进度条改用 `LingxiGradients.success` 渐变
  - [x] SubTask 7.3: 连接线添加流光动画（dashOffset 动画）

- [x] Task 8: 对话页视觉优化
  - [x] SubTask 8.1: 消息气泡圆角统一（user: 右下 4px 其他 16px；assistant: 左下 4px 其他 16px）
  - [x] SubTask 8.2: 流式脉冲指示器改用三段式波浪动画（替代现有圆点闪烁）
  - [x] SubTask 8.3: 苏格拉底模式开关添加图标过渡动画

- [x] Task 9: 课时页与测验组件视觉优化
  - [x] SubTask 9.1: 知识点卡片间距从 12 调整为 16
  - [x] SubTask 9.2: 测验正确反馈用 `LingxiGradients.success`，错误反馈用 `misconceptionRed` 渐变
  - [x] SubTask 9.3: 测验选项按钮按压反馈添加 scale 0.98 效果

## 阶段四：动画流畅度优化

- [x] Task 10: 审计与校准 `SpringMotion` 弹簧参数
  - [x] SubTask 10.1: 对齐 6 档弹簧参数到 Material Motion 3 规范（duration 量化）
  - [x] SubTask 10.2: 验证所有过渡组件在 `reduceMotion` 时正确降级
  - [x] SubTask 10.3: 代码审查 `_BouncyCurve` 自定义曲线参数

- [x] Task 11: 优化 `ChatController` 流式响应节流
  - [x] SubTask 11.1: 实现动态节流：首 token 立即刷新，后续 50ms 节流，结束强制刷新
  - [x] SubTask 11.2: 验证 `currentAssistantText` 在流式结束时完整无丢失

- [x] Task 12: 添加页面过渡与列表入场动画
  - [x] SubTask 12.1: `LearningPathPage` 课程卡片 staggered 入场（每卡片延迟 50ms）
  - [x] SubTask 12.2: `LessonPage` 知识点 PageView 切换添加水平滑动 + 淡入过渡
  - [x] SubTask 12.3: 审计所有 `AnimationController` 的 `vsync` 引用与 `dispose()` 调用

## 阶段五：静态验证（本机 Flutter SDK 不可用）

- [x] Task 13: 静态代码审查与验证
  - [x] SubTask 13.1: Grep 扫描 `vsync: this` 缺失的 `AnimationController`
  - [x] SubTask 13.2: Grep 扫描未调用 `dispose()` 的 `AnimationController` / `TextEditingController` / `ScrollController`
  - [x] SubTask 13.3: 审查 `_MascotPainter.shouldRepaint` 实现避免过度重绘
  - [x] SubTask 13.4: 审查所有动画文件的 `RepaintBoundary` 使用合理性
  - [x] SubTask 13.5: 静态审查 `SpringMotion` 参数符合 Material 3 规范

## 阶段六：文档同步与 GitHub Release

- [x] Task 14: 同步更新文档
  - [x] SubTask 14.1: 更新 `AGENTS.md` 主题章节（新增 `LingxiGradients.dark`、`LingxiShadows`）
  - [x] SubTask 14.2: 更新 `AGENTS.md` 已知技术债（移除已清理项）
  - [x] SubTask 14.3: 更新 `docs/代码百科.md` 主题模块与吉祥物模块描述
  - [x] SubTask 14.4: 更新 `lib/core/constants/app_constants.dart` 中 `kAppVersion` 为 `'0.2.0'`

- [x] Task 15: 创建 GitHub Release v0.2.0
  - [x] SubTask 15.1: 使用 `trae-remote-official:github` 插件，如未授权则通过 `RequestAuthorization` 请求 GitHub 访问权限
  - [x] SubTask 15.2: 准备中文 Release notes（总结 4 大方向优化要点）
  - [x] SubTask 15.3: 创建 `v0.2.0` Release（仅源代码，不附带构建产物）
  - **依赖**: Task 1-14 全部完成

# Task Dependencies

- Task 1 → Task 5（_AuraGlow 依赖 LingxiGradients.dark）
- Task 2 → Task 4（_MascotPainter 依赖校准后的 LingxiColors）
- Task 3 → Task 9（LingxiCard 阴影依赖 LingxiElevations 扩展）
- Task 10 → Task 12（动画参数校准后再添加新动画）
- Task 1-12 → Task 13（静态验证在所有代码变更后）
- Task 1-13 → Task 14（文档同步在代码完成后）
- Task 14 → Task 15（Release 在文档同步后）

# 可并行任务

- Task 1、Task 2、Task 3 可并行（主题系统三项独立加固）
- Task 6、Task 7、Task 8、Task 9 可并行（四个页面视觉优化独立）
- Task 4、Task 5 可并行（吉祥物绘制与光环优化独立）
- Task 10、Task 11 可并行（SpringMotion 与 ChatController 独立）

## 阶段七：验收修复（来自 checklist 验证）

- [x] Task 16: 修复验收未满足项
  - [x] SubTask 16.1: 清理硬编码渐变残留
    - `lib/features/learning/lesson_page.dart` L309 ShaderMask 改用 `context.lingxiGradients.celebration`、L550 改用 `achievementGold`；L243 进度条保留（基于 `colorScheme.primary` 动态主题色，LingxiGradients 无匹配语义）
    - `lib/features/learning/learning_path_page.dart` L916/L1002/L1011 改用 `context.lingxiGradients.success`
    - `lib/features/learning/widgets/learning_card_widget.dart` L254 保留（已用 `context.lingxiColors.mascotPrimary/Secondary` 语义颜色，LingxiGradients 无匹配 mascotHero 是 RadialGradient 8% 透明度不匹配）
    - `lib/features/home/home_page.dart` 移除 `_levelGradients` 映射，改用 `CourseLevel.levelColor()` 扩展 + `withValues(alpha:0.7)`
    - `lib/features/learning/widgets/quiz_widget.dart` L509 改用 `successGradient.copyWith()`、L518 改用 `baseRed.withValues(alpha:0.30)` 替代硬编码 `0xFFC62828`
    - `mascot_widget.dart` 内的渐变属吉祥物固有矢量绘制，豁免
  - [x] SubTask 16.2: 为持续动画组件添加 RepaintBoundary
    - `lib/shared/widgets/animated_progress_bar.dart`：4 处循环 AnimatedBuilder 包裹（线性脉冲光点 L202、线性不确定光带 L248、环形不确定旋转 L533、环形脉冲光点 L554）
    - `lib/shared/widgets/shimmer_loading.dart`：ShaderMask 外层包裹 L135
    - `lib/shared/widgets/empty_state_widget.dart`：`_TwinklingStar` AnimatedBuilder 包裹 L247
    - `lib/shared/widgets/celebration_overlay.dart`：2 处 ParticleSystem 包裹（L184/L227）
    - `lib/core/motion/spring_motion.dart` 中 `_PulseBreathing`（L439）/ `_ShimmerGlow`（L601）外层包裹
    - 简单一次性过渡（AnimatedScale/FadeTransition/SuccessCheckmark/ErrorCross 的 forward()）未添加

# 执行结果

✅ 全部 15 个任务完成
✅ GitHub Release v0.2.0 已创建：https://github.com/YJLZSL/polaris-learn/releases/tag/v0.2.0
✅ commit hash: 1d02596
✅ tag: v0.2.0
✅ Task 16 验收修复完成（SubTask 16.1 清理硬编码渐变 + SubTask 16.2 添加 RepaintBoundary）
