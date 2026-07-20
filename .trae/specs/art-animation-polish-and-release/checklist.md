# 验收清单

## 阶段一：主题与配色系统加固
- [ ] `LingxiGradients.dark` 静态实例已存在，所有渐变使用深色调适配
- [ ] `app_theme.dart` 的 `darkTheme` 已注册 `LingxiGradients.dark` 扩展
- [ ] `LingxiColors.dark` 的 6 个语义色在暗色背景下满足 WCAG AA 对比度（≥4.5:1）
- [ ] `LingxiElevations` 新增 3 档语义阴影（subtle / elevated / highlighted）
- [ ] `LingxiCard` 已应用统一阴影层级
- [ ] Grep 确认无硬编码渐变残留（所有渐变通过 `context.lingxiGradients` 访问）

## 阶段二：吉祥物视觉升级
- [ ] `_MascotPainter` 身体填充改为径向渐变，增加立体感
- [ ] 角部添加高光反射，眼睛添加瞳孔高光点
- [ ] `celebrate` 状态：星光粒子从中心向外辐射，带轨迹拖尾
- [ ] `thinking` 状态：问号图标轻微浮动呼吸
- [ ] `sad` 状态：泪滴沿脸颊滑落动画
- [ ] `curious` 状态：放大镜边缘添加光泽反射
- [ ] `shouldRepaint` 仅在 mood 或关键字段变化时返回 true（避免过度重绘）
- [ ] `_AuraGlow` 使用 `LingxiGradients.mascotHero` 渐变
- [ ] `_AuraGlow` 添加缓慢呼吸脉动（4 秒周期）
- [ ] `_AuraGlow` 添加 `RepaintBoundary` 隔离动画

## 阶段三：页面视觉层次优化
- [ ] 首页 hero 区视觉权重调整（问候语字号梯度 24/18/14）
- [ ] 首页吉祥物尺寸与位置优化（桌面端 200px，移动端 160px）
- [ ] 首页快捷入口图标统一为圆角方形 + 语义色背景
- [ ] 学习路径页课程卡片增加级别色条（L0-L4 各一色）
- [ ] 学习路径页进度条改用 `LingxiGradients.success` 渐变
- [ ] 学习路径页连接线添加流光动画
- [ ] 对话页消息气泡圆角统一（user: 右下 4px，assistant: 左下 4px）
- [ ] 对话页流式脉冲指示器改用三段式波浪动画
- [ ] 对话页苏格拉底模式开关添加图标过渡动画
- [ ] 课时页知识点卡片间距调整为 16
- [ ] 测验正确反馈用 `LingxiGradients.success`，错误反馈用 `misconceptionRed` 渐变
- [ ] 测验选项按钮按压反馈添加 scale 0.98 效果

## 阶段四：动画流畅度优化
- [ ] `SpringMotion` 6 档弹簧参数对齐 Material Motion 3 规范（duration 量化）
- [ ] 所有过渡组件在 `reduceMotion` 为 true 时正确降级为即时切换
- [ ] `ChatController._flush` 实现动态节流（首 token 立即、后续 50ms、结束强制刷新）
- [ ] `LearningPathPage` 课程卡片 staggered 入场（每卡片延迟 50ms）
- [ ] `LessonPage` 知识点 PageView 切换添加水平滑动 + 淡入过渡
- [ ] 所有 `AnimationController` 的 `vsync` 引用正确
- [ ] 所有 `AnimationController` / `TextEditingController` / `ScrollController` 在 `dispose()` 中释放

## 阶段五：静态验证
- [ ] Grep 扫描确认无 `vsync: this` 缺失的 `AnimationController`
- [ ] Grep 扫描确认无未调用 `dispose()` 的 Controller
- [ ] `_MascotPainter.shouldRepaint` 实现正确（避免过度重绘）
- [ ] 所有动画文件合理使用 `RepaintBoundary`
- [ ] `SpringMotion` 参数符合 Material 3 规范
- [ ] 注：本机 Flutter SDK 不可用，无法运行 `flutter analyze` / `flutter test`，以上为静态审查替代

## 阶段六：文档同步与 GitHub Release
- [ ] `AGENTS.md` 主题章节新增 `LingxiGradients.dark`、`LingxiShadows` 描述
- [ ] `AGENTS.md` 已知技术债移除已清理项
- [ ] `docs/代码百科.md` 主题模块与吉祥物模块描述已更新
- [ ] `lib/core/constants/app_constants.dart` 中 `kAppVersion` 已升级为 `'0.2.0'`
- [ ] GitHub 插件已授权（通过 `RequestAuthorization`）
- [ ] `v0.2.0` Release 已创建，含中文 Release notes
- [ ] Release notes 包含 4 大方向优化要点总结
- [ ] 注：因 Flutter SDK 不可用，Release 不附带构建产物（仅源代码）

## 安全红线检查（不可破坏）
- [ ] `SecureStorageService` 逻辑未被修改
- [ ] `SecureLogInterceptor` 脱敏逻辑未被修改
- [ ] `ProviderConfig.toJson()` 仍跳过 apiKey 字段
- [ ] `DataExportService` 中的 `assert(!json.containsKey('apiKey'))` 断言仍存在
- [ ] `database.dart` 的 `storeDateTimeAsText: true` 未被修改
- [ ] `.gitignore` 中敏感文件条目未被移除

## 性能预算检查
- [ ] `_MascotPainter` 单帧绘制成本未显著增加（`shouldRepaint` 正确实现）
- [ ] 动画在 60fps 下运行（无丢帧，静态审查无 jank 风险）
- [ ] `reduceMotion` 无障碍降级全覆盖
- [ ] 流式响应节流策略未增加 UI 线程负担
